"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getLocalized,
  type LocaleCode,
  type Project,
} from "@/data/projects";
import styles from "./ProjectGrid.module.css";

type Props = {
  projects: Project[];
};

export function ProjectGrid({ projects }: Props) {
  const t = useTranslations("Projects");
  const locale = useLocale() as LocaleCode;

  if (projects.length === 0) {
    return <p className={styles.empty}>{t("empty")}</p>;
  }

  return (
    <ul className={styles.grid}>
      {projects.map((project) => (
        <li key={project.slug}>
          <Link href={`/projects/${project.slug}`} className={styles.item}>
            <div className={styles.media}>
              <Image
                src={project.images[0]}
                alt={getLocalized(project.name, locale)}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className={styles.image}
              />
            </div>
            <div className={styles.meta}>
              <h2>{getLocalized(project.name, locale)}</h2>
              <p>
                {getLocalized(project.location, locale)} · {project.year}
              </p>
              <span className={styles.cta}>{t("viewProject")}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
