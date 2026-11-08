import { z } from "zod";
import { Production, all, authorize, failure, first, session } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const s = await session(); const id = z.string().uuid().parse(new URL(request.url).searchParams.get("id"));
    const p = await first<Production>("SELECT * FROM productions WHERE id=?", id);
    if (!p) return Response.json({ error: "Producción no encontrada." }, { status: 404 });
    await authorize(s, p.account_id);
    const episodes = await all<{ number: number; title: string; data: string; status: string }>("SELECT number,title,data,status FROM episodes WHERE production_id=? ORDER BY number", id);
    return new Response(JSON.stringify({ version: 1, production: { ...p, bible: p.bible ? JSON.parse(p.bible) : null, outline: p.outline ? JSON.parse(p.outline) : null }, episodes: episodes.map(e => ({ ...e, data: JSON.parse(e.data) })), mediaStatus: "not_rendered" }, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="serie-${id}.json"`, "Cache-Control": "private, no-store" } });
  } catch(e) { return failure(e); }
}
