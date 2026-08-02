import type { DocType, TemplateId } from "./types";

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  description: string;
  previewClass: string;
  /** If true, shown primarily for CV flows */
  atsSafe?: boolean;
  forDocTypes: DocType[];
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "ats",
    name: "ATS-safe",
    description:
      "Una columna, sin tablas ni columnas laterales. Ideal para sistemas de selección (ATS).",
    previewClass: "bg-white text-ink-950 border-ink-400",
    atsSafe: true,
    forDocTypes: ["cv"],
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Líneas limpias, tipografía clara, énfasis en proyectos.",
    previewClass: "bg-ink-50 text-ink-950 border-ink-200",
    forDocTypes: ["cv", "portfolio"],
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Composición tipográfica fuerte, aire tipográfico de revista.",
    previewClass: "bg-ink-950 text-ink-50 border-ink-800",
    forDocTypes: ["cv", "portfolio"],
  },
  {
    id: "atelier",
    name: "Atelier",
    description: "Calidez de estudio: tipografía display y acentos en barro.",
    previewClass: "bg-[#f3eee6] text-ink-950 border-clay-500",
    forDocTypes: ["cv", "portfolio"],
  },
];

export function templatesFor(docType: DocType): TemplateMeta[] {
  return TEMPLATES.filter((t) => t.forDocTypes.includes(docType));
}

export function getTemplate(id: TemplateId): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[1];
}
