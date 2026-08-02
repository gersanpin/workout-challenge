import OpenAI from "openai";
import { z } from "zod";
import { mapAiError } from "./errors";
import type {
  DocType,
  PortfolioContent,
  SectionKey,
  SourceMode,
} from "./types";
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

const NO_INVENT = `REGLA ESTRICTA (obligatoria):
- NUNCA inventes ni exageres experiencia, empresas, fechas, títulos, habilidades, proyectos, escalas, premios o herramientas que NO aparezcan en el material de origen del usuario.
- Solo puedes reorganizar, reformular, condensar y priorizar hechos ya presentes.
- Si falta un dato, omítelo o deja el campo vacío; no lo completes con suposiciones.
- Puedes cambiar el orden y el énfasis según la vacante, pero no fabricar contenido nuevo.`;

const SYSTEM = `Eres un editor senior de CVs y portafolios para arquitectos (español).
Escribes con tono profesional, concreto y elegante. Evitas clichés vacíos.
${NO_INVENT}
Respondes SOLO con JSON válido según el esquema pedido.`;

function targetingBlock(input: {
  targetCompany?: string;
  targetRole?: string;
  jobDescription?: string;
}): string {
  const company = input.targetCompany?.trim();
  const role = input.targetRole?.trim();
  const job = input.jobDescription?.trim();
  if (!company && !role && !job) return "";
  return `
Personalización de candidatura:
- Empresa objetivo: ${company || "no indicada"}
- Puesto objetivo: ${role || "no indicado"}
- Texto de la vacante (si existe): ${job ? job.slice(0, 6000) : "no disponible"}
Prioriza y reformula SOLO hechos del material de origen que encajen con la vacante. No inventes requisitos cumplidos.`;
}

function modeBlock(docType: DocType, sourceMode: SourceMode): string {
  if (docType === "cv") {
    return sourceMode === "redesign"
      ? `Modo: REDISEÑO DE CV. Reorganiza y reformula el CV existente. Proyectos solo si ya están en el origen.`
      : `Modo: CREAR/MEJORAR CV. Reorganiza el material del usuario en un CV profesional. No añadas proyectos inventados.`;
  }
  return sourceMode === "redesign"
    ? `Modo: REDISEÑO DE PORTAFOLIO COMPLETO (puede ser multipágina / varias imágenes). Extrae TODOS los proyectos y datos del material; no omitas páginas ni inventes proyectos nuevos.`
    : `Modo: CREAR PORTAFOLIO. Usa solo proyectos y hechos presentes en el material de origen.`;
}

