import { RESERVATION_SQL } from "@/lib/admission";
import { z } from "zod";
import { PLANS, accountSchema, limitsSchema, monthPeriod, productionSchema, profileSchema, validateProductionLimits } from "@/lib/domain";
import { Account, Production, Profile, HttpError, all, auditLog, authorize, checkOrigin, database, failure, first, runtime, session, snapshot, statement } from "@/lib/server";

export const dynamic = "force-dynamic";
export async function GET() { try { return Response.json(await snapshot(await session()), { headers: { "Cache-Control": "no-store" } }); } catch (e) { return failure(e); } }
export async function POST(request: Request) {
  try {
    checkOrigin(request); const s = await session(); const body = z.record(z.unknown()).parse(await request.json()); const now = new Date().toISOString();
    if (body.action === "account.create") {
      if (!s.master) throw new HttpError(403, "Solo el administrador master puede crear cuentas.");
      const a = accountSchema.parse(body); const id = crypto.randomUUID();
      const ops = [statement("INSERT INTO accounts (id,name,kind,plan,status,limits,created_at) VALUES (?,?,?,?,'active',?,?)", id, a.name, a.kind, a.plan, JSON.stringify(PLANS[a.plan]), now)];
      if (a.email) ops.push(statement("INSERT INTO memberships (id,account_id,email,role) VALUES (?,?,?,'owner')", crypto.randomUUID(), id, a.email.toLowerCase()));
      await database().batch(ops); await auditLog(s.user.userId, "account.created", id, a.name);
    } else if (body.action === "account.update") {
      if (!s.master) throw new HttpError(403, "Solo el administrador master puede cambiar planes y límites.");
      const a = z.object({ id: z.string().uuid(), plan: z.enum(["basic", "pro", "unlimited"]), status: z.enum(["active", "suspended"]), limits: limitsSchema }).parse(body);
      await authorize(s, a.id); await statement("UPDATE accounts SET plan=?,status=?,limits=? WHERE id=?", a.plan, a.status, JSON.stringify(a.limits), a.id).run();
      await auditLog(s.user.userId, "account.limits_updated", a.id, JSON.stringify({ plan: a.plan, status: a.status, limits: a.limits }));
    } else if (body.action === "member.add") {
      if (!s.master) throw new HttpError(403, "Solo el administrador master puede asignar usuarios.");
      const m = z.object({ accountId: z.string().uuid(), email: z.string().email().max(200), role: z.enum(["owner", "editor", "viewer"]) }).parse(body);
      await authorize(s, m.accountId);
      await statement("INSERT INTO memberships (id,account_id,email,role) VALUES (?,?,?,?) ON CONFLICT(account_id,email) DO UPDATE SET role=excluded.role", crypto.randomUUID(), m.accountId, m.email.toLowerCase(), m.role).run();
      await auditLog(s.user.userId, "member.assigned", m.accountId, `${m.email.toLowerCase()}: ${m.role}`);
    } else if (body.action === "profile.create") {
      const p = profileSchema.parse(body); await authorize(s, p.accountId, true);
      const result = await statement(`INSERT INTO profiles (id,account_id,name,niche,audience,brand_color,brief,language,created_at)
        SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM accounts a WHERE a.id=? AND a.status='active' AND
        (json_extract(a.limits,'$.profiles') IS NULL OR (SELECT count(*) FROM profiles WHERE account_id=a.id) < json_extract(a.limits,'$.profiles')))`,
      crypto.randomUUID(), p.accountId, p.name, p.niche, p.audience, p.brandColor, p.brief, p.language, now, p.accountId).run();
      if (!result.meta.changes) throw new HttpError(409, "La cuenta alcanzó su límite de perfiles.");
      await auditLog(s.user.userId, "profile.created", p.accountId, p.name);
    } else if (body.action === "production.create") {
      const p = productionSchema.parse(body); const profile = await first<Profile>("SELECT * FROM profiles WHERE id=?", p.profileId);
      if (!profile) throw new HttpError(404, "Selecciona un perfil válido.");
      const a = await authorize(s, profile.account_id, true);
      try { validateProductionLimits(p, limitsSchema.parse(JSON.parse(a.limits))); } catch(e) { throw new HttpError(409, e instanceof Error ? e.message : "Límite del plan excedido."); }
      const previous = await first<Production>("SELECT * FROM productions WHERE request_key=?", p.requestKey);
      if (previous && previous.account_id !== a.id) throw new HttpError(409, "Identificador de solicitud ya utilizado.");
      if (!previous) {
        await statement("INSERT INTO productions (id,account_id,profile_id,title,type,style,topic,episodes,duration,budget_cents,status,progress,request_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,'draft',0,?,?,?)", crypto.randomUUID(), a.id, p.profileId, p.title, p.type, p.style, p.topic, p.episodes, p.duration, p.budgetCents, p.requestKey, now, now).run();
        await auditLog(s.user.userId, "production.created", a.id, p.title);
      }
    } else if (body.action === "production.dispatch") {
      const { id } = z.object({ id: z.string().uuid() }).parse(body);
      const p = await first<Production>("SELECT * FROM productions WHERE id=?", id); if (!p) throw new HttpError(404, "Producción no encontrada.");
      await authorize(s, p.account_id, true);
      if (p.status !== "draft") throw new HttpError(409, "La solicitud ya se envió. Consulta su estado antes de reintentar.");
      const config = runtime();
      if (!config.N8N_WEBHOOK_URL || !config.N8N_WEBHOOK_TOKEN || !config.WORKER_TOKEN) throw new HttpError(409, "Falta conectar n8n. La producción está guardada y no ha consumido créditos.");
      const target = new URL(config.N8N_WEBHOOK_URL); if (target.protocol !== "https:") throw new HttpError(409, "La conexión de n8n debe utilizar HTTPS.");
      // A single conditional INSERT serializes budget/minutes/concurrency admission in SQLite.
      const reserve = statement(RESERVATION_SQL, crypto.randomUUID(), monthPeriod(), now, id, monthPeriod(), monthPeriod());
      const result = await reserve.run(); if (!result.meta.changes) throw new HttpError(409, "No hay cupo disponible de minutos, presupuesto o trabajos simultáneos.");
      await statement("UPDATE productions SET status='queued',error=NULL,updated_at=? WHERE id=? AND status='draft'", now, id).run();
      try {
        const response = await fetch(target.toString(), { method: "POST", headers: { "Content-Type": "application/json", "X-Studio-Token": config.N8N_WEBHOOK_TOKEN }, body: JSON.stringify({ productionId: id }), signal: AbortSignal.timeout(15000), redirect: "error" });
        if (!response.ok) throw new Error("dispatch_failed");
      } catch {
        await statement("UPDATE productions SET status='dispatch_unknown',error=?,updated_at=? WHERE id=? AND status='queued'", "No se pudo confirmar la recepción en n8n. El presupuesto sigue reservado para evitar duplicados; revisar la ejecución antes de reenviar.", now, id).run();
      }
      await auditLog(s.user.userId, "production.dispatched", p.account_id, id);
    } else { throw new HttpError(400, "Acción no reconocida."); }
    return Response.json(await snapshot(s), { headers: { "Cache-Control": "no-store" } });
  } catch(e) { return failure(e); }
}
