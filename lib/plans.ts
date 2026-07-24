import type { PlanId, PlanLimits } from "./types";

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    name: "Gratis",
    maxPortfolios: 1,
    maxPublished: 1,
    aiCreditsPerMonth: 20,
    pdfExportsPerMonth: 5,
  },
  pro: {
    id: "pro",
    name: "Pro",
    maxPortfolios: 10,
    maxPublished: 10,
    aiCreditsPerMonth: 200,
    pdfExportsPerMonth: 50,
  },
};

export function monthStartIso(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}
