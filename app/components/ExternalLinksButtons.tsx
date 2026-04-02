'use client'

import { Facebook, Globe, Instagram } from "lucide-react"
import { normalizeExternalUrl } from "../lib/externalLinks"

type ExternalLinksButtonsProps = {
  webUrl?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  className?: string
}

export function ExternalLinksButtons({
  webUrl,
  instagramUrl,
  facebookUrl,
  className = "inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600",
}: ExternalLinksButtonsProps) {
  const links = [
    {
      key: "web",
      href: normalizeExternalUrl(webUrl),
      label: "Sitio web",
      Icon: Globe,
    },
    {
      key: "instagram",
      href: normalizeExternalUrl(instagramUrl),
      label: "Instagram",
      Icon: Instagram,
    },
    {
      key: "facebook",
      href: normalizeExternalUrl(facebookUrl),
      label: "Facebook",
      Icon: Facebook,
    },
  ].filter((item) => item.href)

  if (links.length === 0) return null

  return (
    <>
      {links.map(({ key, href, label, Icon }) => (
        <a
          key={key}
          href={href || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          <Icon className="h-4 w-4" />
          {label}
        </a>
      ))}
    </>
  )
}
