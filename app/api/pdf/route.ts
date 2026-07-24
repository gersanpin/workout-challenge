import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { PortfolioPdfDocument } from "@/lib/pdf";
import type { PortfolioContent, TemplateId } from "@/lib/types";
import {
  assertPdfExport,
  LimitError,
  recordUsage,
} from "@/lib/usage";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    await assertPdfExport(user.id);
  } catch (err) {
    if (err instanceof LimitError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const { data: portfolio, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !portfolio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    PortfolioPdfDocument({
      content: portfolio.content as PortfolioContent,
      templateId: portfolio.template_id as TemplateId,
    }),
  );

  await recordUsage(user.id, "pdf_export", { portfolioId: id });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="arquitecta-${id.slice(0, 8)}.pdf"`,
    },
  });
}
