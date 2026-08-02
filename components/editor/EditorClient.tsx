"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SectionReviewBar } from "@/components/editor/SectionReviewBar";
import { PortfolioPreview } from "@/components/templates/PortfolioPreview";
import { readJsonSafe } from "@/lib/errors";
import { markSection } from "@/lib/sections";
import { templatesFor } from "@/lib/templates";
import type {
  DocType,
  EducationItem,
  ExperienceItem,
  Portfolio,
  PortfolioContent,
  ProjectItem,
  SectionKey,
  TemplateId,
} from "@/lib/types";
import { newId } from "@/lib/types";

function resolveDocType(p: Portfolio): DocType {
  if (p.doc_type === "cv" || p.doc_type === "portfolio") return p.doc_type;
  const meta = p.content as PortfolioContent & { _docType?: DocType };
  return meta._docType === "cv" ? "cv" : "portfolio";
}

export function EditorClient({ portfolio }: { portfolio: Portfolio }) {
  const docType = resolveDocType(portfolio);
  const availableTemplates = useMemo(() => templatesFor(docType), [docType]);
  const [title, setTitle] = useState(portfolio.title);
  const [templateId, setTemplateId] = useState<TemplateId>(
    portfolio.template_id,
  );
  const [content, setContent] = useState<PortfolioContent>(portfolio.content);
  const [published, setPublished] = useState(portfolio.published);
  const [slug, setSlug] = useState(portfolio.slug || "");
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [nlInstruction, setNlInstruction] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  function touchSection(key: SectionKey, next: PortfolioContent) {
    return markSection(next, key, "edited");
  }

  const publicUrl = useMemo(() => {
    if (!published || !slug) return null;
    if (typeof window === "undefined") return `/p/${slug}`;
    return `${window.location.origin}/p/${slug}`;
  }, [published, slug]);

  async function save(partial?: {
    content?: PortfolioContent;
    templateId?: TemplateId;
    title?: string;
  }) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/portfolios/${portfolio.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: partial?.title ?? title,
          templateId: partial?.templateId ?? templateId,
          content: partial?.content ?? content,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setMessage("Guardado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function improve(field: string, text: string, apply: (v: string) => void) {
    setError(null);
    setAiBusy(true);
    setMessage("Mejorando con IA…");
    try {
      const res = await fetch("/api/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId: portfolio.id,
          field,
          text,
        }),
      });
      const data = await readJsonSafe<{ error?: string; text?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Error de IA");
      apply(data.text || text);
      setMessage("Texto mejorado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setMessage(null);
    } finally {
      setAiBusy(false);
    }
  }

  async function suggestProjectHighlights(project: ProjectItem) {
    setError(null);
    setAiBusy(true);
    setMessage("Sugiriendo destacados…");
    try {
      const res = await fetch("/api/ai/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId: portfolio.id,
          title: project.title,
          description: project.description,
        }),
      });
      const data = await readJsonSafe<{
        error?: string;
        highlights?: string[];
      }>(res);
      if (!res.ok) throw new Error(data.error || "Error de IA");
      setContent((c) => ({
        ...c,
        projects: c.projects.map((p) =>
          p.id === project.id
            ? { ...p, highlights: data.highlights || p.highlights }
            : p,
        ),
      }));
      setMessage("Destacados actualizados");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setMessage(null);
    } finally {
      setAiBusy(false);
    }
  }

  async function regenerate() {
    setError(null);
    setAiBusy(true);
    setMessage("Regenerando borrador…");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId: portfolio.id }),
      });
      const data = await readJsonSafe<{
        error?: string;
        content?: PortfolioContent;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Error de IA");
      if (data.content) setContent(data.content);
      setMessage("Borrador regenerado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setMessage(null);
    } finally {
      setAiBusy(false);
    }
  }

  async function regenerateSection(section: SectionKey) {
    setError(null);
    setAiBusy(true);
    setMessage(`Regenerando sección…`);
    try {
      await save();
      const res = await fetch("/api/ai/section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId: portfolio.id, section }),
      });
      const data = await readJsonSafe<{
        error?: string;
        content?: PortfolioContent;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Error de IA");
      if (data.content) setContent(data.content);
      setMessage("Sección regenerada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setMessage(null);
    } finally {
      setAiBusy(false);
    }
  }

  async function applyNaturalLanguageEdit() {
    if (!nlInstruction.trim()) return;
    setError(null);
    setAiBusy(true);
    setMessage("Aplicando edición con IA…");
    try {
      await save();
      const res = await fetch("/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId: portfolio.id,
          instruction: nlInstruction.trim(),
        }),
      });
      const data = await readJsonSafe<{
        error?: string;
        content?: PortfolioContent;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Error de IA");
      if (data.content) setContent(data.content);
      setNlInstruction("");
      setMessage("Edición aplicada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setMessage(null);
    } finally {
      setAiBusy(false);
    }
  }

  async function togglePublish() {
    setError(null);
    try {
      const res = await fetch(`/api/portfolios/${portfolio.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: !published }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al publicar");
      setPublished(data.portfolio.published);
      setSlug(data.portfolio.slug || "");
      setMessage(data.portfolio.published ? "Publicado" : "Despublicado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function downloadPdf() {
    setError(null);
    setMessage("Generando PDF…");
    try {
      await save();
      const res = await fetch(`/api/pdf?id=${portfolio.id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug || title || "cv"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("PDF descargado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function onUploadImages(projectId: string, files: FileList | null) {
    if (!files?.length) return;
    const fd = new FormData();
    fd.set("portfolioId", portfolio.id);
    fd.set("projectId", projectId);
    Array.from(files).forEach((f) => fd.append("files", f));
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al subir");
      return;
    }
    if (data.content) setContent(data.content);
    setMessage("Imágenes añadidas");
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-ink-600 hover:underline">
            ← Dashboard
          </Link>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 block w-full max-w-md border-0 bg-transparent font-display text-3xl outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => save()}
            disabled={saving}
            className="bg-ink-950 px-3 py-2 text-ink-50 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            className="border border-ink-300 bg-white/70 px-3 py-2"
          >
            Descargar PDF
          </button>
          <button
            type="button"
            onClick={togglePublish}
            className="border border-ink-300 bg-white/70 px-3 py-2"
          >
            {published ? "Despublicar" : "Publicar link"}
          </button>
          <button
            type="button"
            onClick={regenerate}
            disabled={aiBusy}
            className="inline-flex items-center gap-2 border border-ink-300 bg-white/70 px-3 py-2 disabled:opacity-60"
          >
            {aiBusy ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-400/30 border-t-ink-800" />
            ) : null}
            Regenerar con IA
          </button>
        </div>
      </div>

      {(message || error || publicUrl || aiBusy) && (
        <div className="mt-4 space-y-1 text-sm">
          {aiBusy && (
            <p className="flex items-center gap-2 text-ink-700">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-400/30 border-t-ink-800" />
              {message || "Procesando con IA…"}
            </p>
          )}
          {!aiBusy && message && <p className="text-ink-700">{message}</p>}
          {error && (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-red-800" role="alert">
              {error}
            </p>
          )}
          {publicUrl && (
            <p className="text-ink-700">
              Link público:{" "}
              <a className="underline" href={publicUrl} target="_blank" rel="noreferrer">
                {publicUrl}
              </a>
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-2 text-sm">
        <button
          type="button"
          className={`px-3 py-1.5 ${tab === "edit" ? "bg-ink-950 text-white" : "bg-white/70"}`}
          onClick={() => setTab("edit")}
        >
          Editar
        </button>
        <button
          type="button"
          className={`px-3 py-1.5 ${tab === "preview" ? "bg-ink-950 text-white" : "bg-white/70"}`}
          onClick={() => setTab("preview")}
        >
          Vista previa
        </button>
      </div>

      {tab === "preview" ? (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {availableTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTemplateId(t.id);
                  void save({ templateId: t.id });
                }}
                className={`border px-3 py-1.5 text-sm ${
                  templateId === t.id ? "border-ink-950" : "border-ink-200"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <PortfolioPreview content={content} templateId={templateId} />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="space-y-6">
            <Panel title="Plantilla">
              <div className="flex flex-wrap gap-2">
                {availableTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={`border px-3 py-1.5 text-sm ${
                      templateId === t.id ? "border-ink-950 bg-ink-50" : "border-ink-200"
                    }`}
                  >
                    {t.name}
                    {t.atsSafe ? " · ATS" : ""}
                  </button>
                ))}
              </div>
            </Panel>

            {docType === "cv" && (
              <SectionReviewBar
                content={content}
                busy={aiBusy || saving}
                onChange={setContent}
                onSave={(next) => void save({ content: next })}
                onRegenerateSection={(key) => void regenerateSection(key)}
              />
            )}

            {docType === "portfolio" && (
              <Panel title="Edición asistida por IA">
                <p className="mb-2 text-xs text-ink-500">
                  Describe el cambio en lenguaje natural (ej. “acorta la
                  descripción del primer proyecto” o “reordena poniendo vivienda
                  primero”). No inventará proyectos nuevos.
                </p>
                <textarea
                  rows={3}
                  value={nlInstruction}
                  onChange={(e) => setNlInstruction(e.target.value)}
                  className="w-full border border-ink-200 px-3 py-2 text-sm"
                  placeholder="Instrucción…"
                />
                <button
                  type="button"
                  disabled={aiBusy || !nlInstruction.trim()}
                  onClick={() => void applyNaturalLanguageEdit()}
                  className="mt-2 border border-ink-300 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Aplicar con IA
                </button>
              </Panel>
            )}

            <Panel title="Candidatura (opcional)">
              <p className="mb-2 text-xs text-ink-500">
                Empresa/puesto y texto de vacante: la IA prioriza hechos existentes.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Empresa objetivo"
                  value={content.targetCompany || ""}
                  onChange={(v) =>
                    setContent({ ...content, targetCompany: v })
                  }
                />
                <Field
                  label="Puesto objetivo"
                  value={content.targetRole || ""}
                  onChange={(v) => setContent({ ...content, targetRole: v })}
                />
              </div>
              <Field
                label="Texto de la vacante"
                value={content.jobDescription || ""}
                multiline
                onChange={(v) =>
                  setContent({ ...content, jobDescription: v })
                }
              />
            </Panel>

            <Panel title="Perfil">
              <Field
                label="Nombre"
                value={content.fullName}
                onChange={(v) =>
                  setContent(
                    touchSection("profile", { ...content, fullName: v }),
                  )
                }
              />
              <Field
                label="Titular"
                value={content.headline}
                onChange={(v) =>
                  setContent(
                    touchSection("profile", { ...content, headline: v }),
                  )
                }
                onImprove={() =>
                  improve("headline", content.headline, (v) =>
                    setContent((c) =>
                      touchSection("profile", { ...c, headline: v }),
                    ),
                  )
                }
              />
              <Field
                label="Resumen"
                value={content.summary}
                multiline
                onChange={(v) =>
                  setContent(
                    touchSection("profile", { ...content, summary: v }),
                  )
                }
                onImprove={() =>
                  improve("summary", content.summary, (v) =>
                    setContent((c) =>
                      touchSection("profile", { ...c, summary: v }),
                    ),
                  )
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Email"
                  value={content.email || ""}
                  onChange={(v) => setContent({ ...content, email: v })}
                />
                <Field
                  label="Teléfono"
                  value={content.phone || ""}
                  onChange={(v) => setContent({ ...content, phone: v })}
                />
                <Field
                  label="Ubicación"
                  value={content.location || ""}
                  onChange={(v) => setContent({ ...content, location: v })}
                />
                <Field
                  label="Web"
                  value={content.website || ""}
                  onChange={(v) => setContent({ ...content, website: v })}
                />
              </div>
              <Field
                label="Habilidades (separadas por coma)"
                value={content.skills.join(", ")}
                onChange={(v) =>
                  setContent({
                    ...content,
                    skills: v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Panel>

            <Panel
              title="Experiencia"
              actionLabel="Añadir"
              onAction={() =>
                setContent({
                  ...content,
                  experience: [
                    ...content.experience,
                    {
                      id: newId(),
                      role: "",
                      company: "",
                      description: "",
                    },
                  ],
                })
              }
            >
              {content.experience.map((ex, idx) => (
                <div key={ex.id} className="mb-4 border border-ink-100 p-3">
                  <Field
                    label="Rol"
                    value={ex.role}
                    onChange={(v) =>
                      updateExperience(setContent, content, idx, { role: v })
                    }
                  />
                  <Field
                    label="Empresa / Estudio"
                    value={ex.company}
                    onChange={(v) =>
                      updateExperience(setContent, content, idx, { company: v })
                    }
                  />
                  <Field
                    label="Descripción"
                    value={ex.description}
                    multiline
                    onChange={(v) =>
                      updateExperience(setContent, content, idx, {
                        description: v,
                      })
                    }
                    onImprove={() =>
                      improve("experience", ex.description, (v) =>
                        updateExperience(setContent, content, idx, {
                          description: v,
                        }),
                      )
                    }
                  />
                </div>
              ))}
            </Panel>

            <Panel
              title="Formación"
              actionLabel="Añadir"
              onAction={() =>
                setContent({
                  ...content,
                  education: [
                    ...content.education,
                    { id: newId(), school: "", degree: "" },
                  ],
                })
              }
            >
              {content.education.map((ed, idx) => (
                <div key={ed.id} className="mb-4 border border-ink-100 p-3">
                  <Field
                    label="Título"
                    value={ed.degree}
                    onChange={(v) =>
                      updateEducation(setContent, content, idx, { degree: v })
                    }
                  />
                  <Field
                    label="Escuela"
                    value={ed.school}
                    onChange={(v) =>
                      updateEducation(setContent, content, idx, { school: v })
                    }
                  />
                  <Field
                    label="Año"
                    value={ed.year || ""}
                    onChange={(v) =>
                      updateEducation(setContent, content, idx, { year: v })
                    }
                  />
                </div>
              ))}
            </Panel>

            <Panel
              title="Proyectos"
              actionLabel="Añadir"
              onAction={() =>
                setContent({
                  ...content,
                  projects: [
                    ...content.projects,
                    {
                      id: newId(),
                      title: "",
                      description: "",
                      highlights: [],
                      imageUrls: [],
                    },
                  ],
                })
              }
            >
              {content.projects.map((p, idx) => (
                <div key={p.id} className="mb-4 border border-ink-100 p-3">
                  <Field
                    label="Título"
                    value={p.title}
                    onChange={(v) =>
                      updateProject(setContent, content, idx, { title: v })
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field
                      label="Año"
                      value={p.year || ""}
                      onChange={(v) =>
                        updateProject(setContent, content, idx, { year: v })
                      }
                    />
                    <Field
                      label="Lugar"
                      value={p.location || ""}
                      onChange={(v) =>
                        updateProject(setContent, content, idx, { location: v })
                      }
                    />
                    <Field
                      label="Tipología"
                      value={p.typology || ""}
                      onChange={(v) =>
                        updateProject(setContent, content, idx, { typology: v })
                      }
                    />
                  </div>
                  <Field
                    label="Descripción"
                    value={p.description}
                    multiline
                    onChange={(v) =>
                      updateProject(setContent, content, idx, {
                        description: v,
                      })
                    }
                    onImprove={() =>
                      improve("project", p.description, (v) =>
                        updateProject(setContent, content, idx, {
                          description: v,
                        }),
                      )
                    }
                  />
                  <Field
                    label="Destacados (uno por línea)"
                    value={p.highlights.join("\n")}
                    multiline
                    onChange={(v) =>
                      updateProject(setContent, content, idx, {
                        highlights: v
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="border border-ink-300 px-2 py-1 text-xs"
                      onClick={() => suggestProjectHighlights(p)}
                    >
                      Sugerir destacados (IA)
                    </button>
                    <label className="cursor-pointer border border-ink-300 px-2 py-1 text-xs">
                      Subir imágenes
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => onUploadImages(p.id, e.target.files)}
                      />
                    </label>
                  </div>
                  {p.imageUrls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.imageUrls.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="h-16 w-20 object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Panel>
          </div>

          <div className="hidden lg:block">
            <p className="mb-3 text-xs uppercase tracking-wider text-ink-500">
              Vista previa en vivo
            </p>
            <PortfolioPreview content={content} templateId={templateId} />
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  children,
  actionLabel,
  onAction,
}: {
  title: string;
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <section className="border border-ink-200 bg-white/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wider text-ink-600">
          {title}
        </h2>
        {onAction && actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="text-xs underline"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  onImprove,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  onImprove?: () => void;
}) {
  return (
    <label className="block text-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-ink-600">{label}</span>
        {onImprove ? (
          <button
            type="button"
            onClick={onImprove}
            className="text-xs text-clay-600 underline"
          >
            Mejorar con IA
          </button>
        ) : null}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full border border-ink-200 px-3 py-2"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-ink-200 px-3 py-2"
        />
      )}
    </label>
  );
}

function updateExperience(
  setContent: React.Dispatch<React.SetStateAction<PortfolioContent>>,
  content: PortfolioContent,
  idx: number,
  patch: Partial<ExperienceItem>,
) {
  const experience = content.experience.map((item, i) =>
    i === idx ? { ...item, ...patch } : item,
  );
  setContent({ ...content, experience });
}

function updateEducation(
  setContent: React.Dispatch<React.SetStateAction<PortfolioContent>>,
  content: PortfolioContent,
  idx: number,
  patch: Partial<EducationItem>,
) {
  const education = content.education.map((item, i) =>
    i === idx ? { ...item, ...patch } : item,
  );
  setContent({ ...content, education });
}

function updateProject(
  setContent: React.Dispatch<React.SetStateAction<PortfolioContent>>,
  content: PortfolioContent,
  idx: number,
  patch: Partial<ProjectItem>,
) {
  const projects = content.projects.map((item, i) =>
    i === idx ? { ...item, ...patch } : item,
  );
  setContent({ ...content, projects });
}
