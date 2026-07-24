import { createClient } from "@/lib/supabase/server";
import { PLANS, monthStartIso } from "@/lib/plans";
import type { PlanId } from "@/lib/types";

export async function getUserPlanId(userId: string): Promise<PlanId> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", userId)
    .maybeSingle();
  const plan = data?.plan_id as PlanId | undefined;
  return plan === "pro" ? "pro" : "free";
}

export async function countUsage(
  userId: string,
  kind: "ai" | "pdf_export",
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("created_at", monthStartIso());
  return count ?? 0;
}

export async function assertAiCredit(userId: string): Promise<void> {
  const planId = await getUserPlanId(userId);
  const limits = PLANS[planId];
  const used = await countUsage(userId, "ai");
  if (used >= limits.aiCreditsPerMonth) {
    throw new LimitError(
      `Has agotado los créditos de IA del plan ${limits.name} (${limits.aiCreditsPerMonth}/mes).`,
    );
  }
}

export async function assertPdfExport(userId: string): Promise<void> {
  const planId = await getUserPlanId(userId);
  const limits = PLANS[planId];
  const used = await countUsage(userId, "pdf_export");
  if (used >= limits.pdfExportsPerMonth) {
    throw new LimitError(
      `Has agotado las exportaciones PDF del plan ${limits.name} (${limits.pdfExportsPerMonth}/mes).`,
    );
  }
}

export async function assertCanCreatePortfolio(userId: string): Promise<void> {
  const supabase = await createClient();
  const planId = await getUserPlanId(userId);
  const limits = PLANS[planId];
  const { count } = await supabase
    .from("portfolios")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) >= limits.maxPortfolios) {
    throw new LimitError(
      `Tu plan ${limits.name} permite hasta ${limits.maxPortfolios} portafolio(s).`,
    );
  }
}

export async function assertCanPublish(userId: string): Promise<void> {
  const supabase = await createClient();
  const planId = await getUserPlanId(userId);
  const limits = PLANS[planId];
  const { count } = await supabase
    .from("portfolios")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("published", true);
  if ((count ?? 0) >= limits.maxPublished) {
    throw new LimitError(
      `Tu plan ${limits.name} permite hasta ${limits.maxPublished} portafolio(s) publicado(s).`,
    );
  }
}

export async function recordUsage(
  userId: string,
  kind: "ai" | "pdf_export",
  meta?: Record<string, unknown>,
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("usage_events").insert({
    user_id: userId,
    kind,
    meta: meta ?? {},
  });
}

export class LimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LimitError";
  }
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "portfolio";
}
