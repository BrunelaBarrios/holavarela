import { absoluteUrl } from "./seo"

type LocalBusinessSchemaInput = {
  name: string
  description?: string | null
  url: string
  image?: string | null
  address?: string | null
  telephone?: string | null
  category?: string | null
}

type EventSchemaInput = {
  name: string
  description?: string | null
  url: string
  image?: string | null
  startDate?: string | null
  endDate?: string | null
  location?: string | null
  organizerName?: string | null
  organizerUrl?: string | null
}

type CourseSchemaInput = {
  name: string
  description?: string | null
  url: string
  providerName?: string | null
}

export function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Hola Varela!",
    url: absoluteUrl("/"),
    inLanguage: "es-UY",
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/eventos")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Hola Varela!",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo-varela-grande.png"),
    sameAs: [
      "https://www.instagram.com/hola.varela",
      "https://www.facebook.com/share/1HZBYuVRC3/",
    ],
  }
}

export function buildLocalBusinessSchema(input: LocalBusinessSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: input.name,
    description: input.description || undefined,
    url: input.url,
    image: input.image || undefined,
    telephone: input.telephone || undefined,
    address: input.address
      ? {
          "@type": "PostalAddress",
          streetAddress: input.address,
          addressLocality: "José Pedro Varela",
          addressRegion: "Lavalleja",
          addressCountry: "UY",
        }
      : undefined,
    additionalType: input.category || undefined,
  }
}

export function buildEventSchema(input: EventSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.name,
    description: input.description || undefined,
    url: input.url,
    image: input.image || undefined,
    startDate: input.startDate || undefined,
    endDate: input.endDate || input.startDate || undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: input.location
      ? {
          "@type": "Place",
          name: input.location,
          address: {
            "@type": "PostalAddress",
            streetAddress: input.location,
            addressLocality: "José Pedro Varela",
            addressRegion: "Lavalleja",
            addressCountry: "UY",
          },
        }
      : undefined,
    organizer: input.organizerName
      ? {
          "@type": "Organization",
          name: input.organizerName,
          url: input.organizerUrl || undefined,
        }
      : undefined,
  }
}

export function buildCourseSchema(input: CourseSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: input.name,
    description: input.description || undefined,
    url: input.url,
    provider: input.providerName
      ? {
          "@type": "Organization",
          name: input.providerName,
        }
      : {
          "@type": "Organization",
          name: "Hola Varela!",
          url: absoluteUrl("/"),
        },
  }
}

export function buildItemListSchema(
  name: string,
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  }
}
