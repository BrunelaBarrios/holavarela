import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"
import { AnalyticsScripts } from "./components/AnalyticsScripts"
import { JsonLd } from "./components/JsonLd"
import { buildOrganizationSchema, buildWebsiteSchema } from "./lib/schema"
import { defaultSiteMetadata } from "./lib/seo"

export const metadata: Metadata = {
  ...defaultSiteMetadata,
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
        <JsonLd data={[buildWebsiteSchema(), buildOrganizationSchema()]} />
        <AnalyticsScripts />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
