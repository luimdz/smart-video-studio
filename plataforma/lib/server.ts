import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { PLANS, monthPeriod } from "./domain";

export type Account = { id: string; name: string; kind: string; plan: string; status: string; limits: string; created_at: string };
export type Profile = { id: string; account_id: string; name: string; niche: string; audience: string; brand_color: string; brief: string; language: string; created_at: string };
export type Production = { id: string; account_id: string; profile_id: string; title: string; type: string; style: string; topic: string; episodes: number; duration: number; budget_cents: number; status: string; progress: number; bible: string | null; outline: string | null; error: string | null; created_at: string; updated_at: string };
export function database() { if (!env.DB) throw new Error("La base de datos aún no está conectada."); return env.DB; }
export function runtime() { return env as Cloudflare.Env & { N8N_WEBHOOK_URL?: string; N8N_WEBHOOK_TOKEN?: string; WORKER_TOKEN?: string; GEMINI_API_KEY?: string; GEMINI_MODEL?: string }; }
export async function all<T>(sql: string, ...args: unknown[]) { return (await database().prepare(sql).bind(...args).all<T>()).results; }
export async function first<T>(sql: string, ...args: unknown[]) { return database().prepare(sql).bind(...args).first<T>(); }
export function statement(sql: string, ...args: unknown[]) { return database().prepare(sql).bind(...args); }
export async function auditLog(actor: string, action: string, accountId: string | null, detail: string) {
  await statement("INSERT INTO audit (id,actor,account_id,action,detail,created_at) VALUES (?,?,?,?,?,?)", crypto.randomUUID(), actor, accountId, action, detail, new Date().toISOString()).run();
}
export async function session() {
  const user = await getChatGPTUser();
  if (!user) throw new HttpError(401, "Inicia sesión para entrar al estudio.");
  const db = database(); const now = new Date().toISOString();
  // Safe only while the initial Site is owner-private. Persist the owner before opening invitations.
  await statement("INSERT OR IGNORE INTO settings (id,owner_id,created_at) VALUES ('main',?,?)", user.userId, now).run();
  const settings = await first<{ owner_id: string }>("SELECT owner_id FROM settings WHERE id='main'");
  const master = settings?.owner_id === user.userId;
  if (master) {
    const id = "84c1736b-8239-4b0d-b76f-fd28a073f7c1";
    await db.batch([
      statement("INSERT OR IGNORE INTO accounts (id,name,kind,plan,status,limits,created_at) VALUES (?,?,'internal','unlimited','active',?,?)", id, "Mi estudio", JSON.stringify(PLANS.unlimited), now),
      statement("INSERT OR IGNORE INTO memberships (id,account_id,email,user_id,role) VALUES (?,?,?,?,'owner')", "initial-owner", id, user.email.toLowerCase(), user.userId),
    ]);
  }
  await statement("UPDATE memberships SET user_id=? WHERE lower(email)=? AND user_id IS NULL", user.userId, user.email.toLowerCase()).run();
  return { user, master };
}
export type Session = Awaited<ReturnType<typeof session>>;
export async function authorize(s: Session, accountId: string, write = false) {
  const account = await first<Account>("SELECT * FROM accounts WHERE id=?", accountId);
  if (!account) throw new HttpError(404, "No se encontró la cuenta.");
  if (!s.master) {
    const m = await first<{ role: string }>("SELECT role FROM memberships WHERE account_id=? AND user_id=?", accountId, s.user.userId);
    if (!m || (write && m.role === "viewer")) throw new HttpError(403, "No tienes permiso para esta cuenta.");
  }
  if (write && account.status !== "active") throw new HttpError(403, "La cuenta está suspendida.");
  return account;
}
export async function snapshot(s: Session) {
  const accountRows = s.master ? await all<Account>("SELECT * FROM accounts ORDER BY created_at") : await all<Account>("SELECT a.* FROM accounts a JOIN memberships m ON m.account_id=a.id WHERE m.user_id=? ORDER BY a.created_at", s.user.userId);
  const ids = accountRows.map(a => a.id); const where = ids.map(() => "?").join(",");
  const profileRows = ids.length ? await all<Profile>(`SELECT * FROM profiles WHERE account_id IN (${where}) ORDER BY created_at DESC`, ...ids) : [];
  const jobs = ids.length ? await all<Production>(`SELECT * FROM productions WHERE account_id IN (${where}) ORDER BY created_at DESC LIMIT 200`, ...ids) : [];
  const usage = ids.length ? await all<{ account_id: string; seconds: number; cents: number }>(`SELECT account_id,coalesce(sum(seconds),0) seconds,coalesce(sum(cents),0) cents FROM reservations WHERE account_id IN (${where}) AND period=? AND status IN ('active','settled') GROUP BY account_id`, ...ids, monthPeriod()) : [];
  const members = s.master ? await all<{ id: string; account_id: string; email: string; user_id: string | null; role: string }>("SELECT * FROM memberships ORDER BY account_id") : [];
  return { user: { name: s.user.displayName, email: s.user.email, master: s.master }, accounts: accountRows, profiles: profileRows, productions: jobs, usage, members, plans: PLANS,
    connections: { n8n: !!(runtime().N8N_WEBHOOK_URL && runtime().N8N_WEBHOOK_TOKEN && runtime().WORKER_TOKEN), text: !!runtime().GEMINI_API_KEY, renderer: false, facebook: false, instagram: false },
    audit: s.master ? await all("SELECT * FROM audit ORDER BY created_at DESC LIMIT 20") : [], period: monthPeriod() };
}
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) throw new HttpError(403, "Solicitud de origen no permitido.");
}
export function failure(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  if (error && typeof error === "object" && "issues" in error) return Response.json({ error: "Revisa los datos ingresados.", issues: (error as { issues: unknown }).issues }, { status: 400 });
  console.error("studio_request_failed", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: "No se pudo completar la operación. Vuelve a intentarlo." }, { status: 500 });
}
