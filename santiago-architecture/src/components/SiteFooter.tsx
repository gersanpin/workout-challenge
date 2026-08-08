import { useTranslations } from "next-intl";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <span className={styles.brand}>Santiago Architecture</span>
        <span>
          © {year}. {t("rights")}
        </span>
      </div>
    </footer>
  );
}
