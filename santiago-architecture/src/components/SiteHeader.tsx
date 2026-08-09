"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { InstagramLink } from "./InstagramLink";
import { LanguageSwitcher } from "./LanguageSwitcher";
import styles from "./SiteHeader.module.css";

const links = [
  { href: "/projects", key: "projects" as const },
  { href: "/about", key: "about" as const },
  { href: "/services", key: "services" as const },
  { href: "/contact", key: "contact" as const },
];

export function SiteHeader() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} onClick={() => setOpen(false)}>
          Santiago Architecture
        </Link>

        <div className={styles.desktopCluster}>
          <nav className={styles.desktopNav} aria-label="Primary">
            {links.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active ? styles.active : undefined}
                >
                  {t(link.key)}
                </Link>
              );
            })}
          </nav>
          <div className={styles.desktopTools}>
            <InstagramLink className={styles.socialDesktop} muted />
            <Suspense fallback={null}>
              <LanguageSwitcher className={styles.langDesktop} />
            </Suspense>
          </div>
        </div>

        <div className={styles.mobileActions}>
          <InstagramLink className={styles.socialMobile} muted />
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? t("close") : t("menu")}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`${styles.mobilePanel} ${open ? styles.mobileOpen : ""}`}
      >
        <nav className={styles.mobileNav} aria-label="Mobile">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>
        <div className={styles.mobileTools}>
          <InstagramLink muted large />
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
