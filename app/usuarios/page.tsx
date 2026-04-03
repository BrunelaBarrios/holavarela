'use client'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import { CalendarDays, CircleCheckBig, Clock3, CreditCard, ExternalLink, FilePenLine, ImageIcon, KeyRound, LogOut, PlusCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthFormStatus } from "../components/AuthFormStatus"
import { getSubscriptionPlan, subscriptionPlans, type SubscriptionPlanKey } from "../lib/subscriptionPlans"
import { getSubscriptionStatusBadge, getSubscriptionStatusLabel } from "../lib/subscriptionStatus"
import { buildUserProfileFields, fetchUserOwnedEvents, findUserOwnedEntity, getUserProfileImageSrc, normalizeUserEntityStatus, supportsPremiumProfile, userEntityLabels, userEntityStatusCopy, type UserEntityType, type UserOwnedEntity, type UserOwnedEvent } from "../lib/userProfiles"
import { supabase } from "../supabase"

type ExternalLinksForm = { webUrl: string; instagramUrl: string; facebookUrl: string }
type ComercioForm = ExternalLinksForm & { nombre: string; direccion: string; telefono: string; descripcion: string; usaWhatsapp: boolean }
type ServicioForm = ExternalLinksForm & { nombre: string; categoria: string; descripcion: string; responsable: string; contacto: string; direccion: string; usaWhatsapp: boolean }
type CursoForm = ExternalLinksForm & { nombre: string; descripcion: string; responsable: string; contacto: string; usaWhatsapp: boolean }
type InstitucionForm = ExternalLinksForm & { nombre: string; descripcion: string; direccion: string; telefono: string; usaWhatsapp: boolean }

const serviceCategories = ["Profesionales", "Alojamientos", "Oficios", "Servicios"]
const initialComercio: ComercioForm = { nombre: "", direccion: "", telefono: "", descripcion: "", webUrl: "", instagramUrl: "", facebookUrl: "", usaWhatsapp: true }
const initialServicio: ServicioForm = { nombre: "", categoria: "Profesionales", descripcion: "", responsable: "", contacto: "", direccion: "", webUrl: "", instagramUrl: "", facebookUrl: "", usaWhatsapp: true }
const initialCurso: CursoForm = { nombre: "", descripcion: "", responsable: "", contacto: "", webUrl: "", instagramUrl: "", facebookUrl: "", usaWhatsapp: true }
const initialInstitucion: InstitucionForm = { nombre: "", descripcion: "", direccion: "", telefono: "", webUrl: "", instagramUrl: "", facebookUrl: "", usaWhatsapp: true }

function formatEventState(status?: string | null) {
  const normalized = normalizeUserEntityStatus(status)
  if (normalized === "borrador") return "Borrador"
  if (normalized === "oculto") return "Oculto"
  return "Activo"
}

function getStatusStyles(status: "activo" | "borrador" | "oculto") {
  if (status === "borrador") return { badge: "bg-amber-100 text-amber-800", panel: "border-amber-200 bg-amber-50/70", accent: "text-amber-700" }
  if (status === "oculto") return { badge: "bg-slate-200 text-slate-700", panel: "border-slate-200 bg-slate-100", accent: "text-slate-700" }
  return { badge: "bg-emerald-100 text-emerald-800", panel: "border-emerald-200 bg-emerald-50/70", accent: "text-emerald-700" }
}

