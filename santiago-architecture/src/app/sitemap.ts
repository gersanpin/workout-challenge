import type { MetadataRoute } from "next";
import { projects } from "@/data/projects";
import { siteConfig } from "@/lib/site";

const staticPaths = ["", "/projects", "/about", "/services", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ["en", "es"] as const;
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of staticPaths) {
      entries.push({
        url: `${siteConfig.url}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : 0.7,
        alternates: {
          languages: {
            en: `${siteConfig.url}/en${path}`,
            es: `${siteConfig.url}/es${path}`,
            "x-default": `${siteConfig.url}/en${path}`,
          },
        },
      });
    }

    for (const project of projects) {
      const path = `/projects/${project.slug}`;
      entries.push({
        url: `${siteConfig.url}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: {
          languages: {
            en: `${siteConfig.url}/en${path}`,
            es: `${siteConfig.url}/es${path}`,
            "x-default": `${siteConfig.url}/en${path}`,
          },
        },
      });
    }
  }

  return entries;
}
