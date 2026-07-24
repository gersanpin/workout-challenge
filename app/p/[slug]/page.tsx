import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PortfolioPreview } from "@/components/templates/PortfolioPreview";
import type { Portfolio, PortfolioContent, TemplateId } from "@/lib/types";

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error || !data) notFound();

  const portfolio = data as Portfolio;

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-xl text-ink-700">
          Arquitecta
        </Link>
        <p className="text-xs uppercase tracking-wider text-ink-500">
          Portafolio público
        </p>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 md:px-6">
        <PortfolioPreview
          content={portfolio.content as PortfolioContent}
          templateId={portfolio.template_id as TemplateId}
        />
      </main>
    </div>
  );
}
