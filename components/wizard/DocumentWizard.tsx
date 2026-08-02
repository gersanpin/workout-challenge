"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { readJsonSafe } from "@/lib/errors";
import {
  formatBytes,
  MAX_FILE_BYTES,
  MAX_FILES,
  validateUploadFiles,
} from "@/lib/files";
import { templatesFor } from "@/lib/templates";
import type { DocType, SourceMode, TemplateId } from "@/lib/types";

export interface DocumentWizardProps {
  docType: DocType;
  sourceMode: SourceMode;
  heading: string;
  description: string;
  defaultTitle: string;
  notesLabel: string;
  notesPlaceholder: string;
  notesRequired: boolean;
  filesLabel: string;
  filesRequired: boolean;
  accept?: string;
  /** Show job URL scrape + manual paste (CV) */
  enableJobLink?: boolean;
  defaultTemplateId?: TemplateId;
}

export function DocumentWizard({
  docType,
  sourceMode,
  heading,
  description,
  defaultTitle,
  notesLabel,
  notesPlaceholder,
  notesRequired,
  filesLabel,
  filesRequired,
  accept = "image/*,application/pdf,.pdf,.txt,.md",
  enableJobLink = false,
  defaultTemplateId,
}: DocumentWizardProps) {
  const router = useRouter();
  const availableTemplates = useMemo(() => templatesFor(docType), [docType]);
  const initialTemplate =
    defaultTemplateId &&
    availableTemplates.some((t) => t.id === defaultTemplateId)
      ? defaultTemplateId
      : availableTemplates[0]?.id || "minimal";

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(defaultTitle);
  const [fullName, setFullName] = useState("");
  const [notes, setNotes] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobHint, setJobHint] = useState<string | null>(null);
  const [showJobPaste, setShowJobPaste] = useState(false);
  const [fetchingJob, setFetchingJob] = useState(false);
  const [templateId, setTemplateId] = useState<TemplateId>(initialTemplate);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  function canContinueStep1(): boolean {
    if (!fullName.trim()) return false;
    const hasNotes = Boolean(notes.trim());
    const hasFiles = files.length > 0;
    if (notesRequired && !hasNotes) return false;
    if (filesRequired && !hasFiles) return false;
    if (!hasNotes && !hasFiles) return false;
    return true;
  }

  function onFilesChange(list: FileList | null) {
    setError(null);
    const next = list ? Array.from(list) : [];
    const validationError = validateUploadFiles(next);
    if (validationError) {
      setFiles([]);
      setError(validationError);
      return;
    }
    setFiles(next);
  }

  async function fetchJob() {
    setJobHint(null);
    setError(null);
    if (!jobUrl.trim()) {
      setJobHint("Pega un enlace de la vacante o escribe el texto abajo.");
      setShowJobPaste(true);
      return;
    }
    setFetchingJob(true);
    try {
      const res = await fetch("/api/job/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl.trim() }),
      });
      const data = await readJsonSafe<{
        ok?: boolean;
        text?: string;
        error?: string;
        needsManualPaste?: boolean;
      }>(res);
      if (!res.ok || !data.ok) {
        setShowJobPaste(true);
        setJobHint(
          data.error ||
            "No se pudo leer el enlace. Pega el texto de la vacante manualmente.",
        );
        return;
      }
      setJobDescription(data.text || "");
      setShowJobPaste(true);
      setJobHint("Vacante leída. Puedes editar el texto si hace falta.");
    } catch {
      setShowJobPaste(true);
      setJobHint(
        "No se pudo leer el enlace. Pega el texto de la vacante manualmente.",
      );
    } finally {
      setFetchingJob(false);
    }
  }

  function goStep2() {
    setError(null);
    if (files.length) {
      const validationError = validateUploadFiles(files);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    if (!canContinueStep1()) {
      setError("Completa nombre y añade texto o archivos válidos.");
      return;
    }
    setStep(2);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (files.length) {
        const validationError = validateUploadFiles(files);
        if (validationError) throw new Error(validationError);
      }

      setStatus("Creando documento…");
      const createRes = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          templateId,
          fullName,
          notes,
          docType,
          sourceMode,
          targetCompany,
          targetRole,
          jobUrl,
          jobDescription,
        }),
      });
      const createData = await readJsonSafe<{
        error?: string;
        portfolio?: { id: string };
      }>(createRes);
      if (!createRes.ok) {
        throw new Error(createData.error || "Error al crear el documento");
      }
      const portfolioId = createData.portfolio?.id;
      if (!portfolioId) throw new Error("No se recibió el ID del documento");

      if (files.length) {
        setStatus(
          sourceMode === "redesign"
            ? "Subiendo portafolio multipágina / imágenes…"
            : "Subiendo y leyendo archivos…",
        );
        const fd = new FormData();
        fd.set("portfolioId", portfolioId);
        files.forEach((f) => fd.append("files", f));
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const upData = await readJsonSafe<{ error?: string }>(up);
        if (!up.ok) {
          throw new Error(upData.error || "Error al subir archivos");
        }
      }

      setStatus("Generando borrador con IA (sin inventar datos)…");
      const aiRes = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId }),
      });
      const aiData = await readJsonSafe<{ error?: string }>(aiRes);
      if (!aiRes.ok) {
        throw new Error(
          aiData.error ||
            "No se pudo generar el borrador con IA. Revisa la API key o el archivo e intenta de nuevo.",
        );
      }

      router.push(`/dashboard/${portfolioId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-3xl px-6 py-8">
      {loading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 px-6 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
        >
          <div className="w-full max-w-sm border border-ink-200 bg-ink-50 p-8 shadow-lg">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-ink-300 border-t-ink-950" />
            <p className="mt-5 text-center font-medium text-ink-900">
              {status || "Procesando…"}
            </p>
            <div className="mt-4 space-y-2">
              <div className="h-2 animate-pulse bg-ink-200" />
              <div className="h-2 w-[80%] animate-pulse bg-ink-200" />
              <div className="h-2 w-[65%] animate-pulse bg-ink-200" />
            </div>
            <p className="mt-4 text-center text-xs text-ink-500">
              Esto puede tardar unos segundos. No cierres esta ventana.
            </p>
          </div>
        </div>
      )}

      <Link href="/dashboard" className="text-sm text-ink-600 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-6 font-display text-4xl">{heading}</h1>
      <p className="mt-2 text-ink-600">{description}</p>
      <p className="mt-2 text-xs text-ink-500">
        La IA solo reorganiza y reformula lo que ya aportaste: no inventa
        experiencia, fechas ni proyectos.
      </p>

      <div className="mt-8 flex gap-2 text-xs uppercase tracking-wider text-ink-500">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            disabled={loading}
            onClick={() => setStep(n)}
            className={`px-3 py-1 ${step === n ? "bg-ink-950 text-ink-50" : "bg-white/60"} disabled:opacity-50`}
          >
            Paso {n}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        {step === 1 && (
          <div className="space-y-4 border border-ink-200 bg-white/70 p-6">
            <label className="block text-sm">
              <span className="text-ink-600">Título del documento</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                className="mt-1 w-full border border-ink-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-600">Tu nombre profesional</span>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                className="mt-1 w-full border border-ink-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-600">{notesLabel}</span>
              <textarea
                required={notesRequired}
                rows={8}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={notesPlaceholder}
                disabled={loading}
                className="mt-1 w-full border border-ink-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-600">{filesLabel}</span>
              <input
                type="file"
                multiple
                required={filesRequired}
                accept={accept}
                disabled={loading}
                onChange={(e) => onFilesChange(e.target.files)}
                className="mt-2 block w-full text-sm"
              />
              <p className="mt-1 text-xs text-ink-500">
                Hasta {MAX_FILES} archivos · máx. {formatBytes(MAX_FILE_BYTES)}{" "}
                c/u · PDF multipágina e imágenes permitidos
              </p>
              {files.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-ink-600">
                  {files.map((f) => (
                    <li key={`${f.name}-${f.size}`}>
                      {f.name} · {formatBytes(f.size)}
                    </li>
                  ))}
                </ul>
              )}
            </label>

            <div className="border-t border-ink-100 pt-4">
              <p className="text-sm font-medium text-ink-800">
                Personalizar para una candidatura{" "}
                <span className="font-normal text-ink-500">(opcional)</span>
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-ink-600">Empresa</span>
                  <input
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    placeholder="Ej. Foster + Partners"
                    disabled={loading}
                    className="mt-1 w-full border border-ink-200 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-ink-600">Puesto</span>
                  <input
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="Ej. Arquitecto/a junior"
                    disabled={loading}
                    className="mt-1 w-full border border-ink-200 px-3 py-2"
                  />
                </label>
              </div>

              {enableJobLink && (
                <div className="mt-4 space-y-2">
                  <label className="block text-sm">
                    <span className="text-ink-600">
                      Link de la vacante (LinkedIn u otro)
                    </span>
                    <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        placeholder="https://…"
                        disabled={loading || fetchingJob}
                        className="w-full border border-ink-200 px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={fetchJob}
                        disabled={loading || fetchingJob}
                        className="shrink-0 border border-ink-300 px-3 py-2 text-sm disabled:opacity-60"
                      >
                        {fetchingJob ? "Leyendo…" : "Leer vacante"}
                      </button>
                    </div>
                  </label>
                  {jobHint && (
                    <p className="text-xs text-ink-600" role="status">
                      {jobHint}
                    </p>
                  )}
                  {(showJobPaste || jobDescription) && (
                    <label className="block text-sm">
                      <span className="text-ink-600">
                        Texto de la vacante (pega aquí si el link no se pudo
                        leer)
                      </span>
                      <textarea
                        rows={5}
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        disabled={loading}
                        placeholder="Pega la descripción del puesto…"
                        className="mt-1 w-full border border-ink-200 px-3 py-2"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>

            {error && step === 1 && (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={!canContinueStep1() || loading}
              onClick={goStep2}
              className="bg-ink-950 px-4 py-2 text-sm text-ink-50 disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 border border-ink-200 bg-white/70 p-6">
            <p className="text-sm text-ink-600">Elige una plantilla</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {availableTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={loading}
                  onClick={() => setTemplateId(t.id)}
                  className={`border p-4 text-left ${
                    templateId === t.id
                      ? "border-ink-950 ring-1 ring-ink-950"
                      : "border-ink-200"
                  } ${t.previewClass}`}
                >
                  <p className="font-medium">
                    {t.name}
                    {t.atsSafe ? " · ATS" : ""}
                  </p>
                  <p className="mt-2 text-xs opacity-80">{t.description}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                className="border border-ink-300 px-4 py-2 text-sm"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={loading}
                className="bg-ink-950 px-4 py-2 text-sm text-ink-50"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 border border-ink-200 bg-white/70 p-6">
            <p className="text-sm leading-relaxed text-ink-700">
              Vamos a crear <strong>{title}</strong> con plantilla{" "}
              <strong>{templateId}</strong>
              {targetCompany || targetRole
                ? ` orientado a ${[targetRole, targetCompany].filter(Boolean).join(" · ")}`
                : ""}
              {files.length ? ` · ${files.length} archivo(s)` : ""}.
            </p>
            {error && (
              <p
                className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                role="alert"
              >
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="border border-ink-300 px-4 py-2 text-sm"
                disabled={loading}
              >
                Atrás
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 bg-ink-950 px-4 py-2 text-sm text-ink-50 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-50/30 border-t-ink-50" />
                    Generando…
                  </>
                ) : (
                  "Generar borrador"
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
