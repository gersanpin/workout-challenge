"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import styles from "./LanguageSwitcher.module.css";

type Props = {
  className?: string;
};

export function LanguageSwitcher({ className }: Props) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function switchLocale(nextLocale: Locale) {
    if (nextLocale === locale) return;
    const query = searchParams.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    router.replace(href, { locale: nextLocale });
  }

  return (
    <div className={`${styles.switcher} ${className ?? ""}`.trim()} aria-label="Language">
      <button
        type="button"
        className={locale === "en" ? styles.active : undefined}
        onClick={() => switchLocale("en")}
        aria-current={locale === "en" ? "true" : undefined}
      >
        EN
      </button>
      <span className={styles.sep} aria-hidden="true">
        /
      </span>
      <button
        type="button"
        className={locale === "es" ? styles.active : undefined}
        onClick={() => switchLocale("es")}
        aria-current={locale === "es" ? "true" : undefined}
      >
        ES
      </button>
    </div>
  );
}
