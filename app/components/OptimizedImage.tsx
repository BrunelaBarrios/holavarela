'use client'

import Image, { type ImageLoaderProps } from "next/image"

type OptimizedImageProps = {
  src: string
  alt: string
  sizes: string
  className?: string
  priority?: boolean
  quality?: number
}

const DEFAULT_QUALITY = 72

function isSupabaseStorageUrl(src: string) {
  return src.includes("/storage/v1/object/public/")
}

function buildSupabaseResponsiveUrl(src: string, width: number, quality?: number) {
  const qualityValue = Math.max(40, Math.min(quality ?? DEFAULT_QUALITY, 85))

  try {
    const url = new URL(src)
    const publicPath = "/storage/v1/object/public/"
    const renderPath = "/storage/v1/render/image/public/"

    if (!url.pathname.includes(publicPath)) {
      return src
    }

    url.pathname = url.pathname.replace(publicPath, renderPath)
    url.searchParams.set("width", String(width))
    url.searchParams.set("quality", String(qualityValue))

    return url.toString()
  } catch {
    return src
  }
}

function supabaseLoader({ src, width, quality }: ImageLoaderProps) {
  if (!isSupabaseStorageUrl(src)) {
    return src
  }

  return buildSupabaseResponsiveUrl(src, width, quality)
}

export function OptimizedImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
  quality,
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={quality}
      loading={priority ? "eager" : "lazy"}
      loader={isSupabaseStorageUrl(src) ? supabaseLoader : undefined}
      unoptimized={src.startsWith("data:")}
      className={className}
    />
  )
}
