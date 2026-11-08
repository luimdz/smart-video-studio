import { z } from "zod";

export const limitsSchema = z.object({
  profiles: z.number().int().min(1).max(10000).nullable(),
  monthlyMinutes: z.number().int().min(1).max(1000000).nullable(),
  maxEpisodes: z.number().int().min(10).max(25),
  maxDuration: z.number().int().min(30).max(300),
  concurrentJobs: z.number().int().min(1).max(20),
  monthlyBudgetCents: z.number().int().min(100).max(10000000),
});
export type Limits = z.infer<typeof limitsSchema>;
export const PLANS: Record<string, Limits> = {
  basic: { profiles: 3, monthlyMinutes: 120, maxEpisodes: 10, maxDuration: 180, concurrentJobs: 1, monthlyBudgetCents: 2500 },
  pro: { profiles: 20, monthlyMinutes: 900, maxEpisodes: 25, maxDuration: 300, concurrentJobs: 3, monthlyBudgetCents: 15000 },
  unlimited: { profiles: null, monthlyMinutes: null, maxEpisodes: 25, maxDuration: 300, concurrentJobs: 5, monthlyBudgetCents: 50000 },
};
export const accountSchema = z.object({
  name: z.string().trim().min(2).max(100), kind: z.enum(["internal", "client"]),
  plan: z.enum(["basic", "pro", "unlimited"]), email: z.string().email().max(200).optional(),
});
export const profileSchema = z.object({
  accountId: z.string().uuid(), name: z.string().trim().min(2).max(100),
  niche: z.string().trim().min(2).max(200), audience: z.string().trim().min(2).max(300),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#377c6b"),
  brief: z.string().trim().max(10000).default(""), language: z.enum(["es-LATAM", "es-ES", "en"]).default("es-LATAM"),
});
export const productionSchema = z.object({
  profileId: z.string().uuid(), title: z.string().trim().min(3).max(140),
  topic: z.string().trim().min(10).max(12000), type: z.enum(["series", "video", "vsl"]),
  style: z.enum(["2d", "motion"]), episodes: z.number().int(),
  duration: z.number().int().min(30).max(300), budgetCents: z.number().int().min(100).max(1000000),
  requestKey: z.string().uuid(),
}).superRefine((p, ctx) => {
  if (p.type === "series" && (p.episodes < 10 || p.episodes > 25)) ctx.addIssue({ code: "custom", message: "Una temporada tiene entre 10 y 25 capítulos." });
  if (p.type !== "series" && p.episodes !== 1) ctx.addIssue({ code: "custom", message: "Un video individual tiene un solo episodio." });
  if (p.type === "vsl" && p.duration < 120) ctx.addIssue({ code: "custom", message: "La micro VSL debe durar entre 120 y 300 segundos." });
});
export function validateProductionLimits(p: { episodes: number; duration: number; budgetCents: number }, limits: Limits) {
  if (p.episodes > limits.maxEpisodes) throw new Error(`El plan permite hasta ${limits.maxEpisodes} capítulos por temporada.`);
  if (p.duration > limits.maxDuration) throw new Error(`El plan permite videos de hasta ${limits.maxDuration} segundos.`);
  if (p.budgetCents > limits.monthlyBudgetCents) throw new Error("El presupuesto supera el límite mensual de la cuenta.");
}
export function monthPeriod(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Guatemala", year: "numeric", month: "2-digit" }).formatToParts(date);
  return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}`;
}
