import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getLocalized,
  getNextProject,
  getProjectBySlug,
  projects,
  type LocaleCode,
} from "@/data/projects";
import { buildMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import styles from "./page.module.css";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  return projects.flatMap((project) =>
    (["en", "es"] as const).map((locale) => ({
      locale,
      slug: project.slug,
    })),
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};

  const lang = locale as LocaleCode;
  return buildMetadata({
    locale: locale as Locale,
    pathname: `/${locale}/projects/${slug}`,
    title: getLocalized(project.seoTitle, lang),
    description: getLocalized(project.seoDescription, lang),
  });
}

export default async function ProjectDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const t = await getTranslations("Projects");
  const lang = locale as LocaleCode;
  const next = getNextProject(slug);

  return (
    <article className="page">
      <div className="container">
        <header className={styles.header}>
          <p className={styles.kicker}>{t(`filters.${project.category}`)}</p>
          <h1 className="section-title">{getLocalized(project.name, lang)}</h1>
          <p className="section-lead">{getLocalized(project.description, lang)}</p>
        </header>

        <dl className={styles.meta}>
          <div>
            <dt>{t("labels.location")}</dt>
            <dd>{getLocalized(project.location, lang)}</dd>
          </div>
          <div>
            <dt>{t("labels.year")}</dt>
            <dd>{project.year}</dd>
          </div>
          <div>
            <dt>{t("labels.area")}</dt>
            <dd>{project.area}</dd>
          </div>
          <div>
            <dt>{t("labels.typology")}</dt>
            <dd>{t(`filters.${project.category}`)}</dd>
          </div>
        </dl>

        <div className={styles.gallery}>
          {project.images.map((src) => (
            <div key={src} className={styles.frame}>
              <Image
                src={src}
                alt={getLocalized(project.name, lang)}
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
                className={styles.image}
              />
            </div>
          ))}
        </div>

        {next ? (
          <div className={styles.next}>
            <Link href={`/projects/${next.slug}`} className="btn btn-line">
              {t("nextProject")}: {getLocalized(next.name, lang)}
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}
