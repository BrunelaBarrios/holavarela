'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  BellRing,
  KeyRound,
  Link2,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react"
import { supabase } from "../../supabase"
import { getAdminSession } from "../../lib/adminAuth"
import { logAdminActivity } from "../../lib/adminActivity"

type OwnerType = "comercio" | "servicio" | "curso" | "institucion"

type UsuarioRegistrado = {
  id: number
  user_id: string | null
  email: string
  created_at: string | null
}

type OwnerOption = {
  id: number
  nombre: string
  owner_email?: string | null
}

type PasswordResetRequest = {
  id: number
  user_id: string | null
  email: string
  contact_name: string | null
  phone: string | null
  message: string | null
  status: string
  created_at: string | null
}

type UserForm = {
  id: number | null
  userId: string | null
  currentEmail: string
  email: string
  password: string
  ownerType: OwnerType | ""
  ownerId: string
  adminPassword: string
  requestId: number | null
}

const initialForm: UserForm = {
  id: null,
  userId: null,
  currentEmail: "",
  email: "",
  password: "",
  ownerType: "",
  ownerId: "",
  adminPassword: "",
  requestId: null,
}

const ownerTypeLabels: Record<OwnerType, string> = {
  comercio: "Comercio",
  servicio: "Servicio",
  curso: "Curso o clase",
  institucion: "Institucion",
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioRegistrado[]>([])
  const [solicitudes, setSolicitudes] = useState<PasswordResetRequest[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<UserForm>(initialForm)
  const [ownerOptions, setOwnerOptions] = useState<Record<OwnerType, OwnerOption[]>>({
    comercio: [],
    servicio: [],
    curso: [],
    institucion: [],
  })
  const [deleteTarget, setDeleteTarget] = useState<UsuarioRegistrado | null>(null)
  const [deleteAdminPassword, setDeleteAdminPassword] = useState("")
  const [deleting, setDeleting] = useState(false)

  const adminSession = getAdminSession()

  const cargarUsuarios = async () => {
    const { data, error: loadError } = await supabase
      .from("usuarios_registrados")
      .select("*")
      .order("created_at", { ascending: false })

    if (loadError) {
      throw new Error(`Error al cargar usuarios: ${loadError.message}`)
    }

    setUsuarios((data || []) as UsuarioRegistrado[])
  }

  const cargarSolicitudes = async () => {
    const { data, error: loadError } = await supabase
      .from("password_reset_requests")
      .select("id, user_id, email, contact_name, phone, message, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (loadError) {
      throw new Error(`Error al cargar solicitudes: ${loadError.message}`)
    }

    setSolicitudes((data || []) as PasswordResetRequest[])
  }

  const cargarOpciones = async () => {
    const [comerciosResult, serviciosResult, cursosResult, institucionesResult] =
      await Promise.all([
        supabase
          .from("comercios")
          .select("id, nombre, owner_email")
          .order("nombre", { ascending: true }),
        supabase
          .from("servicios")
          .select("id, nombre, owner_email")
          .order("nombre", { ascending: true }),
        supabase
          .from("cursos")
          .select("id, nombre, owner_email")
          .order("nombre", { ascending: true }),
        supabase
          .from("instituciones")
          .select("id, nombre, owner_email")
          .order("nombre", { ascending: true }),
      ])

    const firstError =
      comerciosResult.error ||
      serviciosResult.error ||
      cursosResult.error ||
      institucionesResult.error

    if (firstError) {
      throw new Error(`Error al cargar perfiles para asignar: ${firstError.message}`)
    }

    setOwnerOptions({
      comercio: (comerciosResult.data || []) as OwnerOption[],
      servicio: (serviciosResult.data || []) as OwnerOption[],
      curso: (cursosResult.data || []) as OwnerOption[],
      institucion: (institucionesResult.data || []) as OwnerOption[],
    })
  }

  const refrescarPantalla = useCallback(async () => {
    setError("")
    setLoading(true)

    try {
      await Promise.all([cargarUsuarios(), cargarSolicitudes(), cargarOpciones()])
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No pudimos cargar la administracion de usuarios."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refrescarPantalla()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [refrescarPantalla])

  const ownerLinkByEmail = useMemo(() => {
    const map = new Map<string, { type: OwnerType; id: number; label: string }>()

    ;(Object.keys(ownerOptions) as OwnerType[]).forEach((type) => {
      ownerOptions[type].forEach((item) => {
        if (item.owner_email) {
          map.set(item.owner_email.toLowerCase(), {
            type,
            id: item.id,
            label: `${ownerTypeLabels[type]}: ${item.nombre}`,
          })
        }
      })
    })

    return map
  }, [ownerOptions])

  const usersByEmail = useMemo(() => {
    const map = new Map<string, UsuarioRegistrado>()
    usuarios.forEach((usuario) => {
      map.set(usuario.email.toLowerCase(), usuario)
    })
    return map
  }, [usuarios])

  const pendingRequestsByEmail = useMemo(() => {
    const map = new Map<string, PasswordResetRequest[]>()

    solicitudes.forEach((solicitud) => {
      const key = solicitud.email.toLowerCase()
      const current = map.get(key) || []
      current.push(solicitud)
      map.set(key, current)
    })

    return map
  }, [solicitudes])

  const usuariosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return usuarios

    return usuarios.filter((usuario) => {
      const assignment = ownerLinkByEmail.get(usuario.email.toLowerCase())?.label || ""
      const pendingRequests = pendingRequestsByEmail.get(usuario.email.toLowerCase())?.length || 0
      return `${usuario.email} ${usuario.user_id || ""} ${assignment} ${pendingRequests}`
        .toLowerCase()
        .includes(term)
    })
  }, [ownerLinkByEmail, pendingRequestsByEmail, search, usuarios])

  const selectedOwnerOptions = formData.ownerType ? ownerOptions[formData.ownerType] : []

  const resetForm = () => {
    setFormData(initialForm)
    setFormMode("create")
    setIsFormOpen(false)
    setError("")
  }

  const openCreateForm = () => {
    setFormMode("create")
    setFormData(initialForm)
    setError("")
    setIsFormOpen(true)
  }

  const openEditForm = (
    usuario: UsuarioRegistrado,
    options?: { requestId?: number | null }
  ) => {
    const linkedOwner = ownerLinkByEmail.get(usuario.email.toLowerCase())

    setFormMode("edit")
    setFormData({
      id: usuario.id,
      userId: usuario.user_id,
      currentEmail: usuario.email,
      email: usuario.email,
      password: "",
      ownerType: linkedOwner?.type || "",
      ownerId: linkedOwner ? String(linkedOwner.id) : "",
      adminPassword: "",
      requestId: options?.requestId || null,
    })
    setError("")
    setIsFormOpen(true)
  }

  const closeDeleteModal = () => {
    setDeleteTarget(null)
    setDeleteAdminPassword("")
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSaving(true)

    if (!adminSession?.username) {
      setError("No encontramos la sesion admin actual.")
      setSaving(false)
      return
    }

    const isCreate = formMode === "create"
    const response = await fetch("/api/admin/users", {
      method: isCreate ? "POST" : "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: formData.id,
        userId: formData.userId,
        currentEmail: formData.currentEmail,
        email: formData.email,
        password: formData.password || undefined,
        ownerType: formData.ownerType || null,
        ownerId: formData.ownerId ? Number(formData.ownerId) : null,
        adminUsername: adminSession.username,
        adminPassword: formData.adminPassword,
        requestId: formData.requestId,
      }),
    })

    const result = (await response.json()) as { error?: string }

    if (!response.ok) {
      setError(result.error || "No pudimos guardar el usuario.")
      setSaving(false)
      return
    }

    await logAdminActivity({
      action: isCreate
        ? "Crear usuario"
        : formData.password
          ? "Actualizar usuario y asignar nueva contrasena"
          : "Editar usuario",
      section: "Usuarios",
      target: formData.email,
      details:
        formData.requestId && formData.password
          ? `Solicitud #${formData.requestId} resuelta desde admin`
          : formData.ownerType && formData.ownerId
            ? `${ownerTypeLabels[formData.ownerType]} ID ${formData.ownerId}`
            : "Sin perfil vinculado",
    })

    await refrescarPantalla()
    resetForm()
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget || !adminSession?.username) {
      return
    }

    setDeleting(true)
    setError("")

    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: deleteTarget.id,
        userId: deleteTarget.user_id,
        email: deleteTarget.email,
        adminUsername: adminSession.username,
        adminPassword: deleteAdminPassword,
      }),
    })

    const result = (await response.json()) as { error?: string }

    if (!response.ok) {
      setError(result.error || "No pudimos borrar el usuario.")
      setDeleting(false)
      return
    }

    await logAdminActivity({
      action: "Borrar usuario",
      section: "Usuarios",
      target: deleteTarget.email,
      details: "Cuenta eliminada desde administracion",
    })

    await refrescarPantalla()
    closeDeleteModal()
    setDeleting(false)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">Usuarios registrados</h1>
          <p className="text-slate-500">
            Gestiona usuarios, solicitudes de nueva contrasena y vinculos con perfiles desde un solo lugar.
          </p>
        </div>

        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500"
        >
          <Plus className="h-5 w-5" />
          Crear usuario
        </button>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                Notificaciones
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {solicitudes.length} solicitud{solicitudes.length === 1 ? "" : "es"} pendiente
                {solicitudes.length === 1 ? "" : "s"}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Cada pedido aparece aqui para que puedas asignar una nueva contrasena desde admin.
              </p>
            </div>
            <div className="rounded-2xl bg-violet-600 p-3 text-white">
              <BellRing className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Usuarios
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {usuarios.length} cuenta{usuarios.length === 1 ? "" : "s"} registrad
                {usuarios.length === 1 ? "a" : "as"}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Puedes editar email, reasignar perfil, crear una nueva clave o borrar la cuenta.
              </p>
            </div>
            <div className="rounded-2xl bg-sky-600 p-3 text-white">
              <UserRound className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {formMode === "create" ? "Nuevo usuario" : "Editar usuario"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formMode === "create"
                    ? "La cuenta se crea en Supabase Auth y puede quedar vinculada a un perfil existente."
                    : "Puedes cambiar email, asignacion y cargar una nueva contrasena sin ver la clave anterior."}
                </p>
              </div>

              <button
                onClick={resetForm}
                className="text-slate-500 transition hover:text-slate-900"
                aria-label="Cerrar formulario"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {formData.requestId ? (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                  Esta accion resolvera la solicitud pendiente #{formData.requestId} apenas guardes la nueva contrasena.
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, email: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    {formMode === "create" ? "Contrasena inicial" : "Nueva contrasena"}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, password: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                    minLength={formMode === "create" ? 6 : undefined}
                    required={formMode === "create"}
                    placeholder={
                      formMode === "create"
                        ? "Minimo 6 caracteres"
                        : "Opcional. Solo si vas a asignar una nueva clave"
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-sm font-medium text-slate-900">Asignacion opcional</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Tipo de perfil</label>
                    <select
                      value={formData.ownerType}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          ownerType: event.target.value as OwnerType | "",
                          ownerId: "",
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    >
                      <option value="">Sin asignar</option>
                      <option value="comercio">Comercio</option>
                      <option value="servicio">Servicio</option>
                      <option value="curso">Curso o clase</option>
                      <option value="institucion">Institucion</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Perfil</label>
                    <select
                      value={formData.ownerId}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, ownerId: event.target.value }))
                      }
                      disabled={!formData.ownerType}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none disabled:bg-slate-100"
                    >
                      <option value="">
                        {formData.ownerType ? "Sin perfil por ahora" : "Primero elige el tipo"}
                      </option>
                      {selectedOwnerOptions.map((item) => {
                        const isCurrentSelection = formData.ownerId === String(item.id)
                        const ownerEmail = item.owner_email?.toLowerCase() || ""
                        const isTakenByAnotherEmail =
                          Boolean(ownerEmail) &&
                          ownerEmail !== formData.currentEmail.toLowerCase()

                        return (
                          <option
                            key={item.id}
                            value={item.id}
                            disabled={isTakenByAnotherEmail && !isCurrentSelection}
                          >
                            {item.nombre}
                            {isTakenByAnotherEmail ? " - ya vinculado" : ""}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Confirma con tu contrasena de admin
                </label>
                <input
                  type="password"
                  value={formData.adminPassword}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, adminPassword: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {saving
                    ? "Guardando..."
                    : formMode === "create"
                      ? "Crear usuario"
                      : formData.requestId
                        ? "Guardar y resolver solicitud"
                        : "Guardar cambios"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Borrar usuario</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Se eliminara la cuenta {deleteTarget.email}. Si tiene solicitudes pendientes de contrasena tambien quedaran resueltas.
              </p>
            </div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              Confirma con tu contrasena de admin
            </label>
            <input
              type="password"
              value={deleteAdminPassword}
              onChange={(event) => setDeleteAdminPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
              placeholder="Contrasena de admin"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-3 font-medium text-white transition hover:bg-rose-500 disabled:opacity-60"
              >
                {deleting ? "Borrando..." : "Borrar usuario"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {solicitudes.length > 0 ? (
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Solicitudes de acceso
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Pedidos de nueva contrasena
            </h2>
          </div>

          <div className="space-y-4">
            {solicitudes.map((solicitud) => {
              const matchedUser = usersByEmail.get(solicitud.email.toLowerCase()) || null

              return (
                <div
                  key={solicitud.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-900">
                        <Mail className="h-4 w-4 text-violet-600" />
                        <span className="font-medium">{solicitud.email}</span>
                      </div>

                      {solicitud.contact_name ? (
                        <div className="text-sm text-slate-600">
                          Referencia: {solicitud.contact_name}
                        </div>
                      ) : null}

                      {solicitud.phone ? (
                        <div className="text-sm text-slate-600">Telefono: {solicitud.phone}</div>
                      ) : null}

                      {solicitud.message ? (
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                          {solicitud.message}
                        </div>
                      ) : null}

                      <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                        {solicitud.created_at
                          ? new Date(solicitud.created_at).toLocaleString("es-UY")
                          : "Sin fecha"}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {matchedUser ? (
                        <>
                          <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                            Usuario encontrado
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditForm(matchedUser, { requestId: solicitud.id })}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-500"
                          >
                            <KeyRound className="h-4 w-4" />
                            Asignar nueva contrasena
                          </button>
                        </>
                      ) : (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          No hay un usuario registrado con este email todavia.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      <div className="mb-6 max-w-xl">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por email, asignacion o ID de usuario"
            className="w-full text-sm outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
          Cargando usuarios...
        </div>
      ) : error && !isFormOpen ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">
          {error}
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
          No hay usuarios registrados todavia.
        </div>
      ) : (
        <div className="space-y-4">
          {usuariosFiltrados.map((usuario) => {
            const linkedProfile = ownerLinkByEmail.get(usuario.email.toLowerCase()) || null
            const pendingRequests = pendingRequestsByEmail.get(usuario.email.toLowerCase()) || []

            return (
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

                    {linkedProfile ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Link2 className="h-4 w-4 text-emerald-600" />
                        <span>{linkedProfile.label}</span>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400">Sin perfil vinculado</div>
                    )}

                    {pendingRequests.length > 0 ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
                        <BellRing className="h-3.5 w-3.5" />
                        {pendingRequests.length} solicitud{pendingRequests.length === 1 ? "" : "es"} pendiente
                        {pendingRequests.length === 1 ? "" : "s"}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                      {usuario.created_at
                        ? new Date(usuario.created_at).toLocaleString("es-UY")
                        : "Sin fecha"}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(usuario)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(usuario, { requestId: pendingRequests[0]?.id || null })
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
                      >
                        <KeyRound className="h-4 w-4" />
                        Nueva contrasena
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(usuario)
                          setDeleteAdminPassword("")
                          setError("")
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Borrar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
