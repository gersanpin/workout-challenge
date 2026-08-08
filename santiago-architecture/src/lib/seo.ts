import type { Metadata } from "next";
import { siteConfig } from "./site";
import type { Locale } from "@/i18n/routing";

type BuildMetadataInput = {
  locale: Locale;
  pathname: string;
  title: string;
  description: string;
};

export function buildMetadata({
  locale,
  pathname,
  title,
  description,
}: BuildMetadataInput): Metadata {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const pathWithoutLocale =
    normalizedPath === "/"
      ? ""
      : normalizedPath.replace(/^\/(en|es)/, "") || "";

  const enPath = `/en${pathWithoutLocale || ""}`;
  const esPath = `/es${pathWithoutLocale || ""}`;
  const canonicalPath = `/${locale}${pathWithoutLocale || ""}`;

  const canonical = `${siteConfig.url}${canonicalPath === "/en" || canonicalPath === "/es" ? canonicalPath : canonicalPath}`;
  const enUrl = `${siteConfig.url}${enPath === "/en" ? "/en" : enPath}`;
  const esUrl = `${siteConfig.url}${esPath === "/es" ? "/es" : esPath}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: enUrl,
        es: esUrl,
        "x-default": enUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: locale === "es" ? "es_ES" : "en_US",
      alternateLocale: locale === "es" ? ["en_US"] : ["es_ES"],
      type: "website",
    },
  };
}
