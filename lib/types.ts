export type PlanId = "free" | "pro";

export type TemplateId = "minimal" | "editorial" | "atelier";

export type DocType = "portfolio" | "cv";

export type SourceMode = "create" | "redesign";

export interface PlanLimits {
  id: PlanId;
  name: string;
  maxPortfolios: number;
  maxPublished: number;
  aiCreditsPerMonth: number;
  pdfExportsPerMonth: number;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description: string;
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  year?: string;
  description?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  year?: string;
  location?: string;
  typology?: string;
  description: string;
  highlights: string[];
  imageUrls: string[];
}

export interface PortfolioContent {
  fullName: string;
  headline: string;
  summary: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  rawNotes?: string;
  /** Optional: tailor AI output for a specific application */
  targetCompany?: string;
  targetRole?: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  title: string;
  slug: string | null;
  template_id: TemplateId;
  content: PortfolioContent;
  published: boolean;
  doc_type?: DocType;
  source_mode?: SourceMode;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  plan_id: PlanId;
  created_at: string;
}

export interface UsageEvent {
  id: string;
  user_id: string;
  kind: "ai" | "pdf_export";
  created_at: string;
  meta?: Record<string, unknown>;
}

export const EMPTY_CONTENT: PortfolioContent = {
  fullName: "",
  headline: "",
  summary: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
  rawNotes: "",
  targetCompany: "",
  targetRole: "",
};

export function newId(): string {
  return crypto.randomUUID();
}

export function docTypeLabel(docType: DocType): string {
  return docType === "cv" ? "CV" : "Portafolio";
}
