import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="font-display text-2xl tracking-tight">
            Arquitecta
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="px-3 py-2 text-ink-700 transition hover:text-ink-950"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="bg-ink-950 px-4 py-2 text-ink-50 transition hover:bg-ink-800"
            >
              Empezar
            </Link>
          </nav>
        </header>

        <main className="relative mt-16 flex flex-1 flex-col justify-center pb-20 md:mt-0">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-10 right-0 hidden w-[48%] bg-[linear-gradient(135deg,#d6d0c2_0%,#c4b8a4_40%,#8c4b2a_100%)] opacity-90 md:block"
            style={{
              clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)",
            }}
          />
          <div className="relative max-w-xl">
            <p className="font-display text-6xl leading-[0.95] tracking-tight text-ink-950 md:text-7xl">
              Arquitecta
            </p>
            <h1 className="mt-6 text-2xl font-medium leading-snug text-ink-800 md:text-3xl">
              Tu CV y portafolio, con la claridad de un buen plano.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-600">
              Sube tu experiencia, proyectos e imágenes. Elige una plantilla,
              deja que la IA afine la redacción y descarga PDF o publica un link
              profesional.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="bg-ink-950 px-6 py-3 text-sm font-medium text-ink-50 transition hover:bg-ink-800"
              >
                Crear mi portafolio
              </Link>
              <Link
                href="/login"
                className="border border-ink-300 bg-white/50 px-6 py-3 text-sm font-medium text-ink-800 backdrop-blur transition hover:border-ink-500"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </main>

        <footer className="border-t border-ink-200/70 pt-6 text-sm text-ink-500">
          SaaS para arquitectos · PDF + portafolio web · Plantillas + IA
        </footer>
      </div>
    </div>
  );
}