function buildOnboardingPayload(params: { type: UserEntityType; email: string; comercio: ComercioForm; servicio: ServicioForm; curso: CursoForm; institucion: InstitucionForm }) {
  if (params.type === "comercio") {
    return { table: "comercios" as const, payload: { nombre: params.comercio.nombre.trim(), direccion: params.comercio.direccion.trim() || null, telefono: params.comercio.telefono.trim() || null, descripcion: params.comercio.descripcion.trim() || null, web_url: params.comercio.webUrl.trim() || null, instagram_url: params.comercio.instagramUrl.trim() || null, facebook_url: params.comercio.facebookUrl.trim() || null, imagen_url: null, estado: "borrador", owner_email: params.email, usa_whatsapp: params.comercio.usaWhatsapp } }
  }
  if (params.type === "servicio") {
    return { table: "servicios" as const, payload: { nombre: params.servicio.nombre.trim(), categoria: params.servicio.categoria, descripcion: params.servicio.descripcion.trim() || null, responsable: params.servicio.responsable.trim() || null, contacto: params.servicio.contacto.trim() || null, direccion: params.servicio.direccion.trim() || null, web_url: params.servicio.webUrl.trim() || null, instagram_url: params.servicio.instagramUrl.trim() || null, facebook_url: params.servicio.facebookUrl.trim() || null, imagen: null, estado: "borrador", owner_email: params.email, usa_whatsapp: params.servicio.usaWhatsapp } }
  }
  if (params.type === "curso") {
    return { table: "cursos" as const, payload: { nombre: params.curso.nombre.trim(), descripcion: params.curso.descripcion.trim(), responsable: params.curso.responsable.trim(), contacto: params.curso.contacto.trim(), web_url: params.curso.webUrl.trim() || null, instagram_url: params.curso.instagramUrl.trim() || null, facebook_url: params.curso.facebookUrl.trim() || null, imagen: null, estado: "borrador", owner_email: params.email, usa_whatsapp: params.curso.usaWhatsapp } }
  }
  return { table: "instituciones" as const, payload: { nombre: params.institucion.nombre.trim(), descripcion: params.institucion.descripcion.trim() || null, direccion: params.institucion.direccion.trim() || null, telefono: params.institucion.telefono.trim() || null, web_url: params.institucion.webUrl.trim() || null, instagram_url: params.institucion.instagramUrl.trim() || null, facebook_url: params.institucion.facebookUrl.trim() || null, foto: null, estado: "borrador", owner_email: params.email, usa_whatsapp: params.institucion.usaWhatsapp } }
}

