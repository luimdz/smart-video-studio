import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Serie · Estudio de contenido",
  description: "Tus marcas, historias y temporadas, en un solo estudio.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
