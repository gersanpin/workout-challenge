import { NextResponse } from "next/server";
import { fetchJobPosting } from "@/lib/jobFetch";

export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const url = String(body.url || "").trim();
  if (!url) {
    return NextResponse.json({ error: "URL requerida" }, { status: 400 });
  }

  const result = await fetchJobPosting(url);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        error: result.message,
        needsManualPaste: true,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    text: result.text,
    source: result.source,
  });
}
