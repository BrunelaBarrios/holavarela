'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { GraduationCap, Phone, Radio, Search } from "lucide-react"
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

      setCursos(data || [])
    }

    cargarCursos()
  }, [])

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
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/logo-varela-chico.png"
              alt="Hola Varela"
              className="h-10 w-auto"
            />
            <span className="text-[20px] font-semibold tracking-tight">
              Hola Varela!
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-[15px] font-medium text-slate-700 md:flex">
            <Link href="/#inicio" className="hover:text-blue-500">
              Inicio
            </Link>
            <Link href="/#radio" className="hover:text-blue-500">
              Radio en Vivo
            </Link>
            <Link href="/comercios" className="hover:text-blue-500">
              Comercios
            </Link>
            <Link href="/eventos" className="hover:text-blue-500">
              Eventos
            </Link>
            <Link href="/servicios" className="hover:text-blue-500">
              Servicios
            </Link>
            <Link href="/cursos" className="text-blue-500">
              Cursos y Clases
            </Link>
            <Link href="/#contacto" className="hover:text-blue-500">
              Contacto
            </Link>
          </nav>
        </div>
      </header>

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

                  <p className="mt-3 text-sm leading-relaxed text-gray-700">
                    {curso.descripcion}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <GraduationCap className="h-4 w-4" />
                    <span>{curso.responsable}</span>
                  </div>

                  <a
                    href={getContactHref(curso.contacto, curso.usa_whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                  >
                    <Phone className="h-4 w-4" />
                    {curso.usa_whatsapp === false ? "Llamar" : "Contactar"}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
