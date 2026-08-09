"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./ProjectGallery.module.css";

type Props = {
  images: string[];
  alt: string;
};

export function ProjectGallery({ images, alt }: Props) {
  const t = useTranslations("Projects");
  const [index, setIndex] = useState(0);
  const total = images.length;

  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return;
      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  const previous = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, previous]);

  if (total === 0) return null;

  return (
    <div className={styles.gallery}>
      <div className={styles.stage}>
        {images.map((src, i) => (
          <div
            key={src}
            className={`${styles.slide} ${i === index ? styles.active : ""}`}
            aria-hidden={i !== index}
          >
            <Image
              src={src}
              alt={`${alt} — ${i + 1}`}
              fill
              priority={i === 0}
              sizes="100vw"
              className={styles.image}
            />
          </div>
        ))}

        {total > 1 ? (
          <>
            <button
              type="button"
              className={`${styles.nav} ${styles.prev}`}
              onClick={previous}
              aria-label={t("previousImage")}
            >
              ←
            </button>
            <button
              type="button"
              className={`${styles.nav} ${styles.next}`}
              onClick={next}
              aria-label={t("nextImage")}
            >
              →
            </button>
          </>
        ) : null}
      </div>

      <div className={styles.controls}>
        <p className={styles.counter}>
          {index + 1} / {total}
        </p>
        {total > 1 ? (
          <div className={styles.dots} role="tablist" aria-label={t("gallery")}>
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={i === index ? styles.dotActive : undefined}
                onClick={() => goTo(i)}
                aria-label={`${t("image")} ${i + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
