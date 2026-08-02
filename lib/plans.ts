import type { PlanId, PlanLimits } from "./types";

/**
 * Plan metadata only — NOT enforced anywhere in the app.
 * Limits are fully disabled until billing is introduced.
 */
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
    name: "Pro (ilimitado)",
    maxPortfolios: Number.MAX_SAFE_INTEGER,
    maxPublished: Number.MAX_SAFE_INTEGER,
    aiCreditsPerMonth: Number.MAX_SAFE_INTEGER,
    pdfExportsPerMonth: Number.MAX_SAFE_INTEGER,
  },
};

/** Always false for now — keep helpers from accidentally gating UX. */
export function limitsEnabled(): boolean {
  return false;
}
