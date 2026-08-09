"use client";

import NextLink from "next/link";
import { siteConfig } from "@/lib/site";
import styles from "./InstagramLink.module.css";

type Props = {
  className?: string;
  muted?: boolean;
  large?: boolean;
  label?: string;
};

export function InstagramLink({
  className,
  muted = false,
  large = false,
  label,
}: Props) {
  const classes = [
    styles.link,
    muted ? styles.muted : "",
    large ? styles.large : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <NextLink
      className={classes}
      href={siteConfig.instagram.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label ?? `Instagram @${siteConfig.instagram.handle}`}
      title={`@${siteConfig.instagram.handle}`}
      prefetch={false}
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.9.2 2.4.4.6.2 1 .5 1.5 1 .4.4.7.9 1 1.5.2.5.4 1.2.4 2.4.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.9-.4 2.4-.2.6-.5 1-1 1.5-.4.4-.9.7-1.5 1-.5.2-1.2.4-2.4.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.2-2.4-.4-.6-.2-1-.5-1.5-1-.4-.4-.7-.9-1-1.5-.2-.5-.4-1.2-.4-2.4C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.9.4-2.4.2-.6.5-1 1-1.5.4-.4.9-.7 1.5-1 .5-.2 1.2-.4 2.4-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.2 0-3.5 0-4.8.1-.9 0-1.5.2-1.8.3-.5.2-.8.4-1.1.7-.3.3-.5.6-.7 1.1-.1.3-.3.9-.3 1.8-.1 1.2-.1 1.6-.1 4.8s0 3.5.1 4.8c0 .9.2 1.5.3 1.8.2.5.4.8.7 1.1.3.3.6.5 1.1.7.3.1.9.3 1.8.3 1.2.1 1.6.1 4.8.1s3.5 0 4.8-.1c.9 0 1.5-.2 1.8-.3.5-.2.8-.4 1.1-.7.3-.3.5-.6.7-1.1.1-.3.3-.9.3-1.8.1-1.2.1-1.6.1-4.8s0-3.5-.1-4.8c0-.9-.2-1.5-.3-1.8-.2-.5-.4-.8-.7-1.1-.3-.3-.6-.5-1.1-.7-.3-.1-.9-.3-1.8-.3-1.3-.1-1.6-.1-4.8-.1Zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 1.8a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Zm5-2a1.2 1.2 0 1 1 0 2.3 1.2 1.2 0 0 1 0-2.3Z"
        />
      </svg>
    </NextLink>
  );
}
