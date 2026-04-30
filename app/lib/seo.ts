import type { Metadata } from "next"

const SITE_NAME = "Hola Varela!"
const DEFAULT_SITE_URL = "https://www.holavarela.uy"
const DEFAULT_DESCRIPTION =
  "Guia digital de Jose Pedro Varela con comercios, eventos, cursos, instituciones y radio local."

export const getSiteUrl = () => {
  const directUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (directUrl) {
    return directUrl.startsWith("http") ? directUrl : `https://${directUrl}`
  }

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`
  }

  return DEFAULT_SITE_URL
}

export const absoluteUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return new URL(normalizedPath, getSiteUrl()).toString()
}

type PageMetadataOptions = {
  path?: string
  title: string
  description: string
  image?: string
  noIndex?: boolean
}

export const buildPageMetadata = ({
  path = "/",
  title,
  description,
  image = "/logo-varela-grande.png",
  noIndex = false,
}: PageMetadataOptions): Metadata => {
  const canonical = absoluteUrl(path)
  const imageUrl = image.startsWith("http") ? image : absoluteUrl(image)

  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    alternates: {
      canonical,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        },
    openGraph: {
      type: "website",
      locale: "es_UY",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      images: [
        {
          url: imageUrl,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  }
}

export const defaultSiteMetadata = buildPageMetadata({
  title: SITE_NAME,
  description: DEFAULT_DESCRIPTION,
})
