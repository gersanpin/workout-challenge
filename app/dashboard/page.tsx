import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DocType, Portfolio } from "@/lib/types";
import { docTypeLabel } from "@/lib/types";
import { SignOutButton } from "@/components/auth/SignOutButton";

function resolveDocType(p: Portfolio): DocType {
  if (p.doc_type === "cv" || p.doc_type === "portfolio") return p.doc_type;
  const meta = p.content as Portfolio["content"] & { _docType?: DocType };
  return meta._docType === "cv" ? "cv" : "portfolio";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: portfolios } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const items = (portfolios || []) as Portfolio[];

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/" className="font-display text-2xl">
            Arquitecta
          </Link>
          <p className="mt-1 text-sm text-ink-600">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/new"
            className="bg-ink-950 px-4 py-2 text-sm text-ink-50"
          >
            Crear CV o portafolio
          </Link>
          <SignOutButton />
        </div>
      </header>

      <section className="mt-10">
        <h1 className="text-xl font-medium">¿Qué quieres hacer?</h1>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ActionCard
            href="/dashboard/new"
            eyebrow="Crear"
            title="CV o portafolio nuevo"
            body="Elige CV o portafolio en el primer paso. Plantillas, IA y export PDF — sin límites de uso."
            primary
          />
          <ActionCard
            href="/dashboard/redesign"
            eyebrow="Rediseñar"
            title="Portafolio existente"
            body="Sube un PDF multipágina o imágenes y genera una versión rediseñada con IA."
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ActionCard
            href="/dashboard/new?type=cv"
            eyebrow="Atajo"
            title="Ir directo a crear CV"
            body="PDF o texto + vacante opcional + plantilla ATS-safe."
          />
          <ActionCard
            href="/dashboard/new?type=portfolio"
            eyebrow="Atajo"
            title="Ir directo a crear portafolio"
            body="Abre el asistente de portafolio (notas, imágenes, plantilla e IA)."
          />
        </div>
        <p className="mt-4 text-xs text-ink-500">
          Uso ilimitado y gratis por ahora — sin tope de documentos, IA ni PDF.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-medium">Tus documentos</h2>
        {!items.length ? (
          <div className="mt-6 border border-dashed border-ink-300 bg-white/40 p-10 text-center">
            <p className="text-ink-700">Aún no tienes documentos.</p>
            <Link
              href="/dashboard/new"
              className="mt-4 inline-block bg-ink-950 px-4 py-2 text-sm text-ink-50"
            >
              Crear CV o portafolio
            </Link>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-ink-200 border border-ink-200 bg-white/70">
            {items.map((p) => {
              const type = resolveDocType(p);
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <Link
                      href={`/dashboard/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    <p className="text-sm text-ink-500">
                      {docTypeLabel(type)}
                      {p.source_mode === "redesign" ||
                      (p.content as { _sourceMode?: string })._sourceMode ===
                        "redesign"
                        ? " · Rediseño"
                        : ""}
                      {" · "}
                      Plantilla {p.template_id}
                      {p.published && p.slug
                        ? ` · Publicado /p/${p.slug}`
                        : " · Borrador"}
                    </p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <Link
                      href={`/dashboard/${p.id}`}
                      className="border border-ink-300 px-3 py-1.5"
                    >
                      Editar
                    </Link>
                    {p.published && p.slug ? (
                      <Link
                        href={`/p/${p.slug}`}
                        className="border border-ink-300 px-3 py-1.5"
                        target="_blank"
                      >
                        Ver link
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function ActionCard({
  href,
  title,
  body,
  eyebrow,
  primary,
}: {
  href: string;
  title: string;
  body: string;
  eyebrow?: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block border p-5 transition hover:border-ink-800 ${
        primary
          ? "border-ink-950 bg-ink-950 text-ink-50"
          : "border-ink-200 bg-white/70 text-ink-950"
      }`}
    >
      {eyebrow ? (
        <p
          className={`text-xs uppercase tracking-wider ${
            primary ? "text-ink-300" : "text-ink-500"
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <p className="mt-1 font-medium">{title}</p>
      <p
        className={`mt-2 text-sm leading-relaxed ${
          primary ? "text-ink-200" : "text-ink-600"
        }`}
      >
        {body}
      </p>
    </Link>
  );
}
