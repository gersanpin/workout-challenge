import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestHighlights } from "@/lib/ai";
import { mapAiError } from "@/lib/errors";
import { recordUsage } from "@/lib/usage";
import type { PortfolioContent } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const title = String(body.title || "Proyecto");
  const description = String(body.description || "");
  const portfolioId = body.portfolioId ? String(body.portfolioId) : undefined;

  let targetCompany = "";
  let targetRole = "";
  if (portfolioId) {
    const { data } = await supabase
      .from("portfolios")
      .select("content")
      .eq("id", portfolioId)
      .eq("user_id", user.id)
      .maybeSingle();
    const content = data?.content as PortfolioContent | undefined;
    targetCompany = content?.targetCompany || "";
    targetRole = content?.targetRole || "";
  }

  try {
    const highlights = await suggestHighlights({
      title,
      description,
      targetCompany,
      targetRole,
    });
    await recordUsage(user.id, "ai", {
      action: "highlights",
      portfolioId,
    });
    return NextResponse.json({ highlights });
  } catch (err) {
    return NextResponse.json({ error: mapAiError(err) }, { status: 502 });
  }
}
