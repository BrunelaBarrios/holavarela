'use client'

import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { AccessPageShell } from "../../components/AccessPageShell"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { supabase } from "../../supabase"

type EntityType = "comercio" | "servicio" | "curso" | "institucion"

type ExistingMatch = {
  id: number
  nombre: string
}

type ComercioDraft = {
  nombre: string
  direccion: string
  telefono: string
  descripcion: string
  usaWhatsapp: boolean
}

type ServicioDraft = {
  nombre: string
  categoria: string
  descripcion: string
  responsable: string
  contacto: string
  direccion: string
  usaWhatsapp: boolean
}

type CursoDraft = {
  nombre: string
  descripcion: string
  responsable: string
  contacto: string
  usaWhatsapp: boolean
}

type InstitucionDraft = {
  nombre: string
  descripcion: string
  direccion: string
  telefono: string
  usaWhatsapp: boolean
}

const entityLabels: Record<EntityType, string> = {
  comercio: "Comercio",
  servicio: "Servicio",
  curso: "Curso o clase",
  institucion: "Institucion",
}

const serviceCategories = ["Profesionales", "Alojamientos", "Oficios", "Servicios"]

const initialComercio: ComercioDraft = {
  nombre: "",
  direccion: "",
  telefono: "",
  descripcion: "",
  usaWhatsapp: true,
}

const initialServicio: ServicioDraft = {
  nombre: "",
  categoria: "Profesionales",
  descripcion: "",
  responsable: "",
  contacto: "",
  direccion: "",
  usaWhatsapp: true,
}

const initialCurso: CursoDraft = {
  nombre: "",
  descripcion: "",
  responsable: "",
  contacto: "",
  usaWhatsapp: true,
}

const initialInstitucion: InstitucionDraft = {
  nombre: "",
  descripcion: "",
  direccion: "",
  telefono: "",
  usaWhatsapp: true,
}

function buildSearchQuery(type: EntityType) {
  switch (type) {
    case "comercio":
      return supabase.from("comercios").select("id, nombre")
    case "servicio":
      return supabase.from("servicios").select("id, nombre")
    case "curso":
      return supabase.from("cursos").select("id, nombre")
    case "institucion":
      return supabase.from("instituciones").select("id, nombre")
  }
}

function buildSummary(type: EntityType, drafts: {
  comercio: ComercioDraft
  servicio: ServicioDraft
  curso: CursoDraft
  institucion: InstitucionDraft
}) {
  switch (type) {
    case "comercio":
      return [
        `Nombre: ${drafts.comercio.nombre}`,
        drafts.comercio.direccion ? `Direccion: ${drafts.comercio.direccion}` : null,
        drafts.comercio.telefono ? `Telefono del comercio: ${drafts.comercio.telefono}` : null,
        drafts.comercio.descripcion ? `Descripcion: ${drafts.comercio.descripcion}` : null,
      ].filter(Boolean) as string[]
    case "servicio":
      return [
        `Nombre: ${drafts.servicio.nombre}`,
        `Categoria: ${drafts.servicio.categoria}`,
        drafts.servicio.responsable ? `Responsable: ${drafts.servicio.responsable}` : null,
        drafts.servicio.contacto ? `Contacto: ${drafts.servicio.contacto}` : null,
        drafts.servicio.direccion ? `Direccion: ${drafts.servicio.direccion}` : null,
        drafts.servicio.descripcion ? `Descripcion: ${drafts.servicio.descripcion}` : null,
      ].filter(Boolean) as string[]
    case "curso":
      return [
        `Nombre: ${drafts.curso.nombre}`,
        `Responsable: ${drafts.curso.responsable}`,
        `Contacto: ${drafts.curso.contacto}`,
        `Descripcion: ${drafts.curso.descripcion}`,
      ]
    case "institucion":
      return [
        `Nombre: ${drafts.institucion.nombre}`,
        drafts.institucion.direccion ? `Direccion: ${drafts.institucion.direccion}` : null,
        drafts.institucion.telefono ? `Telefono: ${drafts.institucion.telefono}` : null,
        drafts.institucion.descripcion ? `Descripcion: ${drafts.institucion.descripcion}` : null,
      ].filter(Boolean) as string[]
  }
}

