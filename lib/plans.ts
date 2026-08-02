import type { PlanId, PlanLimits } from "./types";

/** Kept for future billing. Limits are not enforced in the app right now. */
export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    name: "Gratis (ilimitado)",
    maxPortfolios: Number.MAX_SAFE_INTEGER,
    maxPublished: Number.MAX_SAFE_INTEGER,
    aiCreditsPerMonth: Number.MAX_SAFE_INTEGER,
    pdfExportsPerMonth: Number.MAX_SAFE_INTEGER,
  },
  pro: {
    id: "pro",
    name: "Pro",
    maxPortfolios: Number.MAX_SAFE_INTEGER,
    maxPublished: Number.MAX_SAFE_INTEGER,
    aiCreditsPerMonth: Number.MAX_SAFE_INTEGER,
    pdfExportsPerMonth: Number.MAX_SAFE_INTEGER,
  },
};
