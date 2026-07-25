import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  EMPTY_CONTENT,
  type DocType,
  type SourceMode,
  type TemplateId,
} from "@/lib/types";

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

  const body = await request.json();
  const title = String(body.title || "Mi documento");
  const templateId = (body.templateId || "minimal") as TemplateId;
  const fullName = String(body.fullName || "");
  const notes = String(body.notes || "");
  const docType = (body.docType === "cv" ? "cv" : "portfolio") as DocType;
  const sourceMode = (
    body.sourceMode === "redesign" ? "redesign" : "create"
  ) as SourceMode;
  const targetCompany = String(body.targetCompany || "");
  const targetRole = String(body.targetRole || "");

  const content = {
    ...EMPTY_CONTENT,
    fullName,
    rawNotes: notes,
    targetCompany,
    targetRole,
  };

  let { data, error } = await supabase
    .from("portfolios")
    .insert({
      user_id: user.id,
      title,
      template_id: templateId,
      content,
      published: false,
      doc_type: docType,
      source_mode: sourceMode,
    })
    .select("*")
    .single();

  if (error && /doc_type|source_mode/i.test(error.message)) {
    const fallback = await supabase
      .from("portfolios")
      .insert({
        user_id: user.id,
        title,
        template_id: templateId,
        content: {
          ...content,
          _docType: docType,
          _sourceMode: sourceMode,
        },
        published: false,
      })
      .select("*")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ portfolio: data });
}
