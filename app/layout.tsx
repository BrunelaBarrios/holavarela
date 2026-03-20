import type { Metadata } from "next"
import "./globals.css"
import { ComerciosProvider } from "./context/ComerciosContext"

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
      <body>
        <ComerciosProvider>{children}</ComerciosProvider>
      </body>
    </html>
  )
}
