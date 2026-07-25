import OpenAI from "openai";
import { z } from "zod";
import type { DocType, PortfolioContent, SourceMode } from "./types";
import { newId } from "./types";

const contentSchema = z.object({
  fullName: z.string().default(""),
  headline: z.string().default(""),
  summary: z.string().default(""),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  location: z.string().optional().default(""),
  website: z.string().optional().default(""),
  skills: z.array(z.string()).default([]),
  experience: z
    .array(
      z.object({
        role: z.string(),
        company: z.string(),
        location: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        description: z.string(),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        school: z.string(),
        degree: z.string(),
        year: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        title: z.string(),
        year: z.string().optional(),
        location: z.string().optional(),
        typology: z.string().optional(),
        description: z.string(),
        highlights: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const SYSTEM = `Eres un editor senior de CVs y portafolios para arquitectos (español).
Escribes con tono profesional, concreto y elegante. Evitas clichés vacíos.
Priorizas logros, escala, tipología, materiales, contexto urbano y rol del arquitecto.
Respondes SOLO con JSON válido según el esquema pedido.`;

function targetingBlock(input: {
  targetCompany?: string;
  targetRole?: string;
}): string {
  const company = input.targetCompany?.trim();
  const role = input.targetRole?.trim();
  if (!company && !role) return "";
  return `
Personalización de candidatura (IMPORTANTE):
- Empresa objetivo: ${company || "no indicada"}
- Puesto objetivo: ${role || "no indicado"}
Adapta headline, summary, énfasis en experiencia/proyectos y skills para esta aplicación concreta, sin inventar hechos.`;
}

function modeBlock(docType: DocType, sourceMode: SourceMode): string {
  if (docType === "cv") {
    return sourceMode === "redesign"
      ? `Modo: REDISEÑO DE CV. Analiza el CV existente (texto extraído de PDF/notas), corrige redacción, reorganiza secciones y genera un CV profesional mejorado. En projects incluye solo lo esencial o déjalo corto.`
      : `Modo: CREAR/MEJORAR CV. Genera un CV profesional (énfasis en experiencia, formación y skills). Proyectos solo si aportan valor; prioriza trayectoria laboral.`;
  }
  return sourceMode === "redesign"
    ? `Modo: REDISEÑO DE PORTAFOLIO. Analiza el portafolio existente (PDF/notas/imágenes referenciadas), mejora organización y redacción, y genera una versión rediseñada lista para plantilla visual. Destaca proyectos.`
    : `Modo: CREAR PORTAFOLIO. Genera un portafolio profesional con proyectos destacados, experiencia y perfil.`;
}

export async function generateDraftFromNotes(input: {
  notes: string;
  fullName?: string;
  existing?: Partial<PortfolioContent>;
  docType?: DocType;
  sourceMode?: SourceMode;
  targetCompany?: string;
  targetRole?: string;
}): Promise<PortfolioContent> {
  const docType = input.docType || "portfolio";
  const sourceMode = input.sourceMode || "create";
  const targetCompany =
    input.targetCompany || input.existing?.targetCompany || "";
  const targetRole = input.targetRole || input.existing?.targetRole || "";

  const client = getClient();
  if (!client) {
    const draft = heuristicDraft(
      input.notes,
      input.fullName,
      input.existing,
      docType,
    );
    return {
      ...draft,
      targetCompany,
      targetRole,
    };
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `${modeBlock(docType, sourceMode)}
${targetingBlock({ targetCompany, targetRole })}

Genera JSON con claves:
fullName, headline, summary, email, phone, location, website, skills (string[]),
experience: [{role, company, location, startDate, endDate, description}],
education: [{school, degree, year, description}],
projects: [{title, year, location, typology, description, highlights: string[]}].

Nombre sugerido: ${input.fullName || "desconocido"}
Material de origen (notas + texto extraído de archivos):
${input.notes.slice(0, 20000)}

Contenido existente (fusiona/mejora; conserva hechos):
${JSON.stringify({
  ...input.existing,
  rawNotes: undefined,
})}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const normalized = normalizeContent(JSON.parse(raw), input.existing);
  return {
    ...normalized,
    targetCompany,
    targetRole,
  };
}

export async function improveText(input: {
  field: string;
  text: string;
  context?: string;
  targetCompany?: string;
  targetRole?: string;
}): Promise<string> {
  const client = getClient();
  if (!client) {
    return polishLocally(input.text);
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Mejora el siguiente texto del campo "${input.field}" para un CV/portafolio de arquitectura.
Mantén hechos; mejora claridad, ritmo y tono profesional. Devuelve SOLO el texto mejorado, sin comillas ni JSON.
Contexto: ${input.context || "n/a"}
${targetingBlock({
  targetCompany: input.targetCompany,
  targetRole: input.targetRole,
})}
Texto:
${input.text}`,
      },
    ],
  });

  return (completion.choices[0]?.message?.content || input.text).trim();
}

export async function suggestHighlights(input: {
  title: string;
  description: string;
  targetCompany?: string;
  targetRole?: string;
}): Promise<string[]> {
  const client = getClient();
  if (!client) {
    return localHighlights(input.description);
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Sugiere 3-5 bullets (highlights) para el proyecto "${input.title}".
JSON: { "highlights": string[] }
${targetingBlock({
  targetCompany: input.targetCompany,
  targetRole: input.targetRole,
})}
Descripción: ${input.description}`,
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
  return Array.isArray(parsed.highlights)
    ? parsed.highlights.map(String).slice(0, 5)
    : localHighlights(input.description);
}

function normalizeContent(
  raw: unknown,
  existing?: Partial<PortfolioContent>,
): PortfolioContent {
  const parsed = contentSchema.safeParse(raw);
  const data = parsed.success ? parsed.data : contentSchema.parse({});

  return {
    fullName: data.fullName || existing?.fullName || "",
    headline: data.headline || existing?.headline || "",
    summary: data.summary || existing?.summary || "",
    email: data.email || existing?.email || "",
    phone: data.phone || existing?.phone || "",
    location: data.location || existing?.location || "",
    website: data.website || existing?.website || "",
    skills: data.skills.length ? data.skills : existing?.skills || [],
    experience: data.experience.map((e) => ({ ...e, id: newId() })),
    education: data.education.map((e) => ({ ...e, id: newId() })),
    projects: data.projects.map((p) => ({
      ...p,
      id: newId(),
      imageUrls: [],
      highlights: p.highlights || [],
    })),
    rawNotes: existing?.rawNotes || "",
    targetCompany: existing?.targetCompany || "",
    targetRole: existing?.targetRole || "",
  };
}

function heuristicDraft(
  notes: string,
  fullName?: string,
  existing?: Partial<PortfolioContent>,
  docType: DocType = "portfolio",
): PortfolioContent {
  const lines = notes
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const name = fullName || existing?.fullName || lines[0] || "Arquitecto/a";
  const summary =
    lines.slice(0, 3).join(" ") ||
    "Arquitecto/a con enfoque en diseño, detalle constructivo y comunicación visual de proyectos.";

  const projects =
    docType === "cv"
      ? existing?.projects || []
      : existing?.projects?.length
        ? existing.projects
        : [
            {
              id: newId(),
              title: "Proyecto destacado",
              description: polishLocally(
                lines.slice(6, 12).join(" ") ||
                  "Proyecto de arquitectura con énfasis en materialidad, luz y uso.",
              ),
              highlights: localHighlights(notes),
              imageUrls: [],
            },
          ];

  return {
    fullName: name,
    headline: existing?.headline || "Arquitecto/a · Diseño y proyecto",
    summary,
    email: existing?.email || "",
    phone: existing?.phone || "",
    location: existing?.location || "",
    website: existing?.website || "",
    skills: existing?.skills?.length
      ? existing.skills
      : ["Diseño arquitectónico", "Revit", "Rhino", "Representación"],
    experience: existing?.experience?.length
      ? existing.experience
      : [
          {
            id: newId(),
            role: "Arquitecto/a",
            company: "Estudio / Independiente",
            description: polishLocally(lines.slice(3, 6).join(" ") || summary),
          },
        ],
    education: existing?.education?.length
      ? existing.education
      : [
          {
            id: newId(),
            school: "Universidad",
            degree: "Arquitectura",
            year: "",
          },
        ],
    projects,
    rawNotes: notes,
    targetCompany: existing?.targetCompany || "",
    targetRole: existing?.targetRole || "",
  };
}

function polishLocally(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return t;
  const capped = t.charAt(0).toUpperCase() + t.slice(1);
  return capped.endsWith(".") ? capped : `${capped}.`;
}

function localHighlights(description: string): string[] {
  const sentences = description
    .split(/[.•\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 3);
  if (sentences.length) return sentences.map(polishLocally);
  return [
    "Definición de partido arquitectónico y programa.",
    "Desarrollo de detalle constructivo y materialidad.",
    "Coordinación de representación y entrega de proyecto.",
  ];
}
