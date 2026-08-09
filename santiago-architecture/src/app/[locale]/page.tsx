import { existsSync } from "node:fs";
import path from "node:path";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeHero } from "@/components/HomeHero";
import { projects } from "@/data/projects";
import { buildMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

function isAvailableCover(src: string) {
  if (src.startsWith("http://") || src.startsWith("https://")) return true;
  if (!src.startsWith("/")) return false;
  return existsSync(path.join(process.cwd(), "public", src.slice(1)));
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return buildMetadata({
    locale: locale as Locale,
    pathname: `/${locale}`,
    title: t("homeTitle"),
    description: t("homeDescription"),
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const covers = projects
    .map((project) => project.images[0])
    .filter((src): src is string => Boolean(src) && isAvailableCover(src));

  return <HomeHero covers={covers} />;
}