export async function generateDraftFromNotes(input: {
  notes: string;
  fullName?: string;
  existing?: Partial<PortfolioContent>;
  docType?: DocType;
  sourceMode?: SourceMode;
  targetCompany?: string;
  targetRole?: string;
  jobDescription?: string;
}): Promise<PortfolioContent> {
  const docType = input.docType || "portfolio";
  const sourceMode = input.sourceMode || "create";
  const targetCompany =
    input.targetCompany || input.existing?.targetCompany || "";
  const targetRole = input.targetRole || input.existing?.targetRole || "";
  const jobDescription =
    input.jobDescription || input.existing?.jobDescription || "";
  const jobUrl = input.existing?.jobUrl || "";

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
      jobDescription,
      jobUrl,
    };
  }

  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `${modeBlock(docType, sourceMode)}
${NO_INVENT}
${targetingBlock({ targetCompany, targetRole, jobDescription })}

Genera JSON con claves:
fullName, headline, summary, email, phone, location, website, skills (string[]),
experience: [{role, company, location, startDate, endDate, description}],
education: [{school, degree, year, description}],
projects: [{title, year, location, typology, description, highlights: string[]}].

Nombre sugerido (solo si aparece en el material): ${input.fullName || "desconocido"}

MATERIAL DE ORIGEN (única fuente de hechos; puede incluir PDF multipágina):
${input.notes.slice(0, 24000)}

Contenido existente a respetar (hechos / imágenes):
${JSON.stringify({
  fullName: input.existing?.fullName,
  projects: input.existing?.projects?.map((p) => ({
    title: p.title,
    imageUrls: p.imageUrls,
  })),
})}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        "La IA devolvió una respuesta inválida. Intenta de nuevo.",
      );
    }
    const normalized = normalizeContent(parsed, input.existing);
    return {
      ...normalized,
      targetCompany,
      targetRole,
      jobDescription,
      jobUrl,
    };
  } catch (err) {
    throw new Error(mapAiError(err));
  }
}

export async function regenerateSection(input: {
  section: SectionKey;
  content: PortfolioContent;
  notes: string;
  docType: DocType;
}): Promise<PortfolioContent> {
  const client = getClient();
  const job = {
    targetCompany: input.content.targetCompany,
    targetRole: input.content.targetRole,
    jobDescription: input.content.jobDescription,
  };

  if (!client) {
    return input.content;
  }

  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Regenera SOLO la sección "${input.section}" del ${input.docType === "cv" ? "CV" : "portafolio"}.
${NO_INVENT}
${targetingBlock(job)}

Devuelve JSON completo del documento (mismas claves de siempre), pero cambia únicamente la sección pedida; el resto debe coincidir con el contenido actual.

Contenido actual:
${JSON.stringify(stripMeta(input.content))}

MATERIAL DE ORIGEN:
${input.notes.slice(0, 20000)}`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    const normalized = normalizeContent(parsed, input.content);
    // Merge: keep non-target sections from current content
    return mergeSection(input.content, normalized, input.section);
  } catch (err) {
    throw new Error(mapAiError(err));
  }
}

export async function editWithInstruction(input: {
  content: PortfolioContent;
  instruction: string;
  notes: string;
  docType: DocType;
}): Promise<PortfolioContent> {
  const client = getClient();
  if (!client) {
    throw new Error(
      "Se necesita OPENAI_API_KEY para la edición asistida por IA.",
    );
  }

  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Edición asistida en lenguaje natural sobre un ${input.docType === "cv" ? "CV" : "portafolio"} ya generado.
Instrucción del usuario: ${input.instruction}
${NO_INVENT}
No añadas proyectos, empresas ni skills que no estén en el material de origen o en el borrador actual.

Borrador actual:
${JSON.stringify(stripMeta(input.content))}

Material de origen:
${input.notes.slice(0, 20000)}

Devuelve el JSON completo actualizado.`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    const normalized = normalizeContent(parsed, input.content);
    // Preserve image URLs by project index/title
    normalized.projects = normalized.projects.map((p, i) => {
      const prev =
        input.content.projects.find(
          (x) => x.title.toLowerCase() === p.title.toLowerCase(),
        ) || input.content.projects[i];
      return {
        ...p,
        imageUrls: prev?.imageUrls?.length ? prev.imageUrls : p.imageUrls,
      };
    });
    return {
      ...normalized,
      jobUrl: input.content.jobUrl,
      jobDescription: input.content.jobDescription,
      targetCompany: input.content.targetCompany,
      targetRole: input.content.targetRole,
      rawNotes: input.content.rawNotes,
      sectionBaseline: input.content.sectionBaseline,
      sectionStatus: input.content.sectionStatus,
    };
  } catch (err) {
    throw new Error(mapAiError(err));
  }
}

export async function improveText(input: {
  field: string;
  text: string;
  context?: string;
  targetCompany?: string;
  targetRole?: string;
  jobDescription?: string;
}): Promise<string> {
  const client = getClient();
  if (!client) {
    return polishLocally(input.text);
  }

  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.25,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Mejora el texto del campo "${input.field}".
${NO_INVENT}
No añadas hechos nuevos. Solo claridad y tono profesional.
${targetingBlock({
  targetCompany: input.targetCompany,
  targetRole: input.targetRole,
  jobDescription: input.jobDescription,
})}
Contexto: ${input.context || "n/a"}
Texto:
${input.text}

Devuelve SOLO el texto mejorado.`,
        },
      ],
    });

    return (completion.choices[0]?.message?.content || input.text).trim();
  } catch (err) {
    throw new Error(mapAiError(err));
  }
}

