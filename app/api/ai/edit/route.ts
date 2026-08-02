import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { editWithInstruction } from "@/lib/ai";
import { mapAiError } from "@/lib/errors";
import { withAiDraftMeta } from "@/lib/sections";
import { recordUsage } from "@/lib/usage";
import type { DocType, PortfolioContent } from "@/lib/types";

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

  const portfolioId = String(body.portfolioId || "");
  const instruction = String(body.instruction || "").trim();
  if (!portfolioId || !instruction) {
    return NextResponse.json(
      { error: "portfolioId e instruction son requeridos" },
      { status: 400 },
    );
  }

  const { data: portfolio, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("id", portfolioId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !portfolio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const existing = portfolio.content as PortfolioContent;
  try {
    let content = await editWithInstruction({
      content: existing,
      instruction,
      notes: existing.rawNotes || "",
      docType: (portfolio.doc_type as DocType) || "portfolio",
    });
    // Refresh baseline so section revert still works after NL edit
    content = withAiDraftMeta(content);

    const { data: updated, error: updateError } = await supabase
      .from("portfolios")
      .update({ content })
      .eq("id", portfolioId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await recordUsage(user.id, "ai", {
      action: "edit_nl",
      portfolioId,
    });

    return NextResponse.json({ portfolio: updated, content });
  } catch (err) {
    return NextResponse.json({ error: mapAiError(err) }, { status: 502 });
  }
}
