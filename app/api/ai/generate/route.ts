import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDraftFromNotes } from "@/lib/ai";
import { mapAiError } from "@/lib/errors";
import { recordUsage } from "@/lib/usage";
import type { DocType, PortfolioContent, SourceMode } from "@/lib/types";

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
  if (!portfolioId) {
    return NextResponse.json({ error: "portfolioId requerido" }, { status: 400 });
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

  const existing = portfolio.content as PortfolioContent & {
    _docType?: DocType;
    _sourceMode?: SourceMode;
  };
  const notes = existing.rawNotes || "";
  if (!notes.trim()) {
    return NextResponse.json(
      {
        error:
          "No hay texto para generar el borrador. Añade notas o sube un PDF con texto seleccionable (no escaneado).",
      },
      { status: 400 },
    );
  }

  const docType =
    (portfolio.doc_type as DocType | undefined) ||
    existing._docType ||
    "portfolio";
  const sourceMode =
    (portfolio.source_mode as SourceMode | undefined) ||
    existing._sourceMode ||
    "create";

  let content: PortfolioContent;
  try {
    content = await generateDraftFromNotes({
      notes,
      fullName: existing.fullName,
      existing,
      docType,
      sourceMode,
      targetCompany: existing.targetCompany,
      targetRole: existing.targetRole,
    });
  } catch (err) {
    return NextResponse.json({ error: mapAiError(err) }, { status: 502 });
  }

  content.rawNotes = notes;
  content.targetCompany = existing.targetCompany || "";
  content.targetRole = existing.targetRole || "";

  if (existing.projects?.length) {
    content.projects = content.projects.map((p, i) => ({
      ...p,
      imageUrls: existing.projects[i]?.imageUrls || p.imageUrls || [],
    }));
    const leftover = existing.projects.slice(content.projects.length);
    for (const lp of leftover) {
      if (lp.imageUrls?.length && content.projects[0]) {
        content.projects[0].imageUrls = [
          ...content.projects[0].imageUrls,
          ...lp.imageUrls,
        ];
      }
    }
  }

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
    action: "generate",
    portfolioId,
    docType,
    sourceMode,
  });

  return NextResponse.json({ portfolio: updated, content });
}
