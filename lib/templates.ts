import type { TemplateId } from "./types";

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  description: string;
  previewClass: string;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Líneas limpias, tipografía clara, énfasis en proyectos.",
    previewClass: "bg-ink-50 text-ink-950 border-ink-200",
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Composición tipográfica fuerte, aire tipográfico de revista.",
    previewClass: "bg-ink-950 text-ink-50 border-ink-800",
  },
  {
    id: "atelier",
    name: "Atelier",
    description: "Calidez de estudio: tipografía display y acentos en barro.",
    previewClass: "bg-[#f3eee6] text-ink-950 border-clay-500",
  },
];

export function getTemplate(id: TemplateId): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
