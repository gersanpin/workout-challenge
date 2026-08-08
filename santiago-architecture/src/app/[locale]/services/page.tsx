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
    pathname: `/${locale}/services`,
    title: t("servicesTitle"),
    description: t("servicesDescription"),
  });
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Services");

  const items = ["architecture", "interiors", "masterplan"] as const;

  return (
    <div className="page">
      <div className="container">
        <h1 className="section-title">{t("title")}</h1>
        <p className="section-lead">{t("lead")}</p>
        <ul className={styles.serviceList}>
          {items.map((item) => (
            <li key={item}>
              <h2>{t(`items.${item}.title`)}</h2>
              <p>{t(`items.${item}.body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
