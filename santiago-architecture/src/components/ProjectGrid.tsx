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

type CollageSize =
  | "hero"
  | "tall"
  | "square"
  | "wide"
  | "small"
  | "portrait"
  | "banner"
  | "tiny";

/** Mixed orientations so the dense grid feels like a varied collage. */
const SIZE_CYCLE: CollageSize[] = [
  "hero",
  "portrait",
  "small",
  "tall",
  "wide",
  "square",
  "tiny",
  "banner",
  "portrait",
  "small",
  "square",
  "wide",
];

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
    <ul className={styles.collage}>
      {projects.map((project, index) => {
        const size = SIZE_CYCLE[index % SIZE_CYCLE.length];
        return (
          <li key={project.slug} className={styles[size]}>
            <Link href={`/projects/${project.slug}`} className={styles.item}>
              <Image
                src={project.images[0]}
                alt={getLocalized(project.name, locale)}
                fill
                sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 40vw"
                className={styles.image}
                priority={index < 3}
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
