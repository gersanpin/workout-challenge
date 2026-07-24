import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import { countUsage, getUserPlanId } from "@/lib/usage";
import type { PlanId, Portfolio } from "@/lib/types";
import { SignOutButton } from "@/components/auth/SignOutButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: portfolios } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const planId = await getUserPlanId(user.id);
  const plan = PLANS[planId];
  const aiUsed = await countUsage(user.id, "ai");
  const pdfUsed = await countUsage(user.id, "pdf_export");

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/" className="font-display text-2xl">
            Arquitecta
          </Link>
          <p className="mt-1 text-sm text-ink-600">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/new"
            className="bg-ink-950 px-4 py-2 text-sm text-ink-50"
          >
            Nuevo portafolio
          </Link>
          <SignOutButton />
        </div>
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <UsageCard
          label="Plan"
          value={plan.name}
          hint={planId === "free" ? "Límites del plan gratis" : "Plan Pro"}
        />
        <UsageCard
          label="IA este mes"
          value={`${aiUsed} / ${plan.aiCreditsPerMonth}`}
          hint="Créditos de redacción"
        />
        <UsageCard
          label="PDF este mes"
          value={`${pdfUsed} / ${plan.pdfExportsPerMonth}`}
          hint="Exportaciones"
        />
      </section>

      <section className="mt-12">
        <h1 className="text-xl font-medium">Tus portafolios</h1>
        {!portfolios?.length ? (
          <div className="mt-6 border border-dashed border-ink-300 bg-white/40 p-10 text-center">
            <p className="text-ink-700">Aún no tienes un portafolio.</p>
            <Link
              href="/dashboard/new"
              className="mt-4 inline-block bg-ink-950 px-4 py-2 text-sm text-ink-50"
            >
              Empezar ahora
            </Link>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-ink-200 border border-ink-200 bg-white/70">
            {(portfolios as Portfolio[]).map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <Link
                    href={`/dashboard/${p.id}`}
                    className="font-medium hover:underline"
                  >
                    {p.title}
                  </Link>
                  <p className="text-sm text-ink-500">
                    Plantilla {p.template_id}
                    {p.published && p.slug
                      ? ` · Publicado /p/${p.slug}`
                      : " · Borrador"}
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <Link
                    href={`/dashboard/${p.id}`}
                    className="border border-ink-300 px-3 py-1.5"
                  >
                    Editar
                  </Link>
                  {p.published && p.slug ? (
                    <Link
                      href={`/p/${p.slug}`}
                      className="border border-ink-300 px-3 py-1.5"
                      target="_blank"
                    >
                      Ver link
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-xs text-ink-500">
        Plan actual: <PlanBadge planId={planId} /> · Para Pro, actualiza{" "}
        <code className="bg-ink-100 px-1">profiles.plan_id</code> en Supabase
        (Stripe llega después).
      </p>
    </div>
  );
}

function UsageCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="border border-ink-200 bg-white/60 px-4 py-4">
      <p className="text-xs uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-medium">{value}</p>
      <p className="mt-1 text-xs text-ink-500">{hint}</p>
    </div>
  );
}

function PlanBadge({ planId }: { planId: PlanId }) {
  return <span className="font-medium text-ink-800">{PLANS[planId].name}</span>;
}
