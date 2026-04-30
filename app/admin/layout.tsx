import type { Metadata } from "next"
import AdminLayoutShell from "./AdminShell"
import { buildPageMetadata } from "../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  path: "/admin",
  title: "Panel de administracion | Hola Varela!",
  description: "Acceso interno al panel de administracion de Hola Varela.",
  noIndex: true,
})

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>
}
