"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { DocumentWizard } from "@/components/wizard/DocumentWizard";
import type { DocType } from "@/lib/types";

function NewDocumentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("type");
  const [docType, setDocType] = useState<DocType | null>(
    initial === "cv" || initial === "portfolio" ? initial : null,
  );

  useEffect(() => {
    if (initial === "cv" || initial === "portfolio") {
      setDocType(initial);
    }
  }, [initial]);

  function choose(type: DocType) {
    setDocType(type);
    router.replace(`/dashboard/new?type=${type}`);
  }

  function clearChoice() {
    setDocType(null);
    router.replace("/dashboard/new");
  }

  if (docType === "portfolio") {
    return (
      <div>
        <div className="mx-auto max-w-3xl px-6 pt-6">
          <button
            type="button"
            onClick={clearChoice}
            className="text-sm text-ink-600 hover:underline"
          >
            ← Cambiar tipo (CV o portafolio)
          </button>
        </div>
        <DocumentWizard
          docType="portfolio"
          sourceMode="create"
          heading="Nuevo portafolio"
          description="Sube tu material, elige plantilla y genera un borrador con IA."
          defaultTitle="Mi portafolio"
          notesLabel="Experiencia, formación, proyectos (texto libre)"
          notesPlaceholder="Pega aquí tu trayectoria, estudios, skills y descripciones de proyectos…"
          notesRequired={false}
          filesLabel="Imágenes de proyectos y/o PDF de referencia (opcional si ya pegaste texto)"
          filesRequired={false}
          enableJobLink
          defaultTemplateId="minimal"
        />
      </div>
    );
  }

  if (docType === "cv") {
    return (
      <div>
        <div className="mx-auto max-w-3xl px-6 pt-6">
          <button
            type="button"
            onClick={clearChoice}
            className="text-sm text-ink-600 hover:underline"
          >
            ← Cambiar tipo (CV o portafolio)
          </button>
        </div>
        <DocumentWizard
          docType="cv"
          sourceMode="create"
          heading="Crear / mejorar CV"
          description="Sube tu CV en PDF o pega texto. Opcionalmente indica la vacante: la IA prioriza lo relevante sin inventar experiencia."
          defaultTitle="Mi CV"
          notesLabel="Texto del CV o trayectoria (opcional si subes PDF)"
          notesPlaceholder="Pega aquí tu CV actual o una lista de experiencia, formación y skills…"
          notesRequired={false}
          filesLabel="CV en PDF (opcional si ya pegaste texto)"
          filesRequired={false}
          accept="application/pdf,.pdf,.txt,.md"
          enableJobLink
          defaultTemplateId="ats"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-8">
      <Link href="/dashboard" className="text-sm text-ink-600 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-6 font-display text-4xl">Crear documento</h1>
      <p className="mt-2 text-ink-600">
        Elige qué quieres generar. Ambas opciones usan plantillas e IA; el CV se
        centra en trayectoria laboral y el portafolio en proyectos.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => choose("portfolio")}
          className="border border-ink-200 bg-white/70 p-6 text-left transition hover:border-ink-950"
        >
          <p className="text-xs uppercase tracking-wider text-ink-500">
            Opción A
          </p>
          <p className="mt-2 font-display text-3xl">Portafolio</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-600">
            Proyectos, imágenes y narrativa visual para mostrar tu obra.
          </p>
        </button>
        <button
          type="button"
          onClick={() => choose("cv")}
          className="border border-ink-200 bg-white/70 p-6 text-left transition hover:border-ink-950"
        >
          <p className="text-xs uppercase tracking-wider text-ink-500">
            Opción B
          </p>
          <p className="mt-2 font-display text-3xl">CV</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-600">
            Experiencia, formación y skills — incluye plantilla ATS-safe.
          </p>
        </button>
      </div>

      <p className="mt-8 text-xs text-ink-500">
        Sin límites de uso por ahora: puedes crear tantos CVs y portafolios como
        necesites.
      </p>
    </div>
  );
}

export default function NewDocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-ink-600">
          Cargando…
        </div>
      }
    >
      <NewDocumentInner />
    </Suspense>
  );
}
