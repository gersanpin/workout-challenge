import type {
  PortfolioContent,
  SectionBaseline,
  SectionKey,
  SectionStatus,
} from "./types";

export const SECTION_LABELS: Record<SectionKey, string> = {
  profile: "Perfil",
  experience: "Experiencia",
  education: "Formación",
  skills: "Habilidades",
  projects: "Proyectos",
};

export const ALL_SECTIONS: SectionKey[] = [
  "profile",
  "experience",
  "education",
  "skills",
  "projects",
];

export function snapshotBaseline(content: PortfolioContent): SectionBaseline {
  return {
    fullName: content.fullName,
    headline: content.headline,
    summary: content.summary,
    email: content.email,
    phone: content.phone,
    location: content.location,
    website: content.website,
    skills: [...(content.skills || [])],
    experience: structuredClone(content.experience || []),
    education: structuredClone(content.education || []),
    projects: structuredClone(content.projects || []),
  };
}

export function pendingStatusMap(): Partial<Record<SectionKey, SectionStatus>> {
  return {
    profile: "pending",
    experience: "pending",
    education: "pending",
    skills: "pending",
    projects: "pending",
  };
}

export function revertSection(
  content: PortfolioContent,
  key: SectionKey,
): PortfolioContent {
  const b = content.sectionBaseline;
  if (!b) return content;
  const next = { ...content };
  if (key === "profile") {
    next.fullName = b.fullName ?? next.fullName;
    next.headline = b.headline ?? next.headline;
    next.summary = b.summary ?? next.summary;
    next.email = b.email ?? next.email;
    next.phone = b.phone ?? next.phone;
    next.location = b.location ?? next.location;
    next.website = b.website ?? next.website;
  } else if (key === "experience") {
    next.experience = structuredClone(b.experience || []);
  } else if (key === "education") {
    next.education = structuredClone(b.education || []);
  } else if (key === "skills") {
    next.skills = [...(b.skills || [])];
  } else if (key === "projects") {
    next.projects = structuredClone(b.projects || []);
  }
  next.sectionStatus = {
    ...next.sectionStatus,
    [key]: "pending",
  };
  return next;
}

export function markSection(
  content: PortfolioContent,
  key: SectionKey,
  status: SectionStatus,
): PortfolioContent {
  return {
    ...content,
    sectionStatus: {
      ...content.sectionStatus,
      [key]: status,
    },
  };
}

export function withAiDraftMeta(content: PortfolioContent): PortfolioContent {
  return {
    ...content,
    sectionBaseline: snapshotBaseline(content),
    sectionStatus: pendingStatusMap(),
  };
}
