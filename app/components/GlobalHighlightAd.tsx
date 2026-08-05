'use client'

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { X } from "lucide-react"
import { supabase } from "../supabase"
import { recordHighlightImpression } from "../lib/contentVisits"
import { OptimizedImage } from "./OptimizedImage"

type HighlightAd = {
  id: number
  imagen_url: string
  entidad_tipo: "comercio" | "servicio" | "institucion"
  entidad_id: number
  delay_seconds: number | null
}

const LAST_HIGHLIGHT_KEY = "guia-varela-last-delayed-promo"

export function GlobalHighlightAd() {
  const pathname = usePathname()
  const router = useRouter()
  const [ad, setAd] = useState<HighlightAd | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (pathname === "/" || pathname.startsWith("/admin")) return

    let active = true
    let timeoutId: number | undefined

    const load = async () => {
      const { data, error } = await supabase
        .from("destacados_home")
        .select("id, imagen_url, entidad_tipo, entidad_id, delay_seconds")
        .eq("activo", true)
        .order("updated_at", { ascending: false })
        .limit(20)

      if (!active || error || !data?.length) return

      const ads = data.filter((item) => Boolean(item.imagen_url)) as HighlightAd[]
      if (!ads.length) return

      const lastKey = window.localStorage.getItem(LAST_HIGHLIGHT_KEY)
      const lastIndex = ads.findIndex((item) => `ad:${item.id}` === lastKey)
      const nextAd = ads[lastIndex >= 0 ? (lastIndex + 1) % ads.length : 0]
      setAd(nextAd)

      timeoutId = window.setTimeout(() => {
        window.localStorage.setItem(LAST_HIGHLIGHT_KEY, `ad:${nextAd.id}`)
        void recordHighlightImpression(String(nextAd.id), `Publicidad destacada #${nextAd.id}`)
        setOpen(true)
      }, Math.max(0, Number(nextAd.delay_seconds) || 0) * 1000)
    }

    void load()
    return () => {
      active = false
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [pathname])

  if (!open || !ad) return null

  const href = `/${ad.entidad_tipo === "institucion" ? "instituciones" : `${ad.entidad_tipo}s`}/${ad.entidad_id}`

  return (
    <div
      className="fixed inset-0 z-[84] overflow-y-auto bg-slate-950/70 px-3 py-4 sm:p-4"
      onClick={() => setOpen(false)}
    >
      <div className="mx-auto flex min-h-full max-w-4xl items-center justify-center py-2 sm:py-4">
        <div
          className="relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl sm:rounded-[34px]"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-600 shadow-sm transition hover:text-slate-900 sm:right-4 sm:top-4"
            aria-label="Cerrar publicidad"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              router.push(href)
            }}
            className="relative block h-[min(78vh,720px)] min-h-[260px] w-full bg-slate-50 sm:min-h-[420px]"
            aria-label="Abrir ficha de la publicidad destacada"
          >
            <OptimizedImage
              src={ad.imagen_url}
              alt="Publicidad destacada de Hola Varela"
              sizes="(max-width: 768px) 96vw, 860px"
              priority
              className="object-contain"
            />
          </button>
        </div>
      </div>
    </div>
  )
}
