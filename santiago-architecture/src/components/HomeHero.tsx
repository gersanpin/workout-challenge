"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "./HomeHero.module.css";

const INTERVAL_MS = 5000;

type Props = {
  covers: string[];
};

export function HomeHero({ covers }: Props) {
  const t = useTranslations("Home");
  const slides = covers.length > 0 ? covers : ["/projects/casa-manglar/01.jpg"];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;

    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [slides.length]);

  return (
    <section className={styles.hero}>
      <div className={styles.slides} aria-hidden="true">
        {slides.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            priority={index === 0}
            className={`${styles.heroImage} ${
              index === active ? styles.heroImageActive : ""
            }`}
            sizes="100vw"
          />
        ))}
      </div>
      <div className={styles.overlay} />
      <div className={styles.content}>
        <div className={`${styles.copy} fade-up`}>
          <p className={styles.brand}>{t("brand")}</p>
          <h1 className={`${styles.headline} fade-up fade-up-delay`}>
            {t("headline")}
          </h1>
          <p className={`${styles.support} fade-up fade-up-delay-2`}>
            {t("support")}
          </p>
        </div>
        <div className={`${styles.actions} fade-up fade-up-delay-2`}>
          <Link href="/projects" className="btn btn-primary">
            {t("exploreProjects")}
          </Link>
          <Link href="/contact?start=1" className="btn btn-ghost">
            {t("startProject")}
          </Link>
        </div>
      </div>
    </section>
  );
}
