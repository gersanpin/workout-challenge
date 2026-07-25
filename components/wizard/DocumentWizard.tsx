"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { TEMPLATES } from "@/lib/templates";
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
}: DocumentWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(defaultTitle);
  const [fullName, setFullName] = useState("");
  const [notes, setNotes] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId>("minimal");
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  function canContinueStep1(): boolean {
    if (!fullName.trim()) return false;
    const hasNotes = Boolean(notes.trim());
    const hasFiles = Boolean(files && files.length);
    if (notesRequired && !hasNotes) return false;
    if (filesRequired && !hasFiles) return false;
    if (!hasNotes && !hasFiles) return false;
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
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
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Error al crear");

      const portfolioId = createData.portfolio.id as string;

      if (files && files.length) {
        setStatus("Subiendo y leyendo archivos…");
        const fd = new FormData();
        fd.set("portfolioId", portfolioId);
        Array.from(files).forEach((f) => fd.append("files", f));
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const upData = await up.json();
        if (!up.ok) throw new Error(upData.error || "Error al subir archivos");
      }

      setStatus("Generando borrador con IA…");
      const aiRes = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId }),
      });
      const aiData = await aiRes.json();
      if (!aiRes.ok) throw new Error(aiData.error || "Error de IA");

      router.push(`/dashboard/${portfolioId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
      setStatus("");
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-8">
      <Link href="/dashboard" className="text-sm text-ink-600 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-6 font-display text-4xl">{heading}</h1>
      <p className="mt-2 text-ink-600">{description}</p>

      <div className="mt-8 flex gap-2 text-xs uppercase tracking-wider text-ink-500">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStep(n)}
            className={`px-3 py-1 ${step === n ? "bg-ink-950 text-ink-50" : "bg-white/60"}`}
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
                className="mt-1 w-full border border-ink-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-600">Tu nombre profesional</span>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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
                onChange={(e) => setFiles(e.target.files)}
                className="mt-2 block w-full text-sm"
              />
            </label>

            <div className="border-t border-ink-100 pt-4">
              <p className="text-sm font-medium text-ink-800">
                Personalizar para una candidatura{" "}
                <span className="font-normal text-ink-500">(opcional)</span>
              </p>
              <p className="mt-1 text-xs text-ink-500">
                Si lo indicas, la IA adaptará tono, énfasis y headline a esa
                empresa/puesto.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-ink-600">Empresa</span>
                  <input
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    placeholder="Ej. Foster + Partners"
                    className="mt-1 w-full border border-ink-200 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-ink-600">Puesto</span>
                  <input
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="Ej. Arquitecto/a junior"
                    className="mt-1 w-full border border-ink-200 px-3 py-2"
                  />
                </label>
              </div>
            </div>

            <button
              type="button"
              disabled={!canContinueStep1()}
              onClick={() => setStep(2)}
              className="bg-ink-950 px-4 py-2 text-sm text-ink-50 disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 border border-ink-200 bg-white/70 p-6">
            <p className="text-sm text-ink-600">Elige una plantilla</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  className={`border p-4 text-left ${
                    templateId === t.id
                      ? "border-ink-950 ring-1 ring-ink-950"
                      : "border-ink-200"
                  } ${t.previewClass}`}
                >
                  <p className="font-medium">{t.name}</p>
                  <p className="mt-2 text-xs opacity-80">{t.description}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="border border-ink-300 px-4 py-2 text-sm"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
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
              {files?.length ? ` · ${files.length} archivo(s)` : ""}.
            </p>
            {error && <p className="text-sm text-red-700">{error}</p>}
            {status && <p className="text-sm text-ink-600">{status}</p>}
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
                className="bg-ink-950 px-4 py-2 text-sm text-ink-50 disabled:opacity-60"
              >
                {loading ? "Trabajando…" : "Generar borrador"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
