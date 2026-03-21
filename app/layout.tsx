import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Hola Varela!",
  description: "Guia digital de Jose Pedro Varela con comercios, eventos y radio local.",
  icons: {
    icon: "/logo-varela-chico.png",
    shortcut: "/logo-varela-chico.png",
    apple: "/logo-varela-chico.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