export async function suggestHighlights(input: {
  title: string;
  description: string;
  targetCompany?: string;
  targetRole?: string;
  jobDescription?: string;
}): Promise<string[]> {
  const client = getClient();
  if (!client) {
    return localHighlights(input.description);
  }

  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Sugiere 3-5 bullets para "${input.title}" usando SOLO hechos de la descripción.
${NO_INVENT}
JSON: { "highlights": string[] }
${targetingBlock({
  targetCompany: input.targetCompany,
  targetRole: input.targetRole,
  jobDescription: input.jobDescription,
})}
Descripción: ${input.description}`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    return Array.isArray(parsed.highlights)
      ? parsed.highlights.map(String).slice(0, 5)
      : localHighlights(input.description);
  } catch (err) {
    throw new Error(mapAiError(err));
  }
}

function stripMeta(content: PortfolioContent) {
  const {
    sectionBaseline: _b,
    sectionStatus: _s,
    rawNotes: _r,
    ...rest
  } = content;
  return rest;
}

function mergeSection(
  current: PortfolioContent,
  regenerated: PortfolioContent,
  section: SectionKey,
): PortfolioContent {
  const next = { ...current };
  if (section === "profile") {
    next.fullName = regenerated.fullName;
    next.headline = regenerated.headline;
    next.summary = regenerated.summary;
    next.email = regenerated.email;
    next.phone = regenerated.phone;
    next.location = regenerated.location;
    next.website = regenerated.website;
  } else if (section === "experience") {
    next.experience = regenerated.experience;
  } else if (section === "education") {
    next.education = regenerated.education;
  } else if (section === "skills") {
    next.skills = regenerated.skills;
  } else if (section === "projects") {
    next.projects = regenerated.projects.map((p, i) => ({
      ...p,
      imageUrls: current.projects[i]?.imageUrls || p.imageUrls || [],
    }));
  }
  return next;
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
    projects: data.projects.map((p, i) => ({
      ...p,
      id: newId(),
      imageUrls: existing?.projects?.[i]?.imageUrls || [],
      highlights: p.highlights || [],
    })),
    rawNotes: existing?.rawNotes || "",
    targetCompany: existing?.targetCompany || "",
    targetRole: existing?.targetRole || "",
    jobUrl: existing?.jobUrl || "",
    jobDescription: existing?.jobDescription || "",
    sectionBaseline: existing?.sectionBaseline,
    sectionStatus: existing?.sectionStatus,
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
    "Perfil profesional basado en el material aportado.";

  const projects =
    docType === "cv"
      ? existing?.projects || []
      : existing?.projects?.length
        ? existing.projects
        : lines.length > 6
          ? [
              {
                id: newId(),
                title: "Proyecto (del material aportado)",
                description: polishLocally(lines.slice(6, 14).join(" ")),
                highlights: localHighlights(notes),
                imageUrls: [],
              },
            ]
          : [];

  return {
    fullName: name,
    headline: existing?.headline || "Arquitecto/a",
    summary,
    email: existing?.email || "",
    phone: existing?.phone || "",
    location: existing?.location || "",
    website: existing?.website || "",
    skills: existing?.skills?.length ? existing.skills : [],
    experience: existing?.experience?.length
      ? existing.experience
      : [
          {
            id: newId(),
            role: "Arquitecto/a",
            company: "Según material aportado",
            description: polishLocally(lines.slice(3, 6).join(" ") || summary),
          },
        ],
    education: existing?.education?.length ? existing.education : [],
    projects,
    rawNotes: notes,
    targetCompany: existing?.targetCompany || "",
    targetRole: existing?.targetRole || "",
    jobUrl: existing?.jobUrl || "",
    jobDescription: existing?.jobDescription || "",
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
  return sentences.length ? sentences.map(polishLocally) : [];
}
