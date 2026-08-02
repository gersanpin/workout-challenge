import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-4xl">404</p>
      <p className="mt-3 text-ink-600">
        No encontramos ese portafolio (o aún no está publicado).
      </p>
      <Link href="/" className="mt-6 text-sm underline">
        Volver al inicio
      </Link>
    </div>
  );
}
