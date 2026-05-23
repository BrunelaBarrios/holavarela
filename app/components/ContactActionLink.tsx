'use client'

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react"
import {
  recordWhatsappClick,
  type WhatsappSection,
} from "../lib/whatsappTracking"
import { trackAnalyticsEvent } from "../lib/clientAnalytics"

type ContactActionLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode
  mode: "whatsapp" | "phone"
  section?: WhatsappSection
  itemId?: string
  itemTitle?: string
}

export function ContactActionLink({
  children,
  mode,
  section,
  itemId,
  itemTitle,
  onClick,
  ...props
}: ContactActionLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)

    if (
      !event.defaultPrevented &&
      mode === "whatsapp" &&
      section &&
      itemId
    ) {
      void recordWhatsappClick(section, itemId, itemTitle)
    }

    if (!event.defaultPrevented) {
      trackAnalyticsEvent("contact_click", {
        contact_mode: mode,
        content_section: section,
        item_id: itemId,
        item_title: itemTitle,
      })
    }
  }

  return (
    <a {...props} onClick={handleClick}>
      {children}
    </a>
  )
}
