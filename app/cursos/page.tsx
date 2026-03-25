'use client'

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, GraduationCap, Phone, Search } from "lucide-react"
import { PublicDetailModal } from "../components/PublicDetailModal"
import { PublicHeader } from "../components/PublicHeader"
import { ShareButton } from "../components/ShareButton"
import { supabase } from "../supabase"

type Curso = {
  id: number
  nombre: string
  descripcion: string
  responsable: string
  contacto: string
  imagen: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
}

export default function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [search, setSearch] = useState("")
  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null)

  const getShareUrl = (id: number) => {
    if (typeof window === "undefined") return `/cursos?item=${id}`
    return `${window.location.origin}/cursos?item=${id}`
  }

  useEffect(() => {
    const cargarCursos = async () => {
      const { data, error } = await supabase
        .from("cursos")
        .select("*")
        .eq("estado", "activo")
        .order("id", { ascending: false })

      if (error) {
        console.error("Error al cargar cursos:", error)
        return
      }

      const items = data || []
      setCursos(items)

      const itemId = new URLSearchParams(window.location.search).get("item")
      if (!itemId) return

      const selectedItem = items.find((curso) => String(curso.id) === itemId)
      if (selectedItem) {
        setSelectedCurso(selectedItem)
      }
    }

    cargarCursos()
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (selectedCurso) {
      url.searchParams.set("item", String(selectedCurso.id))
    } else {
      url.searchParams.delete("item")
    }
    window.history.replaceState({}, "", url)
  }, [selectedCurso])

  const whatsappLink = (telefono: string) => {
    return `https://wa.me/${telefono.replace(/\D/g, "")}`
  }

  const getContactHref = (contacto: string, usaWhatsapp?: boolean | null) =>
    usaWhatsapp === false ? `tel:${contacto}` : whatsappLink(contacto)

  const cursosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return cursos

    return cursos.filter((curso) =>
      `${curso.nombre} ${curso.descripcion || ""} ${curso.responsable || ""} ${curso.contacto || ""}`
        .toLowerCase()
        .includes(term)
    )
  }, [cursos, search])

  return (
    <main className="min-h-screen bg-white">
      <PublicDetailModal
        open={Boolean(selectedCurso)}
        onClose={() => setSelectedCurso(null)}
        title={selectedCurso?.nombre || ""}
        imageSrc={selectedCurso?.imagen || null}
        imageAlt={selectedCurso?.nombre || "Curso"}
        description={selectedCurso?.descripcion || null}
        meta={[
          ...(selectedCurso?.responsable
            ? [{ icon: GraduationCap, text: selectedCurso.responsable }]
            : []),
          ...(selectedCurso?.contacto
            ? [{ icon: Phone, text: selectedCurso.contacto }]
            : []),
        ]}
        actions={
          selectedCurso ? (
            <>
              {selectedCurso.contacto ? (
                <a
                  href={getContactHref(
                    selectedCurso.contacto,
                    selectedCurso.usa_whatsapp
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                >
                  <Phone className="h-4 w-4" />
                  {selectedCurso.usa_whatsapp === false ? "Llamar" : "Contactar"}
                </a>
              ) : null}
              <ShareButton
                title={selectedCurso.nombre}
                text={selectedCurso.descripcion}
                url={getShareUrl(selectedCurso.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              />
            </>
          ) : null
        }
      />

      <PublicHeader
        items={[
          { href: "/#inicio", label: "Inicio" },
          { href: "/comercios", label: "Comercios" },
          { href: "/eventos", label: "Eventos" },
          { href: "/servicios", label: "Servicios" },
          { href: "/cursos", label: "Cursos y Clases", active: true },
          { href: "/#contacto", label: "Contacto" },
        ]}
      />

      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900">Cursos y Clases</h1>
        <p className="mt-2 text-gray-600">
          Descubri propuestas de aprendizaje, talleres y clases disponibles en la ciudad
        </p>

        <div className="mt-6 max-w-xl">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por curso, responsable o descripcion"
              className="w-full text-sm outline-none"
            />
          </div>
        </div>

        {cursosFiltrados.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">
              {cursos.length === 0
                ? "Todavia no hay cursos o clases cargados."
                : "No se encontraron cursos o clases con esa busqueda."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {cursosFiltrados.map((curso) => (
              <div
                key={curso.id}
                className="overflow-hidden rounded-xl border border-gray-200 shadow-sm"
              >
                {curso.imagen && (
                  <img
                    src={curso.imagen}
                    alt={curso.nombre}
                    className="h-56 w-full object-cover"
                  />
                )}

                <div className="p-5">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {curso.nombre}
                  </h2>

                  <p className="line-clamp-5 mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {curso.descripcion}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <GraduationCap className="h-4 w-4" />
                    <span>{curso.responsable}</span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedCurso(curso)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      Ver mas
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <a
                      href={getContactHref(curso.contacto, curso.usa_whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                    >
                      <Phone className="h-4 w-4" />
                      {curso.usa_whatsapp === false ? "Llamar" : "Contactar"}
                    </a>

                    <ShareButton
                      title={curso.nombre}
                      text={curso.descripcion}
                      url={getShareUrl(curso.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
