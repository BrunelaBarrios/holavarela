'use client'

import { useEffect, useMemo, useState } from "react"
import { Mail, Search, UserRound } from "lucide-react"
import { supabase } from "../../supabase"

type UsuarioRegistrado = {
  id: number
  user_id: string | null
  email: string
  created_at: string | null
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioRegistrado[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const cargarUsuarios = async () => {
    const { data, error: loadError } = await supabase
      .from("usuarios_registrados")
      .select("*")
      .order("created_at", { ascending: false })

    if (loadError) {
      setError(`Error al cargar usuarios: ${loadError.message}`)
      setLoading(false)
      return
    }

    setUsuarios(data || [])
    setLoading(false)
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargarUsuarios()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const usuariosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return usuarios

    return usuarios.filter((usuario) =>
      `${usuario.email} ${usuario.user_id || ""}`.toLowerCase().includes(term)
    )
  }, [search, usuarios])

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Usuarios registrados</h1>
        <p className="text-slate-500">Cuentas creadas desde el acceso privado de Hola Varela</p>
      </div>

      <div className="mb-6 max-w-xl">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por email o ID de usuario"
            className="w-full text-sm outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
          Cargando usuarios...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">
          {error}
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
          No hay usuarios registrados todavia.
        </div>
      ) : (
        <div className="space-y-4">
          {usuariosFiltrados.map((usuario) => (
            <div
              key={usuario.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Mail className="h-4 w-4 text-sky-600" />
                    <span className="font-medium">{usuario.email}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <UserRound className="h-4 w-4" />
                    <span>{usuario.user_id || "Sin user_id visible"}</span>
                  </div>
                </div>

                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  {usuario.created_at
                    ? new Date(usuario.created_at).toLocaleString("es-UY")
                    : "Sin fecha"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
