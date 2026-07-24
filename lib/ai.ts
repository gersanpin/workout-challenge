import OpenAI from "openai";
import { z } from "zod";
import type { PortfolioContent } from "./types";
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

export async function generateDraftFromNotes(input: {
  notes: string;
  fullName?: string;
  existing?: Partial<PortfolioContent>;
}): Promise<PortfolioContent> {
  const client = getClient();
  if (!client) {
    return heuristicDraft(input.notes, input.fullName, input.existing);
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
        content: `A partir de las notas del arquitecto, genera un borrador de CV/portafolio en JSON con claves:
fullName, headline, summary, email, phone, location, website, skills (string[]),
experience: [{role, company, location, startDate, endDate, description}],
education: [{school, degree, year, description}],
projects: [{title, year, location, typology, description, highlights: string[]}].

Nombre sugerido: ${input.fullName || "desconocido"}
Notas:
${input.notes.slice(0, 12000)}

Contenido existente (puedes fusionar/mejorar):
${JSON.stringify(input.existing ?? {})}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  return normalizeContent(JSON.parse(raw), input.existing);
}

export async function improveText(input: {
  field: string;
  text: string;
  context?: string;
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
  };
}

function heuristicDraft(
  notes: string,
  fullName?: string,
  existing?: Partial<PortfolioContent>,
): PortfolioContent {
  const lines = notes
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const name = fullName || existing?.fullName || lines[0] || "Arquitecto/a";
  const summary =
    lines.slice(0, 3).join(" ") ||
    "Arquitecto/a con enfoque en diseño, detalle constructivo y comunicación visual de proyectos.";

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
            description:
              polishLocally(lines.slice(3, 6).join(" ") || summary),
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
    projects: existing?.projects?.length
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
        ],
    rawNotes: notes,
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
