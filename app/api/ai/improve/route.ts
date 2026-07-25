import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { improveText } from "@/lib/ai";
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

  const body = await request.json();
  const field = String(body.field || "text");
  const text = String(body.text || "");
  const portfolioId = body.portfolioId ? String(body.portfolioId) : undefined;

  if (!text.trim()) {
    return NextResponse.json({ error: "Texto vacío" }, { status: 400 });
  }

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

  const improved = await improveText({
    field,
    text,
    targetCompany,
    targetRole,
  });
  await recordUsage(user.id, "ai", { action: "improve", field, portfolioId });

  return NextResponse.json({ text: improved });
}
