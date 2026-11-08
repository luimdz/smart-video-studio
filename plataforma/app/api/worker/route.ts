import { z } from "zod";
import { planningStep } from "@/lib/planner";
import { HttpError, Production, auditLog, database, failure, first, runtime, statement } from "@/lib/server";

export const dynamic = "force-dynamic";
async function serviceAuth(request: Request) {
  const token = runtime().WORKER_TOKEN;
  if (!token || token.length < 32) throw new HttpError(503, "Configura un token de servicio de al menos 32 caracteres.");
  const expected = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`Bearer ${token}`));
  const actual = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(request.headers.get("authorization") || ""));
  let mismatch = 0; const a = new Uint8Array(actual); const b = new Uint8Array(expected);
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  if (mismatch) throw new HttpError(401, "Credencial de servicio inválida.");
}
export async function POST(request: Request) {
  let leaseToken = ""; let jobId = "";
  try {
    await serviceAuth(request);
    const body = z.object({ productionId: z.string().uuid(), executionId: z.string().min(1).max(100), action: z.enum(["claim", "next"]) }).parse(await request.json()); jobId = body.productionId;
    const p = await first<Production>("SELECT * FROM productions WHERE id=?", jobId);
    if (!p) throw new HttpError(404, "Producción no encontrada.");
    if (body.action === "claim") {
      const result = await statement(`INSERT OR IGNORE INTO workflow_runs (production_id,execution_id,lease_until,lease_token,attempts,step_key,planning_cents)
        SELECT id,?,0,'',0,'',0 FROM productions WHERE id=? AND status IN ('queued','dispatch_unknown')
        AND EXISTS (SELECT 1 FROM reservations WHERE production_id=? AND status='active')`, body.executionId, jobId, jobId).run();
      const run = await first<{ execution_id: string }>("SELECT execution_id FROM workflow_runs WHERE production_id=?", jobId);
      const proceed = !!result.meta.changes || run?.execution_id === body.executionId;
      if (proceed) {
        await statement("UPDATE productions SET status='planning',updated_at=? WHERE id=? AND status IN ('queued','dispatch_unknown')", new Date().toISOString(), jobId).run();
        await auditLog("n8n", "planning.claimed", p.account_id, jobId);
      }
      return Response.json({ productionId: jobId, executionId: body.executionId, proceed });
    }
    if (p.status === "scripts_ready") return Response.json({ productionId: jobId, executionId: body.executionId, done: true, stage: "scripts_ready" });
    if (!["planning", "writing"].includes(p.status)) throw new HttpError(409, "El trabajo no está disponible para continuar automáticamente.");
    const activeAccount = await first<{ status: string }>("SELECT status FROM accounts WHERE id=?", p.account_id);
    if (activeAccount?.status !== "active") throw new HttpError(403, "La cuenta está suspendida.");
    leaseToken = crypto.randomUUID(); const now = Date.now();
    const lease = await statement("UPDATE workflow_runs SET lease_until=?,lease_token=? WHERE production_id=? AND execution_id=? AND lease_until<=?", now + 90000, leaseToken, jobId, body.executionId, now).run();
    if (!lease.meta.changes) { leaseToken = ""; return Response.json({ productionId: jobId, executionId: body.executionId, done: false, stage: "busy" }); }
    const step = await planningStep(p, { execution_id: body.executionId, lease_token: leaseToken });
    await statement("UPDATE workflow_runs SET lease_until=0,lease_token='' WHERE production_id=? AND lease_token=?", jobId, leaseToken).run();
    return Response.json({ productionId: jobId, executionId: body.executionId, ...step });
  } catch (error) {
    if (leaseToken && jobId) {
      const message = error instanceof HttpError ? error.message : "La etapa devolvió un resultado no válido. Conservamos el avance para revisión.";
      await database().batch([
        statement("UPDATE workflow_runs SET lease_until=0,lease_token='' WHERE production_id=? AND lease_token=?", jobId, leaseToken),
        statement("UPDATE productions SET status='failed',error=?,updated_at=? WHERE id=?", message, new Date().toISOString(), jobId),
      ]);
    }
    return failure(error);
  }
}
