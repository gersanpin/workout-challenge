import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_CONTENT, type TemplateId } from "@/lib/types";
import { assertCanCreatePortfolio, LimitError } from "@/lib/usage";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ portfolios: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    await assertCanCreatePortfolio(user.id);
  } catch (err) {
    if (err instanceof LimitError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    throw err;
  }

  const body = await request.json();
  const title = String(body.title || "Mi portafolio");
  const templateId = (body.templateId || "minimal") as TemplateId;
  const fullName = String(body.fullName || "");
  const notes = String(body.notes || "");

  const content = {
    ...EMPTY_CONTENT,
    fullName,
    rawNotes: notes,
  };

  const { data, error } = await supabase
    .from("portfolios")
    .insert({
      user_id: user.id,
      title,
      template_id: templateId,
      content,
      published: false,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ portfolio: data });
}