export default function UsuariosHomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [ownedEntity, setOwnedEntity] = useState<UserOwnedEntity | null>(null)
  const [events, setEvents] = useState<UserOwnedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [entityType, setEntityType] = useState<UserEntityType>("comercio")
  const [comercio, setComercio] = useState<ComercioForm>(initialComercio)
  const [servicio, setServicio] = useState<ServicioForm>(initialServicio)
  const [curso, setCurso] = useState<CursoForm>(initialCurso)
  const [institucion, setInstitucion] = useState<InstitucionForm>(initialInstitucion)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey>("presencia")
  const [savingOnboarding, setSavingOnboarding] = useState(false)

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.email) {
        router.replace("/usuarios/login")
        return
      }
      try {
        const entity = await findUserOwnedEntity(session.user.email)
        const ownEvents = entity ? await fetchUserOwnedEvents(session.user.email) : []
        setUser(session.user)
        setOwnedEntity(entity)
        setEvents(ownEvents)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar tu panel en este momento.")
      } finally {
        setLoading(false)
      }
    }
    void loadSession()
  }, [router])

  const handleLogout = async () => {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError("No pudimos cerrar la sesion.")
      return
    }
    router.push("/usuarios/login")
    router.refresh()
  }

  const handleCreateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    if (!user?.email) {
      setError("Necesitas iniciar sesion para continuar.")
      return
    }
    if (entityType === "comercio" && !comercio.nombre.trim()) {
      setError("Completa el nombre del comercio.")
      return
    }
    if (entityType === "servicio" && !servicio.nombre.trim()) {
      setError("Completa el nombre del servicio.")
      return
    }
    if (entityType === "curso" && (!curso.nombre.trim() || !curso.descripcion.trim() || !curso.responsable.trim() || !curso.contacto.trim())) {
      setError("Completa nombre, descripcion, responsable y contacto del curso.")
      return
    }
    if (entityType === "institucion" && !institucion.nombre.trim()) {
      setError("Completa el nombre de la institucion.")
      return
    }
    setSavingOnboarding(true)
    const { table, payload } = buildOnboardingPayload({ type: entityType, email: user.email, comercio, servicio, curso, institucion })
    const payloadWithPlan =
      entityType === "institucion"
        ? payload
        : {
            ...payload,
            plan_suscripcion: selectedPlan,
          }
    const { error: insertError } = await supabase.from(table).insert([payloadWithPlan])
    if (insertError) {
      setError(`No pudimos guardar tus datos: ${insertError.message}`)
      setSavingOnboarding(false)
      return
    }
    try {
      const [entity, ownEvents] = await Promise.all([findUserOwnedEntity(user.email), fetchUserOwnedEvents(user.email)])
      setOwnedEntity(entity)
      setEvents(ownEvents)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Guardamos tus datos, pero no pudimos refrescar el panel.")
    } finally {
      setSavingOnboarding(false)
    }
  }

  const statusKey = normalizeUserEntityStatus(ownedEntity?.record.estado)
  const statusMeta = userEntityStatusCopy[statusKey]
  const statusStyles = getStatusStyles(statusKey)
  const isInstitution = ownedEntity?.type === "institucion"
  const imageSrc = getUserProfileImageSrc(ownedEntity)
  const profileFields = useMemo(() => buildUserProfileFields(ownedEntity), [ownedEntity])
  const activeEvents = useMemo(() => events.filter((item) => normalizeUserEntityStatus(item.estado) === "activo"), [events])
  const draftEvents = useMemo(() => events.filter((item) => normalizeUserEntityStatus(item.estado) === "borrador"), [events])
  const hasPremium = Boolean(ownedEntity?.record.premium_activo && ownedEntity && supportsPremiumProfile(ownedEntity.type))
  const currentPlan = getSubscriptionPlan(ownedEntity?.record.plan_suscripcion)
  const subscriptionStatusLabel = getSubscriptionStatusLabel(ownedEntity?.record.estado_suscripcion)
  const subscriptionStatusBadge = getSubscriptionStatusBadge(ownedEntity?.record.estado_suscripcion)

  if (loading) {
    return <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6"><div className="mx-auto max-w-5xl rounded-[32px] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)]">Cargando cuenta...</div></main>
  }

  if (!ownedEntity) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f2f7f5_48%,#ffffff_100%)] px-4 py-12 text-slate-900 sm:px-6">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_25px_80px_-38px_rgba(15,23,42,0.35)] lg:grid-cols-[0.95fr_1.05fr]">
          <section className="bg-[radial-gradient(circle_at_top_left,#d8f3df_0%,#edf8f1_42%,#eef5ff_100%)] p-8 sm:p-10">
            <div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Primer ingreso</div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">Completa tu espacio</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Esta es la primera vez que entras con tu cuenta. Completa los datos de tu negocio y elige el tipo para activar tu panel.</p>
              <div className="mt-8 space-y-4">
              <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cuenta conectada</div>
                <div className="mt-3 text-lg font-semibold text-slate-950">{user?.email}</div>
              </div>

              {entityType !== "institucion" ? (
                <div className="mt-8 rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Suscripcion</div>
                  <div className="mt-3 text-xl font-semibold text-slate-950">{subscriptionPlans[selectedPlan].name}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{subscriptionPlans[selectedPlan].tagline}</p>
                  <div className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                    {subscriptionPlans[selectedPlan].price}
                  </div>
                </div>
              ) : null}
              <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                <div className="text-sm font-medium text-slate-900">Que vas a poder hacer despues</div>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <p>Ver tu negocio cargado y editar sus datos.</p>
                  <p>Subir eventos y revisar cuales estan activos o en borrador.</p>
                  <p>Ver tu estado de suscripcion si tu perfil no es institucion.</p>
                </div>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600">Volver al inicio</Link>
              <button type="button" onClick={() => void handleLogout()} className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600">Cerrar sesion</button>
            </div>
          </section>
          <section className="p-6 sm:p-8 lg:p-10">
            <form onSubmit={handleCreateProfile} className="space-y-6">
              {error ? <AuthFormStatus tone="error" message={error} /> : null}
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-700">Tipo de perfil</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(Object.keys(userEntityLabels) as UserEntityType[]).map((type) => (
                    <label key={type} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${entityType === type ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700 hover:border-blue-300"}`}>
                      <input type="radio" name="entityType" value={type} checked={entityType === type} onChange={() => setEntityType(type)} className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span>{userEntityLabels[type]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {entityType !== "institucion" ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-slate-700">Plan de suscripcion</div>
                  <div className="grid gap-4 xl:grid-cols-3">
                    {(Object.entries(subscriptionPlans) as Array<[SubscriptionPlanKey, (typeof subscriptionPlans)[SubscriptionPlanKey]]>).map(([planKey, plan]) => (
                      <div
                        key={planKey}
                        className={`rounded-[24px] border p-5 text-left transition ${
                          selectedPlan === planKey
                            ? "border-blue-500 bg-blue-50 shadow-[0_16px_40px_-24px_rgba(37,99,235,0.45)]"
                            : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
                        }`}
                      >
                        <button type="button" onClick={() => setSelectedPlan(planKey)} className="block w-full text-left">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{plan.shortLabel}</div>
                              <div className="mt-2 text-xl font-semibold text-slate-950">{plan.name}</div>
                            </div>
                            <div className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">{plan.price}</div>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-600">{plan.tagline}</p>
                          <div className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                            {plan.features.map((feature) => (
                              <div key={feature} className="flex gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </button>
                        <a
                          href={plan.checkoutUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                        >
                          Ver pago en Mercado Pago
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {entityType === "comercio" ? <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5"><Field label="Nombre del comercio" value={comercio.nombre} onChange={(value) => setComercio((current) => ({ ...current, nombre: value }))} required /><div className="grid gap-4 md:grid-cols-2"><Field label="Direccion" value={comercio.direccion} onChange={(value) => setComercio((current) => ({ ...current, direccion: value }))} /><Field label="Telefono" value={comercio.telefono} onChange={(value) => setComercio((current) => ({ ...current, telefono: value }))} /></div><TextAreaField label="Descripcion" value={comercio.descripcion} onChange={(value) => setComercio((current) => ({ ...current, descripcion: value }))} /><ExternalLinksFields webUrl={comercio.webUrl} instagramUrl={comercio.instagramUrl} facebookUrl={comercio.facebookUrl} onWebChange={(value) => setComercio((current) => ({ ...current, webUrl: value }))} onInstagramChange={(value) => setComercio((current) => ({ ...current, instagramUrl: value }))} onFacebookChange={(value) => setComercio((current) => ({ ...current, facebookUrl: value }))} /><CheckboxField label="Este telefono tiene WhatsApp" checked={comercio.usaWhatsapp} onChange={(checked) => setComercio((current) => ({ ...current, usaWhatsapp: checked }))} /></div> : null}

              {entityType === "servicio" ? <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5"><Field label="Nombre del servicio" value={servicio.nombre} onChange={(value) => setServicio((current) => ({ ...current, nombre: value }))} required /><div className="space-y-2"><label className="text-sm font-medium text-slate-700">Categoria</label><select value={servicio.categoria} onChange={(event) => setServicio((current) => ({ ...current, categoria: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400">{serviceCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div><div className="grid gap-4 md:grid-cols-2"><Field label="Responsable" value={servicio.responsable} onChange={(value) => setServicio((current) => ({ ...current, responsable: value }))} /><Field label="Contacto" value={servicio.contacto} onChange={(value) => setServicio((current) => ({ ...current, contacto: value }))} /></div><Field label="Direccion" value={servicio.direccion} onChange={(value) => setServicio((current) => ({ ...current, direccion: value }))} /><TextAreaField label="Descripcion" value={servicio.descripcion} onChange={(value) => setServicio((current) => ({ ...current, descripcion: value }))} /><ExternalLinksFields webUrl={servicio.webUrl} instagramUrl={servicio.instagramUrl} facebookUrl={servicio.facebookUrl} onWebChange={(value) => setServicio((current) => ({ ...current, webUrl: value }))} onInstagramChange={(value) => setServicio((current) => ({ ...current, instagramUrl: value }))} onFacebookChange={(value) => setServicio((current) => ({ ...current, facebookUrl: value }))} /><CheckboxField label="Este contacto tiene WhatsApp" checked={servicio.usaWhatsapp} onChange={(checked) => setServicio((current) => ({ ...current, usaWhatsapp: checked }))} /></div> : null}

              {entityType === "curso" ? <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5"><Field label="Nombre del curso o clase" value={curso.nombre} onChange={(value) => setCurso((current) => ({ ...current, nombre: value }))} required /><TextAreaField label="Descripcion" value={curso.descripcion} onChange={(value) => setCurso((current) => ({ ...current, descripcion: value }))} required /><div className="grid gap-4 md:grid-cols-2"><Field label="Responsable" value={curso.responsable} onChange={(value) => setCurso((current) => ({ ...current, responsable: value }))} required /><Field label="Contacto" value={curso.contacto} onChange={(value) => setCurso((current) => ({ ...current, contacto: value }))} required /></div><ExternalLinksFields webUrl={curso.webUrl} instagramUrl={curso.instagramUrl} facebookUrl={curso.facebookUrl} onWebChange={(value) => setCurso((current) => ({ ...current, webUrl: value }))} onInstagramChange={(value) => setCurso((current) => ({ ...current, instagramUrl: value }))} onFacebookChange={(value) => setCurso((current) => ({ ...current, facebookUrl: value }))} /><CheckboxField label="Este contacto tiene WhatsApp" checked={curso.usaWhatsapp} onChange={(checked) => setCurso((current) => ({ ...current, usaWhatsapp: checked }))} /></div> : null}

              {entityType === "institucion" ? <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5"><Field label="Nombre de la institucion" value={institucion.nombre} onChange={(value) => setInstitucion((current) => ({ ...current, nombre: value }))} required /><div className="grid gap-4 md:grid-cols-2"><Field label="Direccion" value={institucion.direccion} onChange={(value) => setInstitucion((current) => ({ ...current, direccion: value }))} /><Field label="Telefono" value={institucion.telefono} onChange={(value) => setInstitucion((current) => ({ ...current, telefono: value }))} /></div><TextAreaField label="Descripcion" value={institucion.descripcion} onChange={(value) => setInstitucion((current) => ({ ...current, descripcion: value }))} /><ExternalLinksFields webUrl={institucion.webUrl} instagramUrl={institucion.instagramUrl} facebookUrl={institucion.facebookUrl} onWebChange={(value) => setInstitucion((current) => ({ ...current, webUrl: value }))} onInstagramChange={(value) => setInstitucion((current) => ({ ...current, instagramUrl: value }))} onFacebookChange={(value) => setInstitucion((current) => ({ ...current, facebookUrl: value }))} /><CheckboxField label="Este telefono tiene WhatsApp" checked={institucion.usaWhatsapp} onChange={(checked) => setInstitucion((current) => ({ ...current, usaWhatsapp: checked }))} /></div> : null}

              <button type="submit" disabled={savingOnboarding} className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70">{savingOnboarding ? "Guardando..." : "Guardar y entrar al panel"}</button>
            </form>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {error ? <AuthFormStatus tone="error" message={error} /> : null}
        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
            <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
              <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Mi panel</div>
              <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-2xl">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">{userEntityLabels[ownedEntity.type]}</p>
                  <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">{ownedEntity.record.nombre}</h1>
                  <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">Desde aqui puedes revisar tu perfil, mantenerlo actualizado, ver tus eventos y gestionar el acceso de tu cuenta.</p>
                  <p className="mt-4 text-sm text-slate-500">{user?.email}</p>
                </div>
                <div className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${statusStyles.badge}`}>{statusMeta.label}</div>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <DashboardMetric label="Perfil" value={userEntityLabels[ownedEntity.type]} description="Tu ficha principal ya quedo vinculada a esta cuenta." />
                <DashboardMetric label="Premium" value={hasPremium ? "Activo" : "Base"} description={hasPremium ? "Tienes contenido ampliado disponible para destacar tu ficha." : "Puedes sumar una ficha ampliada cuando se active desde admin."} />
                {!isInstitution ? <DashboardMetric label="Plan" value={currentPlan.shortLabel} description={currentPlan.price} /> : null}
                <DashboardMetric label="Eventos activos" value={String(activeEvents.length)} description="Se estan mostrando publicamente en Hola Varela." />
                <DashboardMetric label="Eventos en borrador" value={String(draftEvents.length)} description="Aun no estan publicados o siguen en revision." />
              </div>
            </div>
            <div className="space-y-4 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-6 py-8 sm:px-8 sm:py-10">
              {imageSrc ? <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"><img src={imageSrc} alt={ownedEntity.record.nombre} className="h-60 w-full object-cover" /></div> : <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-8 shadow-sm"><div className="flex items-start gap-4"><div className="rounded-[20px] bg-slate-100 p-4"><ImageIcon className="h-6 w-6 text-slate-400" /></div><div><h3 className="text-lg font-semibold text-slate-900">Agrega una imagen</h3><p className="mt-2 text-sm leading-7 text-slate-500">Tu perfil se ve mucho mejor cuando tiene una foto o imagen principal.</p></div></div></div>}
              <QuickLink href="/usuarios/perfil" icon={<FilePenLine className="h-5 w-5 text-slate-400 transition group-hover:text-blue-600" />} title="Editar mis datos" description={hasPremium ? "Actualiza datos, imagen y el contenido premium de tu ficha." : "Actualiza descripcion, imagen y datos de contacto."} />
              {!isInstitution ? <QuickLink href="/usuarios/suscripcion" icon={<CreditCard className="h-5 w-5 text-slate-400 transition group-hover:text-sky-600" />} title="Suscripcion" description="Revisa tu plan, cambia la opcion elegida y abre el pago desde Mercado Pago." /> : null}
              <QuickLink href="/usuarios/eventos/nuevo" icon={<PlusCircle className="h-5 w-5 text-slate-400 transition group-hover:text-emerald-600" />} title="Subir evento" description="Carga una actividad, promo, sorteo o novedad." />
              <QuickLink href="/usuarios/contrasena" icon={<KeyRound className="h-5 w-5 text-slate-400 transition group-hover:text-violet-600" />} title="Cambiar contrasena" description="Hazlo de forma segura validando tu clave actual." />
              <QuickLink href="/" icon={<ExternalLink className="h-5 w-5 text-slate-400 transition group-hover:text-slate-700" />} title="Ver sitio publico" description="Revisa como aparece Hola Varela para las visitas." />
              <button type="button" onClick={() => void handleLogout()} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"><LogOut className="h-4 w-4" />Cerrar sesion</button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><h2 className="text-2xl font-semibold text-slate-950">Tus datos</h2><p className="mt-2 text-sm leading-6 text-slate-500">La informacion principal del negocio o institucion vinculada a tu cuenta.</p></div>
                <div className={`rounded-full px-4 py-2 text-sm font-semibold ${statusStyles.badge}`}>{userEntityLabels[ownedEntity.type]}</div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {profileFields.map((field) => {
                  const Icon = field.icon
                  return <div key={field.label} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"><div className="flex items-center gap-3"><div className="rounded-2xl bg-white p-3 shadow-sm"><Icon className="h-4 w-4 text-slate-500" /></div><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{field.label}</div><div className="mt-1 text-sm leading-6 text-slate-700">{field.value}</div></div></div></div>
                })}
              </div>
              <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Descripcion</div><div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{ownedEntity.record.descripcion?.trim() ? ownedEntity.record.descripcion : "Aun no agregaste una descripcion. Puedes completarla desde editar mis datos."}</div></div>
            </div>
            <UnifiedEventsSection activeEvents={activeEvents} draftEvents={draftEvents} />
          </section>
          <aside className="space-y-6">
            <div className={`rounded-[32px] border p-6 shadow-sm ${statusStyles.panel}`}>
              <div className="flex items-start gap-4"><div className="rounded-[22px] bg-white/80 p-4">{statusKey === "activo" ? <CircleCheckBig className={`h-6 w-6 ${statusStyles.accent}`} /> : <Clock3 className={`h-6 w-6 ${statusStyles.accent}`} />}</div><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Estado del perfil</div><div className="mt-2 text-2xl font-semibold text-slate-950">{statusMeta.label}</div><p className="mt-3 text-sm leading-7 text-slate-600">{statusMeta.description}</p></div></div>
            </div>
            {supportsPremiumProfile(ownedEntity.type) ? <div className={`rounded-[32px] border p-6 shadow-sm ${hasPremium ? "border-violet-200 bg-violet-50/70" : "border-slate-200 bg-white"}`}><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Premium</div><div className="mt-3 text-2xl font-semibold text-slate-950">{hasPremium ? "Perfil ampliado activo" : "Plan base"}</div><p className="mt-3 text-sm leading-7 text-slate-600">{hasPremium ? "Tu ficha puede mostrar descripcion extendida, galeria y un destaque visual especial." : "Cuando activen premium desde admin, vas a poder editar una galeria extra y una descripcion ampliada desde tu perfil."}</p></div> : null}
            {!isInstitution ? (
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Suscripcion</div>
                <div className="mt-4 space-y-4">
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-500">Plan elegido</div>
                    <div className="mt-1 text-xl font-semibold text-slate-950">{currentPlan.name}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{currentPlan.description}</p>
                    <div className="mt-3 inline-flex rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">{currentPlan.price}</div>
                    <div className="mt-4">
                      <Link href="/usuarios/suscripcion" className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100">
                        Gestionar suscripcion
                      </Link>
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-500">Estado actual</div>
                    <div className="mt-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${subscriptionStatusBadge}`}>{subscriptionStatusLabel}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Desde el boton de suscripcion puedes revisar el plan, cambiar tu eleccion y abrir el pago cuando lo necesites.</p>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-500">Incluye</div>
                    <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                      {currentPlan.features.map((feature) => (
                        <div key={feature} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Siguientes pasos</div><div className="mt-5 space-y-4 text-sm leading-6 text-slate-600"><p>Revisa que nombre, imagen y descripcion representen bien tu espacio.</p><p>Sube eventos para mantener el perfil activo y actualizado.</p><p>Cambia tu contrasena desde el panel cuando quieras reforzar la seguridad.</p></div></div>
          </aside>
        </div>
      </div>
    </main>
  )
}

function DashboardMetric({ label, value, description }: { label: string; value: string; description: string }) {
  return <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div><div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>
}

function QuickLink({ href, title, description, icon }: { href: string; title: string; description: string; icon: React.ReactNode }) {
  return <Link href={href} className="group flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4 transition hover:border-blue-300 hover:bg-blue-50/60"><div><div className="text-base font-semibold text-slate-900">{title}</div><div className="mt-1 text-sm text-slate-500">{description}</div></div>{icon}</Link>
}

function UnifiedEventsSection({ activeEvents, draftEvents }: { activeEvents: UserOwnedEvent[]; draftEvents: UserOwnedEvent[] }) {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Tus eventos</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Revisa en un solo lugar lo publicado y lo que todavia sigue en borrador.
          </p>
        </div>
        <Link href="/usuarios/eventos/nuevo" className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600">
          Nuevo evento
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Activos</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{activeEvents.length}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Los que ya se estan mostrando publicamente en Hola Varela.</p>
        </div>
        <div className="rounded-[24px] border border-amber-100 bg-amber-50/70 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">En borrador</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{draftEvents.length}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Puedes retomarlos, corregirlos y seguir cargando informacion.</p>
        </div>
      </div>

      {activeEvents.length === 0 && draftEvents.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#f4faf6_100%)] p-8">
          <h3 className="text-lg font-semibold text-slate-900">Todavia no tienes eventos</h3>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
            Cuando cargues uno nuevo lo vas a ver aqui, junto con su estado y el acceso para seguir editandolo.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <EventGroup
            label="Activos"
            tone="active"
            emptyTitle="No tienes eventos activos"
            emptyDescription="Cuando un evento se publica, lo veras aqui."
            events={activeEvents}
          />
          <EventGroup
            label="Borradores"
            tone="draft"
            emptyTitle="No tienes eventos en borrador"
            emptyDescription="Los borradores quedan listos para revisar o completar antes de publicarse."
            events={draftEvents}
            allowDraftResume
          />
        </div>
      )}
    </div>
  )
}

function EventGroup({ label, tone, emptyTitle, emptyDescription, events, allowDraftResume = false }: { label: string; tone: "active" | "draft"; emptyTitle: string; emptyDescription: string; events: UserOwnedEvent[]; allowDraftResume?: boolean }) {
  const toneClass =
    tone === "active"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700"

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${toneClass}`}>
          {label}
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {events.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-6">
          <h3 className="text-lg font-semibold text-slate-900">{emptyTitle}</h3>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">{emptyDescription}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <article key={event.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
              {event.imagen ? (
                <img src={event.imagen} alt={event.titulo} className="h-44 w-full object-cover" />
              ) : (
                <div className="flex h-44 items-center justify-center bg-slate-100">
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{event.titulo}</h3>
                    <div className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{event.categoria || "Evento"}</div>
                  </div>
                  <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">{formatEventState(event.estado)}</div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span>{new Date(event.fecha).toLocaleDateString("es-UY")}</span>
                  </div>
                </div>
                <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-500">{event.descripcion}</p>
                {allowDraftResume ? (
                  <div className="mt-5">
                    <Link href={`/usuarios/eventos/nuevo?edit=${event.id}`} className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100">
                      Continuar borrador
                    </Link>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return <div className="space-y-2"><label className="text-sm font-medium text-slate-700">{label}</label><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400" /></div>
}

function TextAreaField({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <div className="space-y-2"><label className="text-sm font-medium text-slate-700">{label}</label><textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} rows={4} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400" /></div>
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><span>{label}</span></label>
}

function ExternalLinksFields({ webUrl, instagramUrl, facebookUrl, onWebChange, onInstagramChange, onFacebookChange }: { webUrl: string; instagramUrl: string; facebookUrl: string; onWebChange: (value: string) => void; onInstagramChange: (value: string) => void; onFacebookChange: (value: string) => void }) {
  return <div className="grid gap-4 md:grid-cols-3"><Field label="Sitio web" type="url" value={webUrl} onChange={onWebChange} /><Field label="Instagram" type="url" value={instagramUrl} onChange={onInstagramChange} /><Field label="Facebook" type="url" value={facebookUrl} onChange={onFacebookChange} /></div>
}
