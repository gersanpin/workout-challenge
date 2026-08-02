"use client";

import {
  ALL_SECTIONS,
  markSection,
  revertSection,
  SECTION_LABELS,
} from "@/lib/sections";
import type { PortfolioContent, SectionKey } from "@/lib/types";

export function SectionReviewBar({
  content,
  onChange,
  onSave,
  onRegenerateSection,
  busy,
}: {
  content: PortfolioContent;
  onChange: (next: PortfolioContent) => void;
  onSave: (next: PortfolioContent) => void;
  onRegenerateSection: (key: SectionKey) => void;
  busy: boolean;
}) {
  if (!content.sectionBaseline) return null;

  return (
    <section className="border border-ink-200 bg-white/80 p-4">
      <h2 className="text-sm font-medium uppercase tracking-wider text-ink-600">
        Revisión por secciones
      </h2>
      <p className="mt-1 text-xs text-ink-500">
        Acepta, edita o revierte cada bloque. Revertir restaura la versión del
        último borrador de IA de esa sección.
      </p>
      <ul className="mt-4 space-y-2">
        {ALL_SECTIONS.map((key) => {
          const status = content.sectionStatus?.[key] || "pending";
          return (
            <li
              key={key}
              className="flex flex-wrap items-center justify-between gap-2 border border-ink-100 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{SECTION_LABELS[key]}</p>
                <p className="text-xs text-ink-500">
                  {status === "accepted"
                    ? "Aceptada"
                    : status === "edited"
                      ? "Editada"
                      : "Pendiente de revisar"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  disabled={busy}
                  className="border border-ink-300 px-2 py-1 disabled:opacity-50"
                  onClick={() => {
                    const next = markSection(content, key, "accepted");
                    onChange(next);
                    onSave(next);
                  }}
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  disabled={busy || !content.sectionBaseline}
                  className="border border-ink-300 px-2 py-1 disabled:opacity-50"
                  onClick={() => {
                    const next = revertSection(content, key);
                    onChange(next);
                    onSave(next);
                  }}
                >
                  Revertir
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="border border-ink-300 px-2 py-1 disabled:opacity-50"
                  onClick={() => onRegenerateSection(key)}
                >
                  Regenerar sección
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
