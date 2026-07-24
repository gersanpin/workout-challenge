import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestHighlights } from "@/lib/ai";
import {
  assertAiCredit,
  LimitError,
  recordUsage,
} from "@/lib/usage";

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
  const title = String(body.title || "Proyecto");
  const description = String(body.description || "");
  const portfolioId = body.portfolioId ? String(body.portfolioId) : undefined;

  const highlights = await suggestHighlights({ title, description });
  await recordUsage(user.id, "ai", {
    action: "highlights",
    portfolioId,
  });

  return NextResponse.json({ highlights });
}
