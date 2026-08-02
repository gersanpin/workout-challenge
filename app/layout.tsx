import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arquitecta — CV y portafolio para arquitectos",
  description:
    "Crea, rediseña y publica tu CV y portafolio profesional con plantillas y ayuda de IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
