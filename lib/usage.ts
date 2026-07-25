import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/types";

/** Usage tracking kept for future billing; limits are disabled for now. */

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
    .eq("kind", kind);
  return count ?? 0;
}

/** No-op: limits disabled — everything is unlimited/free for now. */
export async function assertAiCredit(_userId: string): Promise<void> {}

/** No-op: limits disabled. */
export async function assertPdfExport(_userId: string): Promise<void> {}

/** No-op: limits disabled. */
export async function assertCanCreatePortfolio(_userId: string): Promise<void> {}

/** No-op: limits disabled. */
export async function assertCanPublish(_userId: string): Promise<void> {}

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
  return (
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "portfolio"
  );
}