function buildContactMessage(params: {
  type: EntityType
  mode: "existing" | "new"
  representativeName: string
  representativePhone: string
  userEmail: string
  comments: string
  summary: string[]
  existingMatch?: ExistingMatch | null
  insertedId?: number | null
}) {
  return [
    "Solicitud de alta desde /sumate",
    `Tipo: ${entityLabels[params.type]}`,
    `Modo: ${params.mode === "existing" ? "Registro existente" : "Carga nueva"}`,
    params.existingMatch
      ? `Registro seleccionado: ${params.existingMatch.nombre} (ID ${params.existingMatch.id})`
      : null,
    params.insertedId ? `Registro creado: ID ${params.insertedId}` : null,
    `Representante: ${params.representativeName}`,
    `Email de acceso: ${params.userEmail}`,
    `Telefono de referencia: ${params.representativePhone}`,
    ...params.summary,
    params.comments.trim() ? `Comentarios adicionales: ${params.comments.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n")
}

export default function SumateAltaPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState("")
  const [representativeName, setRepresentativeName] = useState("")
  const [representativePhone, setRepresentativePhone] = useState("")
  const [comments, setComments] = useState("")
  const [entityType, setEntityType] = useState<EntityType>("comercio")
  const [searchTerm, setSearchTerm] = useState("")
  const [matches, setMatches] = useState<ExistingMatch[]>([])
  const [selectedMatch, setSelectedMatch] = useState<ExistingMatch | null>(null)
  const [createNew, setCreateNew] = useState(false)
  const [comercio, setComercio] = useState<ComercioDraft>(initialComercio)
  const [servicio, setServicio] = useState<ServicioDraft>(initialServicio)
  const [curso, setCurso] = useState<CursoDraft>(initialCurso)
  const [institucion, setInstitucion] = useState<InstitucionDraft>(initialInstitucion)

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace("/sumate/login")
        return
      }

      const { data: existingRequest } = await supabase
        .from("contacto_solicitudes")
        .select("id")
        .eq("email", session.user.email ?? "")
        .like("mensaje", "Solicitud de alta desde /sumate%")
        .order("created_at", { ascending: false })
        .limit(1)

      if (existingRequest?.length) {
        router.replace("/sumate")
        return
      }

      setUser(session.user)
      setLoadingSession(false)
    }

    void loadSession()
  }, [router])

  useEffect(() => {
    const trimmedTerm = searchTerm.trim()

    if (trimmedTerm.length < 2) {
      return
    }

    let cancelled = false

    const loadMatches = async () => {
      setSearchLoading(true)

      const query = buildSearchQuery(entityType)
      const { data, error: loadError } = await query
        .ilike("nombre", `%${trimmedTerm}%`)
        .order("nombre", { ascending: true })
        .limit(6)

      if (cancelled) return

      if (loadError) {
        setMatches([])
        setSearchLoading(false)
        return
      }

      setMatches((data as ExistingMatch[]) || [])
      setSearchLoading(false)
    }

    void loadMatches()

    return () => {
      cancelled = true
    }
  }, [entityType, searchTerm])

  const summaryLines = useMemo(
    () => buildSummary(entityType, { comercio, servicio, curso, institucion }),
    [comercio, curso, entityType, institucion, servicio]
  )

  const handleComercioChange =
    (field: keyof ComercioDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        field === "usaWhatsapp"
          ? (event.target as HTMLInputElement).checked
          : event.target.value

      setComercio((current) => ({
        ...current,
        [field]: value,
      }))
    }

  const handleServicioChange =
    (field: keyof ServicioDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value =
        field === "usaWhatsapp"
          ? (event.target as HTMLInputElement).checked
          : event.target.value

      setServicio((current) => ({
        ...current,
        [field]: value,
      }))
    }

  const handleCursoChange =
    (field: keyof CursoDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        field === "usaWhatsapp"
          ? (event.target as HTMLInputElement).checked
          : event.target.value

      setCurso((current) => ({
        ...current,
        [field]: value,
      }))
    }

  const handleInstitucionChange =
    (field: keyof InstitucionDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        field === "usaWhatsapp"
          ? (event.target as HTMLInputElement).checked
          : event.target.value

      setInstitucion((current) => ({
        ...current,
        [field]: value,
      }))
    }

  const validateNewEntry = () => {
    if (entityType === "comercio") return comercio.nombre.trim().length > 0
    if (entityType === "servicio") return servicio.nombre.trim().length > 0

    if (entityType === "curso") {
      return (
        curso.nombre.trim().length > 0 &&
        curso.descripcion.trim().length > 0 &&
        curso.responsable.trim().length > 0 &&
        curso.contacto.trim().length > 0
      )
    }

    return institucion.nombre.trim().length > 0
  }

  const insertNewRecord = async () => {
    if (entityType === "comercio") {
      const payload = {
        nombre: comercio.nombre.trim(),
        direccion: comercio.direccion.trim() || null,
        telefono: comercio.telefono.trim() || representativePhone.trim() || null,
        descripcion: comercio.descripcion.trim() || null,
        imagen_url: null,
        estado: "borrador",
        destacado: false,
        usa_whatsapp: comercio.usaWhatsapp,
      }

      return await supabase.from("comercios").insert([payload]).select("id").single()
    }

    if (entityType === "servicio") {
      const payload = {
        nombre: servicio.nombre.trim(),
        categoria: servicio.categoria,
        descripcion: servicio.descripcion.trim() || null,
        responsable: servicio.responsable.trim() || representativeName.trim() || null,
        contacto: servicio.contacto.trim() || representativePhone.trim() || null,
        direccion: servicio.direccion.trim() || null,
        imagen: null,
        estado: "borrador",
        destacado: false,
        usa_whatsapp: servicio.usaWhatsapp,
      }

      return await supabase.from("servicios").insert([payload]).select("id").single()
    }

    if (entityType === "curso") {
      const payload = {
        nombre: curso.nombre.trim(),
        descripcion: curso.descripcion.trim(),
        responsable: curso.responsable.trim(),
        contacto: curso.contacto.trim(),
        imagen: null,
        estado: "borrador",
        destacado: false,
        usa_whatsapp: curso.usaWhatsapp,
      }

      return await supabase.from("cursos").insert([payload]).select("id").single()
    }

    const payload = {
      nombre: institucion.nombre.trim(),
      descripcion: institucion.descripcion.trim() || null,
      direccion: institucion.direccion.trim() || null,
      telefono: institucion.telefono.trim() || representativePhone.trim() || null,
      foto: null,
      estado: "borrador",
      usa_whatsapp: institucion.usaWhatsapp,
    }

    return await supabase.from("instituciones").insert([payload]).select("id").single()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!user?.email) {
      setError("Necesitas iniciar sesion para continuar con el alta.")
      return
    }

    if (!representativeName.trim() || !representativePhone.trim()) {
      setError("Completa tu nombre y telefono para continuar.")
      return
    }

    if (!createNew && !selectedMatch) {
      setError("Selecciona un registro existente o indica que quieres cargar uno nuevo.")
      return
    }

    if (createNew && !validateNewEntry()) {
      setError("Completa los datos requeridos del nuevo registro.")
      return
    }

    setLoadingSubmit(true)

    const { data: existingRequest, error: existingRequestError } = await supabase
      .from("contacto_solicitudes")
      .select("id")
      .eq("email", user.email)
      .like("mensaje", "Solicitud de alta desde /sumate%")
      .order("created_at", { ascending: false })
      .limit(1)

    if (existingRequestError) {
      setError("No pudimos validar tu solicitud anterior. Proba de nuevo en unos minutos.")
      setLoadingSubmit(false)
      return
    }

    if (existingRequest?.length) {
      router.replace("/sumate")
      router.refresh()
      return
    }

    let insertedId: number | null = null

    if (createNew) {
      const { data, error: insertError } = await insertNewRecord()

      if (insertError) {
        setError(`No pudimos guardar el registro nuevo: ${insertError.message}`)
        setLoadingSubmit(false)
        return
      }

      insertedId = Number(data?.id ?? null)
    }

    const payload = {
      nombre: representativeName.trim(),
      email: user.email,
      telefono: representativePhone.trim(),
      mensaje: buildContactMessage({
        type: entityType,
        mode: createNew ? "new" : "existing",
        representativeName: representativeName.trim(),
        representativePhone: representativePhone.trim(),
        userEmail: user.email,
        comments,
        summary: summaryLines,
        existingMatch: selectedMatch,
        insertedId,
      }),
    }

    const { error: contactError } = await supabase.from("contacto_solicitudes").insert([payload])

    if (contactError) {
      setError("Guardamos parte de la informacion, pero no pudimos registrar la solicitud final. Proba de nuevo.")
      setLoadingSubmit(false)
      return
    }

    router.push("/suscripcion-exitosa")
    router.refresh()
  }

  return (
    <AccessPageShell
      eyebrow="Alta"
      title="Completa tu solicitud"
      description="Elegi si representas un comercio, servicio, curso o institucion. Puedes buscar si ya esta registrado o cargar los datos para dejarlo ingresado."
      secondaryLink={{ href: "/sumate", label: "Volver a acceso" }}
    >
      {loadingSession ? (
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          Verificando sesion...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/70 p-5 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">Cuenta conectada</div>
            <div className="mt-2">{user?.email}</div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="representativeName" className="text-sm font-medium text-slate-700">
                Tu nombre
              </label>
              <input
                id="representativeName"
                type="text"
                value={representativeName}
                onChange={(event) => setRepresentativeName(event.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="representativePhone" className="text-sm font-medium text-slate-700">
                Telefono
              </label>
              <input
                id="representativePhone"
                type="tel"
                value={representativePhone}
                onChange={(event) => setRepresentativePhone(event.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-700">Que representas</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(entityLabels) as EntityType[]).map((type) => (
                <label
                  key={type}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    entityType === type
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-700 hover:border-blue-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="entityType"
                    value={type}
                    checked={entityType === type}
                    onChange={() => {
                      setEntityType(type)
                      setSelectedMatch(null)
                      setSearchTerm("")
                      setMatches([])
                    }}
                    className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{entityLabels[type]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-medium text-slate-700">Busca si ya esta registrado</div>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                const nextValue = event.target.value
                setSearchTerm(nextValue)

                if (nextValue.trim().length < 2) {
                  setMatches([])
                  setSelectedMatch(null)
                }
              }}
              placeholder={`Buscar ${entityLabels[entityType].toLowerCase()} por nombre`}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
            />

            {searchLoading ? (
              <div className="text-sm text-slate-500">Buscando registros...</div>
            ) : searchTerm.trim().length >= 2 && matches.length > 0 ? (
              <div className="space-y-2">
                {matches.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => {
                      setSelectedMatch(match)
                      setCreateNew(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      selectedMatch?.id === match.id && !createNew
                        ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                    }`}
                  >
                    <span>{match.nombre}</span>
                    <span className="text-xs text-slate-400">ID {match.id}</span>
                  </button>
                ))}
              </div>
            ) : searchTerm.trim().length >= 2 ? (
              <div className="text-sm text-slate-500">
                No encontramos coincidencias. Puedes cargarlo como nuevo.
              </div>
            ) : (
              <div className="text-sm text-slate-500">Escribe al menos 2 letras para buscar.</div>
            )}

            <button
              type="button"
              onClick={() => {
                setCreateNew(true)
                setSelectedMatch(null)
              }}
              className={`rounded-full border border-slate-200 px-4 py-2 text-sm font-medium transition ${
                createNew ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:border-blue-300"
              }`}
            >
              No esta registrado, quiero cargarlo
            </button>
          </div>

          {createNew ? (
            <div className="space-y-5 rounded-[24px] border border-blue-200 bg-blue-50/40 p-5">
              <div className="text-sm font-medium text-slate-700">
                Datos del nuevo {entityLabels[entityType].toLowerCase()}
              </div>
              {entityType === "comercio" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nombre del comercio</label>
                    <input
                      type="text"
                      value={comercio.nombre}
                      onChange={handleComercioChange("nombre")}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Direccion</label>
                      <input
                        type="text"
                        value={comercio.direccion}
                        onChange={handleComercioChange("direccion")}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Telefono del comercio</label>
                      <input
                        type="text"
                        value={comercio.telefono}
                        onChange={handleComercioChange("telefono")}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Descripcion</label>
                    <textarea
                      value={comercio.descripcion}
                      onChange={handleComercioChange("descripcion")}
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={comercio.usaWhatsapp}
                      onChange={handleComercioChange("usaWhatsapp")}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>El telefono del comercio tiene WhatsApp</span>
                  </label>
                </>
              ) : null}

              {entityType === "servicio" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nombre del servicio</label>
                    <input
                      type="text"
                      value={servicio.nombre}
                      onChange={handleServicioChange("nombre")}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Categoria</label>
                    <select
                      value={servicio.categoria}
                      onChange={handleServicioChange("categoria")}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                    >
                      {serviceCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Responsable</label>
                      <input
                        type="text"
                        value={servicio.responsable}
                        onChange={handleServicioChange("responsable")}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Contacto</label>
                      <input
                        type="text"
                        value={servicio.contacto}
                        onChange={handleServicioChange("contacto")}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Direccion</label>
                    <input
                      type="text"
                      value={servicio.direccion}
                      onChange={handleServicioChange("direccion")}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Descripcion</label>
                    <textarea
                      value={servicio.descripcion}
                      onChange={handleServicioChange("descripcion")}
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={servicio.usaWhatsapp}
                      onChange={handleServicioChange("usaWhatsapp")}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>El contacto del servicio tiene WhatsApp</span>
                  </label>
                </>
              ) : null}
              {entityType === "curso" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nombre del curso o clase</label>
                    <input
                      type="text"
                      value={curso.nombre}
                      onChange={handleCursoChange("nombre")}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Descripcion</label>
                    <textarea
                      value={curso.descripcion}
                      onChange={handleCursoChange("descripcion")}
                      rows={4}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Responsable</label>
                      <input
                        type="text"
                        value={curso.responsable}
                        onChange={handleCursoChange("responsable")}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Contacto</label>
                      <input
                        type="text"
                        value={curso.contacto}
                        onChange={handleCursoChange("contacto")}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={curso.usaWhatsapp}
                      onChange={handleCursoChange("usaWhatsapp")}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>El contacto del curso tiene WhatsApp</span>
                  </label>
                </>
              ) : null}

              {entityType === "institucion" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nombre de la institucion</label>
                    <input
                      type="text"
                      value={institucion.nombre}
                      onChange={handleInstitucionChange("nombre")}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Direccion</label>
                      <input
                        type="text"
                        value={institucion.direccion}
                        onChange={handleInstitucionChange("direccion")}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Telefono</label>
                      <input
                        type="text"
                        value={institucion.telefono}
                        onChange={handleInstitucionChange("telefono")}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Descripcion</label>
                    <textarea
                      value={institucion.descripcion}
                      onChange={handleInstitucionChange("descripcion")}
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={institucion.usaWhatsapp}
                      onChange={handleInstitucionChange("usaWhatsapp")}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>El telefono de la institucion tiene WhatsApp</span>
                  </label>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="comments" className="text-sm font-medium text-slate-700">
              Comentarios adicionales
            </label>
            <textarea
              id="comments"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              rows={4}
              placeholder="Si quieres, deja una aclaracion sobre el registro o sobre tu solicitud."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
            />
          </div>

          {error ? <AuthFormStatus tone="error" message={error} /> : null}

          <button
            type="submit"
            disabled={loadingSubmit}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
          >
            {loadingSubmit
              ? "Enviando solicitud..."
              : createNew
                ? "Guardar datos y enviar solicitud"
                : "Continuar con este registro"}
          </button>
        </form>
      )}
    </AccessPageShell>
  )
}
