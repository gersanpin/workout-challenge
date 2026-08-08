import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import styles from "./page.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return buildMetadata({
    locale: locale as Locale,
    pathname: `/${locale}`,
    title: t("homeTitle"),
    description: t("homeDescription"),
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  return (
    <section className={styles.hero}>
      <Image
        src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80"
        alt=""
        fill
        priority
        className={styles.heroImage}
        sizes="100vw"
      />
      <div className={styles.overlay} />
      <div className={`container ${styles.content}`}>
        <p className={`${styles.brand} fade-up`}>{t("brand")}</p>
        <h1 className={`${styles.headline} fade-up fade-up-delay`}>
          {t("headline")}
        </h1>
        <p className={`${styles.support} fade-up fade-up-delay-2`}>
          {t("support")}
        </p>
        <div className={`${styles.actions} fade-up fade-up-delay-2`}>
          <Link href="/projects" className="btn btn-primary">
            {t("exploreProjects")}
          </Link>
          <Link href="/contact" className="btn btn-ghost">
            {t("startProject")}
          </Link>
        </div>
      </div>
    </section>
  );
}
