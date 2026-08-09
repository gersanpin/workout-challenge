"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { InstagramLink } from "./InstagramLink";
import { siteConfig } from "@/lib/site";
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

type MeetingState = {
  date: string;
  time: string;
  notes: string;
};

type Step = "idle" | "form" | "meeting" | "done";

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

const INITIAL_MEETING: MeetingState = {
  date: "",
  time: "",
  notes: "",
};

type Props = {
  studioEmail: string;
};

export function ContactInquiryForm({ studioEmail }: Props) {
  const t = useTranslations("Contact");
  const searchParams = useSearchParams();
  const shouldOpenForm = searchParams.get("start") === "1";
  const shouldOpenMeeting = searchParams.get("meeting") === "1";

  const [step, setStep] = useState<Step>(
    shouldOpenForm ? "form" : shouldOpenMeeting ? "meeting" : "idle",
  );
  const [fromInquiry, setFromInquiry] = useState(false);
  const [values, setValues] = useState<FormState>(INITIAL);
  const [meeting, setMeeting] = useState<MeetingState>(INITIAL_MEETING);
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

  function updateMeeting<K extends keyof MeetingState>(
    key: K,
    value: MeetingState[K],
  ) {
    setMeeting((current) => ({ ...current, [key]: value }));
  }

  function handleInquirySubmit(event: FormEvent<HTMLFormElement>) {
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
      setFromInquiry(true);
      setStep("meeting");
    }, 250);
  }

  function handleMeetingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);

    const subject = t("meeting.mailSubject", { name: values.name });
    const body = [
      fromInquiry ? t("meeting.mailIntro") : t("meeting.mailIntroDirect"),
      "",
      `${t("fields.name")}: ${values.name}`,
      `${t("fields.email")}: ${values.email}`,
      values.phone ? `${t("fields.phone")}: ${values.phone}` : null,
      "",
      `${t("meeting.fields.date")}: ${meeting.date}`,
      `${t("meeting.fields.time")}: ${meeting.time}`,
      meeting.notes ? `${t("meeting.fields.notes")}:\n${meeting.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const mailto = `mailto:${studioEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    window.setTimeout(() => {
      setSending(false);
      setStep("done");
    }, 250);
  }

  function openMeetingDirect() {
    setFromInquiry(false);
    setStep("meeting");
  }

  function resetAll() {
    setValues(INITIAL);
    setMeeting(INITIAL_MEETING);
    setFromInquiry(false);
    setStep("idle");
  }

  if (step === "done") {
    return (
      <div className={styles.wrap}>
        <div className={styles.success}>
          <p>{t("meeting.done")}</p>
          <button type="button" className="btn btn-line" onClick={resetAll}>
            {t("sendAnother")}
          </button>
        </div>
        <ContactMeta studioEmail={studioEmail} />
      </div>
    );
  }

  if (step === "meeting") {
    const meetingForm = (
      <div className={styles.meetingPrompt}>
        <h2 className={styles.meetingTitle}>{t("meeting.title")}</h2>
        <p className={styles.meetingLead}>{t("meeting.lead")}</p>

        {siteConfig.meetingUrl ? (
          <a
            className="btn btn-primary"
            href={siteConfig.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("meeting.openCalendar")}
          </a>
        ) : null}

        <form className={styles.form} onSubmit={handleMeetingSubmit}>
          {!fromInquiry ? (
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
          ) : null}

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>{t("meeting.fields.date")}</span>
              <input
                className={styles.input}
                type="date"
                name="meetingDate"
                required
                value={meeting.date}
                onChange={(event) => updateMeeting("date", event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>{t("meeting.fields.time")}</span>
              <input
                className={styles.input}
                type="time"
                name="meetingTime"
                required
                value={meeting.time}
                onChange={(event) => updateMeeting("time", event.target.value)}
              />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>{t("meeting.fields.notes")}</span>
            <textarea
              className={styles.textarea}
              name="meetingNotes"
              placeholder={t("meeting.placeholders.notes")}
              value={meeting.notes}
              onChange={(event) => updateMeeting("notes", event.target.value)}
            />
          </label>

          <div className={styles.actions}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending}
            >
              {sending ? t("meeting.sending") : t("meeting.submit")}
            </button>
            <button
              type="button"
              className="btn btn-line"
              onClick={() => (fromInquiry ? setStep("done") : setStep("idle"))}
            >
              {fromInquiry ? t("meeting.skip") : t("cancel")}
            </button>
          </div>
        </form>
      </div>
    );

    return (
      <div className={styles.wrap}>
        {fromInquiry ? (
          <div className={styles.success}>
            <p>{t("success")}</p>
            {meetingForm}
          </div>
        ) : (
          meetingForm
        )}
        <ContactMeta studioEmail={studioEmail} />
      </div>
    );
  }

  if (step === "idle") {
    return (
      <div className={styles.wrap}>
        <div className={styles.ctaRow}>
          <button
            type="button"
            className={`btn btn-primary ${styles.start}`}
            onClick={() => setStep("form")}
          >
            {t("cta")}
          </button>
          <button
            type="button"
            className={`btn btn-line ${styles.start}`}
            onClick={openMeetingDirect}
          >
            {t("ctaMeeting")}
          </button>
        </div>
        <ContactMeta studioEmail={studioEmail} />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={handleInquirySubmit}>
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
            onClick={() => setStep("idle")}
          >
            {t("cancel")}
          </button>
        </div>
      </form>
      <ContactMeta studioEmail={studioEmail} />
    </div>
  );
}

function ContactMeta({ studioEmail }: { studioEmail: string }) {
  return (
    <div className={styles.meta}>
      <p className={styles.email}>{studioEmail}</p>
      <InstagramLink muted large />
      <span className={styles.handle}>@{siteConfig.instagram.handle}</span>
    </div>
  );
}
