'use client'

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, MapPin, Phone, Search } from "lucide-react"
import { PublicDetailModal } from "../components/PublicDetailModal"
import { PublicHeader } from "../components/PublicHeader"
import { ShareButton } from "../components/ShareButton"
import { supabase } from "../supabase"

type Comercio = {
  id: number
  nombre: string
  descripcion: string
  direccion: string
  telefono: string
  imagen?: string | null
  imagen_url?: string | null
  usa_whatsapp?: boolean | null
}

export default function ComerciosPage() {
  const [comercios, setComercios] = useState<Comercio[]>([])
  const [search, setSearch] = useState("")
  const [selectedComercio, setSelectedComercio] = useState<Comercio | null>(null)

  const getShareUrl = (id: number) => {
    if (typeof window === "undefined") return `/comercios/${id}`
    return `${window.location.origin}/comercios/${id}`
  }

  useEffect(() => {
    const cargarComercios = async () => {
      const { data, error } = await supabase
        .from("comercios")
        .select("*")
        .eq("estado", "activo")
        .order("id", { ascending: false })

      if (error) {
        console.error(error)
        return
      }

      const items = data || []
      setComercios(items)

      const itemId = new URLSearchParams(window.location.search).get("item")
      if (!itemId) return

      const selectedItem = items.find((comercio) => String(comercio.id) === itemId)
      if (selectedItem) {
        setSelectedComercio(selectedItem)
      }
    }

    cargarComercios()
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (selectedComercio) {
      url.searchParams.set("item", String(selectedComercio.id))
    } else {
      url.searchParams.delete("item")
    }
    window.history.replaceState({}, "", url)
  }, [selectedComercio])

  const getWhatsappLink = (telefono: string) => {
    const limpio = telefono.replace(/\D/g, "")
    const numero = limpio.startsWith("598")
      ? limpio
      : `598${limpio.replace(/^0+/, "")}`

    return `https://wa.me/${numero}`
  }

  const getContactHref = (telefono: string, usaWhatsapp?: boolean | null) =>
    usaWhatsapp === false ? `tel:${telefono}` : getWhatsappLink(telefono)

  const getContactLabel = (usaWhatsapp?: boolean | null) =>
    usaWhatsapp === false ? "Llamar por telefono" : "Contactar por WhatsApp"

  const comerciosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return comercios

    return comercios.filter((comercio) =>
      `${comercio.nombre} ${comercio.descripcion || ""} ${comercio.direccion || ""} ${comercio.telefono || ""}`
        .toLowerCase()
        .includes(term)
    )
  }, [comercios, search])

  return (
    <main className="min-h-screen bg-white">
      <PublicDetailModal
        open={Boolean(selectedComercio)}
        onClose={() => setSelectedComercio(null)}
        title={selectedComercio?.nombre || ""}
        imageSrc={
          selectedComercio
            ? selectedComercio.imagen || selectedComercio.imagen_url || null
            : null
        }
        imageAlt={selectedComercio?.nombre || "Comercio"}
        description={selectedComercio?.descripcion || null}
        meta={[
          ...(selectedComercio?.direccion
            ? [{ icon: MapPin, text: selectedComercio.direccion }]
            : []),
          ...(selectedComercio?.telefono
            ? [{ icon: Phone, text: selectedComercio.telefono }]
            : []),
        ]}
        actions={
          selectedComercio ? (
            <>
              {selectedComercio.telefono ? (
                <a
                  href={getContactHref(
                    selectedComercio.telefono,
                    selectedComercio.usa_whatsapp
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-500"
                >
                  <Phone className="h-4 w-4" />
                  {getContactLabel(selectedComercio.usa_whatsapp)}
                </a>
              ) : null}
              <ShareButton
                title={selectedComercio.nombre}
                text={selectedComercio.descripcion}
                url={getShareUrl(selectedComercio.id)}
                section="comercios"
                itemId={String(selectedComercio.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              />
            </>
          ) : null
        }
      />

      <PublicHeader
        items={[
          { href: "/#inicio", label: "Inicio" },
          { href: "/comercios", label: "Comercios", active: true },
          { href: "/eventos", label: "Eventos" },
          { href: "/servicios", label: "Servicios" },
          { href: "/cursos", label: "Cursos y Clases" },
          { href: "/#contacto", label: "Contacto" },
        ]}
      />

      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900">Comercios</h1>

        <div className="mt-6 max-w-xl">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, direccion o descripcion"
              className="w-full text-sm outline-none"
            />
          </div>
        </div>

        {comerciosFiltrados.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">
              {comercios.length === 0
                ? "Todavia no hay comercios cargados."
                : "No se encontraron comercios con esa busqueda."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {comerciosFiltrados.map((comercio) => {
              const imagenSrc = comercio.imagen || comercio.imagen_url

              return (
                <div
                  key={comercio.id}
                  className="rounded-xl border border-gray-200 p-5 shadow-sm"
                >
                  {imagenSrc && (
                    <img
                      src={imagenSrc}
                      alt={comercio.nombre}
                      className="mb-3 h-40 w-full rounded-lg object-cover"
                    />
                  )}

                  <h2 className="text-lg font-semibold text-gray-900">
                    {comercio.nombre}
                  </h2>

                  <p className="line-clamp-5 whitespace-pre-line text-sm text-gray-600">
                    {comercio.descripcion}
                  </p>

                  <p className="mt-2 text-sm text-gray-600">
                    Direccion: {comercio.direccion}
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    Telefono: {comercio.telefono}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedComercio(comercio)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      Ver mas
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <a
                      href={getContactHref(comercio.telefono, comercio.usa_whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-lg bg-green-600 px-4 py-2 text-sm text-white"
                    >
                      {getContactLabel(comercio.usa_whatsapp)}
                    </a>

                    <ShareButton
                      title={comercio.nombre}
                      text={comercio.descripcion}
                      url={getShareUrl(comercio.id)}
                      section="comercios"
                      itemId={String(comercio.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
