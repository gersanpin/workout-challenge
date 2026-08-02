import { createClient } from "@/lib/supabase/server";

/** Usage tracking kept for future billing; limits are disabled for now. */

/** Best-effort analytics only — never throws / never gates features. */
export async function recordUsage(
  userId: string,
  kind: "ai" | "pdf_export",
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("usage_events").insert({
      user_id: userId,
      kind,
      meta: meta ?? {},
    });
  } catch {
    // ignore
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
