import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { improveText } from "@/lib/ai";
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
  const field = String(body.field || "text");
  const text = String(body.text || "");
  const portfolioId = body.portfolioId ? String(body.portfolioId) : undefined;

  if (!text.trim()) {
    return NextResponse.json({ error: "Texto vacío" }, { status: 400 });
  }

  const improved = await improveText({ field, text });
  await recordUsage(user.id, "ai", { action: "improve", field, portfolioId });

  return NextResponse.json({ text: improved });
}
