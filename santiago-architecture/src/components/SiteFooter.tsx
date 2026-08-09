"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const pathname = usePathname();
  const year = new Date().getFullYear();

  // Home is a single locked screen — no footer below the fold.
  if (pathname === "/") return null;

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.brand}>Santiago Architecture</span>
        <span>
          © {year}. {t("rights")}
        </span>
      </div>
    </footer>
  );
}
