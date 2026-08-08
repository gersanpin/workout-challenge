import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { projects } from "@/data/projects";
import { ProjectsExplorer } from "@/components/ProjectsExplorer";
import { buildMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return buildMetadata({
    locale: locale as Locale,
    pathname: `/${locale}/projects`,
    title: t("projectsTitle"),
    description: t("projectsDescription"),
  });
}

export default async function ProjectsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Projects");

  return (
    <div className="page">
      <div className="container">
        <h1 className="section-title">{t("title")}</h1>
        <p className="section-lead" style={{ marginBottom: "2.5rem" }}>
          {t("selected")}
        </p>
        <Suspense fallback={null}>
          <ProjectsExplorer projects={projects} />
        </Suspense>
      </div>
    </div>
  );
}
