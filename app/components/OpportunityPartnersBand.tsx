'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "../supabase"
import { OptimizedImage } from "./OptimizedImage"

type Partner = {
  key: string
  name: string
  image: string
  href: string
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

function rotatingScore(key: string, period: number) {
  let score = period | 0
  for (let index = 0; index < key.length; index += 1) {
    score = Math.imul(score ^ key.charCodeAt(index), 2654435761)
  }
  return score >>> 0
}

export function OpportunityPartnersBand() {
  const [partners, setPartners] = useState<Partner[]>([])

  useEffect(() => {
    let active = true

    const load = async () => {
      const [businessesResult, servicesResult] = await Promise.all([
        supabase
          .from("comercios")
          .select("id, nombre, imagen, imagen_url")
          .eq("estado", "activo"),
        supabase
          .from("servicios")
          .select("id, nombre, imagen")
          .or("estado.is.null,estado.eq.activo"),
      ])

      if (!active) return

      const businesses: Partner[] = (businessesResult.data || [])
        .map((item) => ({
          key: `comercio-${item.id}`,
          name: item.nombre,
          image: item.imagen_url || item.imagen || "",
          href: `/comercios/${item.id}`,
        }))
        .filter((item) => Boolean(item.image))

      const services: Partner[] = (servicesResult.data || [])
        .map((item) => ({
          key: `servicio-${item.id}`,
          name: item.nombre,
          image: item.imagen || "",
          href: `/servicios/${item.id}`,
        }))
        .filter((item) => Boolean(item.image))

      const period = Math.floor(Date.now() / TWO_DAYS_MS)
      setPartners(
        [...businesses, ...services]
          .sort((left, right) => rotatingScore(left.key, period) - rotatingScore(right.key, period))
          .slice(0, 10)
      )
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  if (!partners.length) return null

  return (
    <section className="border-y border-sky-100 bg-white/90 px-4 py-8" aria-label="Comercios y servicios de la comunidad">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">Nuestra comunidad</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">Comercios y servicios que acompañan</h2>
        </div>
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-5 sm:overflow-visible">
          {partners.map((partner) => (
            <Link
              key={partner.key}
              href={partner.href}
              className="group flex min-w-36 flex-col items-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-md sm:min-w-0"
            >
              <div className="relative h-20 w-full overflow-hidden rounded-xl bg-slate-50">
                <OptimizedImage
                  src={partner.image}
                  alt={`Logo de ${partner.name}`}
                  sizes="(max-width: 640px) 144px, 190px"
                  className="object-contain p-2 transition group-hover:scale-105"
                />
              </div>
              <span className="mt-2 line-clamp-2 text-center text-xs font-bold text-slate-700">
                {partner.name}
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">La selección se renueva cada dos días.</p>
      </div>
    </section>
  )
}
