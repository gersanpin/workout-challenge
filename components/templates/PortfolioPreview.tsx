import type { ReactNode } from "react";
import type { PortfolioContent, TemplateId } from "@/lib/types";

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function PortfolioPreview({
  content,
  templateId,
  className,
}: {
  content: PortfolioContent;
  templateId: TemplateId;
  className?: string;
}) {
  if (templateId === "editorial") {
    return (
      <article
        className={cx(
          "overflow-hidden rounded-sm border border-ink-800 bg-ink-950 text-ink-50",
          className,
        )}
      >
        <header className="border-b border-ink-800 px-8 py-10 md:px-12">
          <p className="font-display text-4xl tracking-tight md:text-5xl">
            {content.fullName || "Tu nombre"}
          </p>
          <p className="mt-3 text-ink-300">{content.headline}</p>
          <p className="mt-4 text-sm text-ink-400">
            {[content.email, content.phone, content.location]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </header>
        <div className="grid gap-10 px-8 py-10 md:grid-cols-[1.1fr_0.9fr] md:px-12">
          <div className="space-y-8">
            <SectionDark title="Perfil">{content.summary}</SectionDark>
            <SectionDark title="Experiencia">
              {content.experience.map((ex) => (
                <div key={ex.id} className="mb-5">
                  <p className="font-medium">
                    {ex.role} — {ex.company}
                  </p>
                  <p className="text-sm text-ink-400">
                    {[ex.startDate, ex.endDate].filter(Boolean).join(" – ")}
                  </p>
                  <p className="mt-1 text-ink-200">{ex.description}</p>
                </div>
              ))}
            </SectionDark>
          </div>
          <div className="space-y-8">
            <SectionDark title="Habilidades">
              <div className="flex flex-wrap gap-2">
                {content.skills.map((s) => (
                  <span
                    key={s}
                    className="border border-ink-700 px-2 py-1 text-xs text-ink-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </SectionDark>
            <SectionDark title="Formación">
              {content.education.map((ed) => (
                <div key={ed.id} className="mb-3">
                  <p className="font-medium">
                    {ed.degree} — {ed.school}
                  </p>
                  <p className="text-sm text-ink-400">{ed.year}</p>
                </div>
              ))}
            </SectionDark>
          </div>
        </div>
        {content.projects.length > 0 && (
          <div className="border-t border-ink-800 px-8 py-10 md:px-12">
            <p className="mb-6 text-xs uppercase tracking-[0.2em] text-clay-400">
              Proyectos
            </p>
            <div className="grid gap-8 md:grid-cols-2">
              {content.projects.map((p) => (
                <div key={p.id}>
                  {p.imageUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrls[0]}
                      alt={p.title}
                      className="mb-3 aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="mb-3 aspect-[4/3] w-full bg-ink-900" />
                  )}
                  <p className="font-display text-2xl">{p.title}</p>
                  <p className="text-sm text-ink-400">
                    {[p.year, p.location, p.typology].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-2 text-ink-200">{p.description}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink-300">
                    {p.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    );
  }

  if (templateId === "atelier") {
    return (
      <article
        className={cx(
          "overflow-hidden rounded-sm border border-clay-500/40 bg-[#f3eee6] text-ink-950",
          className,
        )}
      >
        <header className="px-8 py-12 md:px-14">
          <p className="text-xs uppercase tracking-[0.25em] text-clay-600">
            Atelier
          </p>
          <h1 className="mt-3 font-display text-5xl text-clay-600 md:text-6xl">
            {content.fullName || "Tu nombre"}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-700">{content.headline}</p>
          <p className="mt-6 max-w-2xl leading-relaxed text-ink-800">
            {content.summary}
          </p>
        </header>
        <div className="grid gap-8 border-t border-ink-200/80 px-8 py-10 md:grid-cols-3 md:px-14">
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-clay-600">
              Contacto
            </h2>
            <div className="mt-3 space-y-1 text-sm text-ink-700">
              <p>{content.email}</p>
              <p>{content.phone}</p>
              <p>{content.location}</p>
              <p>{content.website}</p>
            </div>
            <h2 className="mt-8 text-xs uppercase tracking-[0.2em] text-clay-600">
              Skills
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              {content.skills.join(" · ")}
            </p>
          </div>
          <div className="md:col-span-2 space-y-8">
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] text-clay-600">
                Experiencia
              </h2>
              {content.experience.map((ex) => (
                <div key={ex.id} className="mt-4 border-l-2 border-clay-500 pl-4">
                  <p className="font-medium">
                    {ex.role} — {ex.company}
                  </p>
                  <p className="text-sm text-ink-600">{ex.description}</p>
                </div>
              ))}
            </div>
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] text-clay-600">
                Formación
              </h2>
              {content.education.map((ed) => (
                <p key={ed.id} className="mt-2 text-sm">
                  <span className="font-medium">{ed.degree}</span> — {ed.school}{" "}
                  <span className="text-ink-500">{ed.year}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
        {content.projects.length > 0 && (
          <div className="border-t border-ink-200/80 px-8 py-10 md:px-14">
            <h2 className="text-xs uppercase tracking-[0.2em] text-clay-600">
              Obra y proyectos
            </h2>
            <div className="mt-6 space-y-10">
              {content.projects.map((p) => (
                <div
                  key={p.id}
                  className="grid gap-6 md:grid-cols-2 md:items-start"
                >
                  {p.imageUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrls[0]}
                      alt={p.title}
                      className="aspect-[5/4] w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-[5/4] w-full bg-ink-200/60" />
                  )}
                  <div>
                    <p className="font-display text-3xl">{p.title}</p>
                    <p className="mt-1 text-sm text-ink-600">
                      {[p.year, p.location, p.typology]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-3 leading-relaxed">{p.description}</p>
                    <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-ink-700">
                      {p.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    );
  }

  // minimal
  return (
    <article
      className={cx(
        "overflow-hidden rounded-sm border border-ink-200 bg-white text-ink-950",
        className,
      )}
    >
      <header className="grid gap-6 border-b border-ink-100 px-8 py-10 md:grid-cols-[1fr_auto] md:px-12">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">
            {content.fullName || "Tu nombre"}
          </h1>
          <p className="mt-2 text-ink-600">{content.headline}</p>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-800">
            {content.summary}
          </p>
        </div>
        <div className="text-sm text-ink-600 md:text-right">
          <p>{content.email}</p>
          <p>{content.phone}</p>
          <p>{content.location}</p>
          <p>{content.website}</p>
        </div>
      </header>
      <div className="grid gap-10 px-8 py-10 md:grid-cols-3 md:px-12">
        <div>
          <h2 className="text-xs uppercase tracking-[0.18em] text-ink-500">
            Habilidades
          </h2>
          <ul className="mt-3 space-y-1 text-sm">
            {content.skills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <h2 className="mt-8 text-xs uppercase tracking-[0.18em] text-ink-500">
            Formación
          </h2>
          <div className="mt-3 space-y-3 text-sm">
            {content.education.map((ed) => (
              <div key={ed.id}>
                <p className="font-medium">{ed.degree}</p>
                <p className="text-ink-600">
                  {ed.school} {ed.year ? `· ${ed.year}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <h2 className="text-xs uppercase tracking-[0.18em] text-ink-500">
            Experiencia
          </h2>
          <div className="mt-4 space-y-5">
            {content.experience.map((ex) => (
              <div key={ex.id}>
                <p className="font-medium">
                  {ex.role} — {ex.company}
                </p>
                <p className="text-sm text-ink-500">
                  {[ex.startDate, ex.endDate].filter(Boolean).join(" – ")}
                  {ex.location ? ` · ${ex.location}` : ""}
                </p>
                <p className="mt-1 text-ink-800">{ex.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {content.projects.length > 0 && (
        <div className="border-t border-ink-100 px-8 py-10 md:px-12">
          <h2 className="text-xs uppercase tracking-[0.18em] text-ink-500">
            Proyectos
          </h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2">
            {content.projects.map((p) => (
              <div key={p.id}>
                {p.imageUrls[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrls[0]}
                    alt={p.title}
                    className="mb-3 aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="mb-3 aspect-[4/3] w-full bg-ink-100" />
                )}
                <p className="text-lg font-medium">{p.title}</p>
                <p className="text-sm text-ink-500">
                  {[p.year, p.location, p.typology].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-2 text-sm text-ink-800">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function SectionDark({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-clay-400">
        {title}
      </h2>
      {typeof children === "string" ? (
        <p className="leading-relaxed text-ink-200">{children}</p>
      ) : (
        children
      )}
    </section>
  );
}
