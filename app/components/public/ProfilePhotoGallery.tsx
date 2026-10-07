'use client'

import { useRef } from "react"
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react"
import { OptimizedImage } from "../OptimizedImage"
import styles from "./EditorialProfile.module.css"

export function ProfilePhotoGallery({ images, title, skipImage, onOpen }: {
  images: string[]
  title: string
  skipImage?: string | null
  onOpen: (index: number) => void
}) {
  const rail = useRef<HTMLDivElement>(null)
  const photos = images.map((src, index) => ({ src, index })).filter(({ src }) => src !== skipImage)
  const visiblePhotos = photos.length ? photos : images.map((src, index) => ({ src, index }))
  const cover = visiblePhotos[0]
  if (!cover) return null

  const scroll = (direction: number) => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    rail.current?.scrollBy({ left: direction * rail.current.clientWidth * 0.8, behavior: reducedMotion ? "instant" : "smooth" })
  }

  return (
    <div className={styles.photoBlock}>
      <div className={styles.galleryHeading}>
        <span>Galería</span>
        <span>{visiblePhotos.length} {visiblePhotos.length === 1 ? "imagen" : "imágenes"}</span>
      </div>
      <button type="button" className={styles.cover} onClick={() => onOpen(cover.index)} aria-label={`Ampliar ${title}, imagen 1`}>
        <OptimizedImage src={cover.src} alt={`${title} 1`} sizes="(max-width: 767px) 90vw, 520px" className="object-cover" />
        <span className={styles.coverAction}>Ver fotos <ArrowUpRight size={17} /></span>
      </button>
      {visiblePhotos.length > 1 ? (
        <>
          <div ref={rail} className={styles.photoRail} aria-label={`Fotos de ${title}`} tabIndex={0}>
            {visiblePhotos.slice(1).map(({ src, index }, position) => (
              <button key={src} type="button" className={styles.thumbnail} onClick={() => onOpen(index)} aria-label={`Ampliar ${title}, imagen ${position + 2}`}>
                <OptimizedImage src={src} alt={`${title} ${position + 2}`} sizes="160px" className="object-cover" />
              </button>
            ))}
          </div>
          <div className={styles.galleryFooter}>
            <span>Deslizá para descubrir más</span>
            <div>
              <button type="button" onClick={() => scroll(-1)} aria-label={`Fotos anteriores de ${title}`}><ChevronLeft size={18} /></button>
              <button type="button" onClick={() => scroll(1)} aria-label={`Fotos siguientes de ${title}`}><ChevronRight size={18} /></button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
