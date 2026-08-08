import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import styles from "../content.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return buildMetadata({
    locale: locale as Locale,
    pathname: `/${locale}/about`,
    title: t("aboutTitle"),
    description: t("aboutDescription"),
  });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");

  return (
    <div className="page">
      <div className={`container ${styles.narrow}`}>
        <h1 className="section-title">{t("title")}</h1>
        <p className="section-lead">{t("lead")}</p>
        <p className={styles.body}>{t("body")}</p>
      </div>
    </div>
  );
}
