import type { Metadata } from "next"
import { buildPageMetadata } from "../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  path: "/sumate",
  title: "Panel de aliados | Hola Varela!",
  description: "Acceso para comercios, instituciones y gestores de contenido de Hola Varela.",
  noIndex: true,
})

export default function SumateLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
