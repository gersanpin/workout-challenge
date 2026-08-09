"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import styles from "./ContactInquiryForm.module.css";

type FormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  projectType: string;
  location: string;
  timeline: string;
  message: string;
};

const INITIAL: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  projectType: "residential",
  location: "",
  timeline: "",
  message: "",
};

type Props = {
  studioEmail: string;
};

export function ContactInquiryForm({ studioEmail }: Props) {
  const t = useTranslations("Contact");
  const searchParams = useSearchParams();
  const shouldOpen = searchParams.get("start") === "1";

  const [open, setOpen] = useState(shouldOpen);
  const [values, setValues] = useState<FormState>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const projectTypes = useMemo(
    () =>
      [
        "residential",
        "hospitality",
        "masterplan",
        "commercial",
        "interior",
        "other",
      ] as const,
    [],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);

    const typeLabel = t(`types.${values.projectType}`);
    const subject = t("mailSubject", { name: values.name });
    const body = [
      t("mailIntro"),
      "",
      `${t("fields.name")}: ${values.name}`,
      `${t("fields.email")}: ${values.email}`,
      values.phone ? `${t("fields.phone")}: ${values.phone}` : null,
      values.company ? `${t("fields.company")}: ${values.company}` : null,
      `${t("fields.projectType")}: ${typeLabel}`,
      values.location ? `${t("fields.location")}: ${values.location}` : null,
      values.timeline ? `${t("fields.timeline")}: ${values.timeline}` : null,
      "",
      `${t("fields.message")}:`,
      values.message,
    ]
      .filter(Boolean)
      .join("\n");

    const mailto = `mailto:${studioEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    window.setTimeout(() => {
      setSending(false);
      setSubmitted(true);
    }, 250);
  }

  if (submitted) {
    return (
      <div className={styles.wrap}>
        <div className={styles.success}>
          <p>{t("success")}</p>
          <button
            type="button"
            className="btn btn-line"
            onClick={() => {
              setSubmitted(false);
              setValues(INITIAL);
              setOpen(true);
            }}
          >
            {t("sendAnother")}
          </button>
        </div>
        <p className={styles.email}>{studioEmail}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className={styles.wrap}>
        <button
          type="button"
          className={`btn btn-primary ${styles.start}`}
          onClick={() => setOpen(true)}
        >
          {t("cta")}
        </button>
        <p className={styles.email}>{studioEmail}</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>{t("fields.name")}</span>
            <input
              className={styles.input}
              name="name"
              autoComplete="name"
              required
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("fields.email")}</span>
            <input
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              required
              value={values.email}
              onChange={(event) => update("email", event.target.value)}
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>{t("fields.phone")}</span>
            <input
              className={styles.input}
              type="tel"
              name="phone"
              autoComplete="tel"
              value={values.phone}
              onChange={(event) => update("phone", event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("fields.company")}</span>
            <input
              className={styles.input}
              name="company"
              autoComplete="organization"
              value={values.company}
              onChange={(event) => update("company", event.target.value)}
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>{t("fields.projectType")}</span>
            <select
              className={styles.select}
              name="projectType"
              value={values.projectType}
              onChange={(event) => update("projectType", event.target.value)}
            >
              {projectTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("fields.location")}</span>
            <input
              className={styles.input}
              name="location"
              value={values.location}
              onChange={(event) => update("location", event.target.value)}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>{t("fields.timeline")}</span>
          <input
            className={styles.input}
            name="timeline"
            placeholder={t("placeholders.timeline")}
            value={values.timeline}
            onChange={(event) => update("timeline", event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t("fields.message")}</span>
          <textarea
            className={styles.textarea}
            name="message"
            required
            placeholder={t("placeholders.message")}
            value={values.message}
            onChange={(event) => update("message", event.target.value)}
          />
        </label>

        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? t("sending") : t("submit")}
          </button>
          <button
            type="button"
            className="btn btn-line"
            onClick={() => setOpen(false)}
          >
            {t("cancel")}
          </button>
        </div>
      </form>
      <p className={styles.email}>{studioEmail}</p>
    </div>
  );
}
