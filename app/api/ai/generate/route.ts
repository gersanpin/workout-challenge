import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDraftFromNotes } from "@/lib/ai";
import {
  assertAiCredit,
  LimitError,
  recordUsage,
} from "@/lib/usage";
import type { PortfolioContent } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    await assertAiCredit(user.id);
  } catch (err) {
    if (err instanceof LimitError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    throw err;
  }

  const body = await request.json();
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

  const existing = portfolio.content as PortfolioContent;
  const notes = existing.rawNotes || "";
  if (!notes.trim()) {
    return NextResponse.json(
      { error: "No hay notas para generar el borrador" },
      { status: 400 },
    );
  }

  const content = await generateDraftFromNotes({
    notes,
    fullName: existing.fullName,
    existing: {
      ...existing,
      // preserve already uploaded project images by title match later
    },
  });

  // Keep raw notes + try to keep image urls if projects already had them
  content.rawNotes = notes;
  if (existing.projects?.length) {
    content.projects = content.projects.map((p, i) => ({
      ...p,
      imageUrls: existing.projects[i]?.imageUrls || p.imageUrls || [],
    }));
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

  await recordUsage(user.id, "ai", { action: "generate", portfolioId });

  return NextResponse.json({ portfolio: updated, content });
}
