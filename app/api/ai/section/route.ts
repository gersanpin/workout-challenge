import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { regenerateSection } from "@/lib/ai";
import { mapAiError } from "@/lib/errors";
import { markSection } from "@/lib/sections";
import { recordUsage } from "@/lib/usage";
import type { DocType, PortfolioContent, SectionKey } from "@/lib/types";

const SECTIONS: SectionKey[] = [
  "profile",
  "experience",
  "education",
  "skills",
  "projects",
];

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
  const section = body.section as SectionKey;
  if (!portfolioId || !SECTIONS.includes(section)) {
    return NextResponse.json(
      { error: "portfolioId y section válidos son requeridos" },
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
  const notes = existing.rawNotes || "";
  if (!notes.trim()) {
    return NextResponse.json(
      { error: "No hay material de origen para regenerar la sección." },
      { status: 400 },
    );
  }

  try {
    let content = await regenerateSection({
      section,
      content: existing,
      notes,
      docType: (portfolio.doc_type as DocType) || "cv",
    });
    content = markSection(content, section, "pending");

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
      action: "section",
      section,
      portfolioId,
    });

    return NextResponse.json({ portfolio: updated, content });
  } catch (err) {
    return NextResponse.json({ error: mapAiError(err) }, { status: 502 });
  }
}
