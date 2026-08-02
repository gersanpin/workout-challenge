import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromFile } from "@/lib/extract";
import { validateUploadFiles } from "@/lib/files";
import type { PortfolioContent } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el formulario de subida. El archivo puede ser demasiado grande." },
      { status: 400 },
    );
  }

  const portfolioId = String(form.get("portfolioId") || "");
  const projectId = form.get("projectId")
    ? String(form.get("projectId"))
    : null;
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (!portfolioId) {
    return NextResponse.json({ error: "portfolioId requerido" }, { status: 400 });
  }
  if (!files.length) {
    return NextResponse.json({ error: "Sin archivos" }, { status: 400 });
  }

  const validationError = validateUploadFiles(files);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { data: portfolio, error: pErr } = await supabase
    .from("portfolios")
    .select("*")
    .eq("id", portfolioId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (pErr || !portfolio) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const uploaded: { url: string; path: string; kind: string; name: string }[] =
    [];
  const extractedChunks: string[] = [];

  for (const file of files) {
    const kind = file.type.startsWith("image/")
      ? "image"
      : file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
        ? "pdf"
        : "other";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${portfolioId}/${Date.now()}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    if (kind === "pdf" || kind === "other") {
      try {
        const text = await extractTextFromFile(file);
        if (text) {
          extractedChunks.push(`--- Archivo: ${file.name} ---\n${text}`);
        } else if (kind === "pdf") {
          extractedChunks.push(
            `[PDF: ${file.name} — no se extrajo texto (puede ser escaneado o corrupto).]`,
          );
        }
      } catch {
        if (kind === "pdf") {
          extractedChunks.push(
            `[PDF: ${file.name} — no se pudo leer. Puede estar corrupto o protegido.]`,
          );
        }
      }
    }

    const { error: upErr } = await supabase.storage
      .from("portfolio-assets")
      .upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (upErr) {
      return NextResponse.json(
        {
          error: `Error al subir a Storage: ${upErr.message}. ¿Creaste el bucket público "portfolio-assets"?`,
        },
        { status: 500 },
      );
    }

    const { data: pub } = supabase.storage
      .from("portfolio-assets")
      .getPublicUrl(path);

    uploaded.push({
      url: pub.publicUrl,
      path,
      kind,
      name: file.name,
    });

    await supabase.from("assets").insert({
      user_id: user.id,
      portfolio_id: portfolioId,
      kind,
      storage_path: path,
      public_url: pub.publicUrl,
      file_name: file.name,
    });
  }

  let content = portfolio.content as PortfolioContent;
  let contentChanged = false;

  if (extractedChunks.length) {
    const extracted = extractedChunks.join("\n\n").slice(0, 40000);
    const prev = content.rawNotes?.trim() || "";
    content = {
      ...content,
      rawNotes: prev
        ? `${prev}\n\n${extracted}`
        : extracted,
    };
    contentChanged = true;
  }

  const imageUrls = uploaded
    .filter((u) => u.kind === "image")
    .map((u) => u.url);

  if (imageUrls.length) {
    contentChanged = true;
    if (projectId) {
      content = {
        ...content,
        projects: content.projects.map((p) =>
          p.id === projectId
            ? { ...p, imageUrls: [...(p.imageUrls || []), ...imageUrls] }
            : p,
        ),
      };
    } else if (content.projects.length) {
      content = {
        ...content,
        projects: content.projects.map((p, i) =>
          i === 0
            ? { ...p, imageUrls: [...(p.imageUrls || []), ...imageUrls] }
            : p,
        ),
      };
    } else {
      content = {
        ...content,
        projects: [
          {
            id: crypto.randomUUID(),
            title: "Proyecto (imágenes subidas)",
            description: "",
            highlights: [],
            imageUrls,
          },
        ],
      };
    }
  }

  if (contentChanged) {
    const { data: updated, error: uErr } = await supabase
      .from("portfolios")
      .update({ content })
      .eq("id", portfolioId)
      .eq("user_id", user.id)
      .select("content")
      .single();

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }
    content = updated.content as PortfolioContent;
  }

  return NextResponse.json({ uploaded, content });
}
