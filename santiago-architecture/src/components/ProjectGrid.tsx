"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getLocalized,
  type LocaleCode,
  type Project,
} from "@/data/projects";
import styles from "./ProjectGrid.module.css";

/** Masonry-like roles: mixed portrait / landscape, no center seam. */
const TILE_CYCLE = [
  "tileA",
  "tileB",
  "tileC",
  "tileD",
  "tileE",
  "tileF",
  "tileG",
  "tileH",
] as const;

type Props = {
  projects: Project[];
};

export function ProjectGrid({ projects }: Props) {
  const t = useTranslations("Projects");
  const locale = useLocale() as LocaleCode;

  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.background = "#fff";
    body.style.background = "#fff";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      html.style.background = "";
      body.style.background = "";
    };
  }, []);

  if (projects.length === 0) {
    return <p className={styles.empty}>{t("empty")}</p>;
  }

  return (
    <ul className={styles.collage}>
      {projects.map((project, index) => {
        const tile = TILE_CYCLE[index % TILE_CYCLE.length];
        return (
          <li key={project.slug} className={styles[tile]}>
            <Link href={`/projects/${project.slug}`} className={styles.item}>
              <Image
                src={project.images[0]}
                alt={getLocalized(project.name, locale)}
                fill
                sizes="(max-width: 700px) 70vw, (max-width: 1100px) 50vw, 40vw"
                className={styles.image}
                priority={index < 4}
              />
              <div className={styles.meta}>
                <h2>{getLocalized(project.name, locale)}</h2>
                <p>
                  {getLocalized(project.location, locale)} · {project.year}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
