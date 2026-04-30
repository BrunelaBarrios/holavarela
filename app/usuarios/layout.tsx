import type { Metadata } from "next"
import { buildPageMetadata } from "../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  path: "/usuarios",
  title: "Area de usuarios | Hola Varela!",
  description: "Area privada de usuarios y suscripciones de Hola Varela.",
  noIndex: true,
})

export default function UsuariosLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
