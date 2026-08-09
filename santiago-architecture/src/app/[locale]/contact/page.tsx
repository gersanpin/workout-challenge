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
    pathname: `/${locale}/contact`,
    title: t("contactTitle"),
    description: t("contactDescription"),
  });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");

  return (
    <div className={styles.stage}>
      <div className={styles.shell}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.lead}>{t("lead")}</p>
        <p className={styles.body}>{t("body")}</p>
        <div className={styles.contactActions}>
          <a
            className={`btn btn-primary ${styles.cta}`}
            href={`mailto:${t("email")}`}
          >
            {t("cta")}
          </a>
          <p className={styles.email}>{t("email")}</p>
        </div>
      </div>
    </div>
  );
}
