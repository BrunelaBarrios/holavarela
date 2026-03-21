import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Hola Varela!",
  description: "Guia digital de Jose Pedro Varela con comercios, eventos y radio local.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
