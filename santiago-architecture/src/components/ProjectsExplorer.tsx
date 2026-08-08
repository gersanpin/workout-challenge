"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  categories,
  filterProjects,
  type Category,
  type Project,
} from "@/data/projects";
import { ProjectGrid } from "./ProjectGrid";
import { ProjectGlobe } from "./ProjectGlobe";
import styles from "./ProjectsExplorer.module.css";

type ViewMode = "grid" | "globe";

type Props = {
  projects: Project[];
};

export function ProjectsExplorer({ projects }: Props) {
  const t = useTranslations("Projects");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view = (searchParams.get("view") === "globe" ? "globe" : "grid") as ViewMode;
  const category = searchParams.get("category") ?? "all";
  const selectedSlug = searchParams.get("project");

  const filtered = useMemo(() => {
    if (category === "all") return projects;
    return filterProjects(category);
  }, [category, projects]);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (
          value == null ||
          value === "" ||
          (key === "category" && value === "all") ||
          (key === "view" && value === "grid")
        ) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className={styles.explorer}>
      <div className={styles.toolbar}>
        <div className={styles.views} role="tablist" aria-label="View mode">
          <button
            type="button"
            className={view === "grid" ? styles.active : undefined}
            onClick={() => updateParams({ view: "grid" })}
          >
            {t("gridView")}
          </button>
          <button
            type="button"
            className={view === "globe" ? styles.active : undefined}
            onClick={() => updateParams({ view: "globe" })}
          >
            {t("globeView")}
          </button>
        </div>

        <div className={styles.filters} role="listbox" aria-label="Category">
          <button
            type="button"
            className={category === "all" ? styles.active : undefined}
            onClick={() => updateParams({ category: "all", project: null })}
          >
            {t("filters.all")}
          </button>
          {categories.map((item: Category) => (
            <button
              key={item}
              type="button"
              className={category === item ? styles.active : undefined}
              onClick={() => updateParams({ category: item, project: null })}
            >
              {t(`filters.${item}`)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.stage} key={view}>
        {view === "grid" ? (
          <ProjectGrid projects={filtered} />
        ) : (
          <ProjectGlobe
            projects={filtered}
            selectedSlug={selectedSlug}
            onSelect={(slug) => updateParams({ project: slug })}
          />
        )}
      </div>
    </div>
  );
}
