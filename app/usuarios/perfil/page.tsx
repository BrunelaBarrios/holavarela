'use client'

import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { OptimizedImage } from "../../components/OptimizedImage"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import { findUserOwnedEntity, getUserProfileTable, normalizeUserEntityStatus, supportsPremiumProfile, userEntityLabels, type UserOwnedEntity } from "../../lib/userProfiles"
import { supabase } from "../../supabase"

type ProfileForm = {
  nombre: string
  descripcion: string
  direccion: string
  direccionMapa: string
  telefono: string
  responsable: string
  contacto: string
  categoria: string
  webUrl: string
  instagramUrl: string
  facebookUrl: string
  premiumDetalle: string
  premiumGaleria: string[]
  premiumExtraTitulo: string
  premiumExtraDetalle: string
  premiumExtraGaleria: string[]
  usaWhatsapp: boolean
  image: string
}

const serviceCategories = ["Profesionales", "Alojamientos", "Oficios", "Servicios"]

const initialForm: ProfileForm = {
  nombre: "",
  descripcion: "",
  direccion: "",
  direccionMapa: "",
  telefono: "",
  responsable: "",
  contacto: "",
  categoria: "Profesionales",
  webUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  premiumDetalle: "",
  premiumGaleria: [],
  premiumExtraTitulo: "",
  premiumExtraDetalle: "",
  premiumExtraGaleria: [],
  usaWhatsapp: true,
  image: "",
}

export default function UsuariosPerfilPage() {
  const router = useRouter()
  const [ownedEntity, setOwnedEntity] = useState<UserOwnedEntity | null>(null)
  const [formData, setFormData] = useState<ProfileForm>(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeSection, setActiveSection] = useState<"base" | "premium">("base")

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.email) {
        router.replace("/usuarios/login")
        return
      }

      try {
        const entity = await findUserOwnedEntity(session.user.email)

        if (!entity) {
          router.replace("/usuarios")
          return
        }

        setOwnedEntity(entity)
        setFormData({
          nombre: entity.record.nombre || "",
          descripcion: entity.record.descripcion || "",
          direccion: entity.record.direccion || "",
          direccionMapa: entity.record.direccion_mapa || "",
          telefono: entity.record.telefono || "",
          responsable: entity.record.responsable || "",
          contacto: entity.record.contacto || "",
          categoria: entity.record.categoria || "Profesionales",
          webUrl: entity.record.web_url || "",
          instagramUrl: entity.record.instagram_url || "",
          facebookUrl: entity.record.facebook_url || "",
          premiumDetalle: entity.record.premium_detalle || "",
          premiumGaleria: entity.record.premium_galeria || [],
          premiumExtraTitulo: entity.record.premium_extra_titulo || "",
          premiumExtraDetalle: entity.record.premium_extra_detalle || "",
          premiumExtraGaleria: entity.record.premium_extra_galeria || [],
          usaWhatsapp: entity.record.usa_whatsapp ?? true,
          image: entity.record.imagen_url || entity.record.imagen || entity.record.foto || "",
        })
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar tu perfil.")
      } finally {
        setLoading(false)
      }
    }

    void loadProfile()
  }, [router])

  useEffect(() => {
    if (typeof window === "undefined") return

    const syncSectionWithHash = () => {
      setActiveSection(window.location.hash === "#premium" ? "premium" : "base")
    }

    syncSectionWithHash()
    window.addEventListener("hashchange", syncSectionWithHash)

    return () => {
      window.removeEventListener("hashchange", syncSectionWithHash)
    }
  }, [])

  const imageColumn = useMemo(() => {
    if (!ownedEntity) return "imagen"
    if (ownedEntity.type === "comercio") return "imagen_url"
    if (ownedEntity.type === "institucion") return "foto"
    return "imagen"
  }, [ownedEntity])
  const supportsExtendedProfile = Boolean(ownedEntity && supportsPremiumProfile(ownedEntity.type))
  const hasExtendedProfile = Boolean(supportsExtendedProfile && ownedEntity?.record.premium_activo)

  const openSection = (section: "base" | "premium") => {
    setActiveSection(section)

    if (typeof window === "undefined") return

    const nextHash = section === "premium" ? "#premium" : ""
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`
    window.history.replaceState(null, "", nextUrl)
  }

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const nextImage = await fileToDataUrl(file)
      setFormData((current) => ({ ...current, image: nextImage }))
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : "No pudimos cargar la imagen.")
    }
  }

  const handleGalleryUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    key: "premiumGaleria" | "premiumExtraGaleria"
  ) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    try {
      const nextImages = await Promise.all(files.map((file) => fileToDataUrl(file)))
      setFormData((current) => ({
        ...current,
        [key]: [...current[key], ...nextImages],
      }))
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : "No pudimos cargar las imagenes.")
    } finally {
      event.target.value = ""
    }
  }

  const removeGalleryImage = (
    key: "premiumGaleria" | "premiumExtraGaleria",
    index: number
  ) => {
    setFormData((current) => ({
      ...current,
      [key]: current[key].filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ownedEntity) return

    setSaving(true)
    setError("")
    setSuccess("")

    const commonPayload = {
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim() || null,
      estado: ownedEntity.record.estado ?? "borrador",
      usa_whatsapp: formData.usaWhatsapp,
      web_url: formData.webUrl.trim() || null,
      instagram_url: formData.instagramUrl.trim() || null,
      facebook_url: formData.facebookUrl.trim() || null,
      [imageColumn]: formData.image || null,
    }
    const premiumPayload = supportsPremiumProfile(ownedEntity.type)
      ? {
          premium_detalle: formData.premiumDetalle.trim() || null,
          premium_galeria: formData.premiumGaleria,
          premium_extra_titulo: formData.premiumExtraTitulo.trim() || null,
          premium_extra_detalle: formData.premiumExtraDetalle.trim() || null,
          premium_extra_galeria: formData.premiumExtraGaleria,
        }
      : {}

    let payload: Record<string, string | boolean | string[] | null | undefined>

    if (ownedEntity.type === "comercio") {
      payload = {
        ...commonPayload,
        ...premiumPayload,
        direccion: formData.direccion.trim() || null,
        direccion_mapa: formData.direccionMapa.trim() || null,
        telefono: formData.telefono.trim() || null,
      }
    } else if (ownedEntity.type === "servicio") {
      payload = {
        ...commonPayload,
        ...premiumPayload,
        categoria: formData.categoria,
        responsable: formData.responsable.trim() || null,
        contacto: formData.contacto.trim() || null,
        direccion: formData.direccion.trim() || null,
        direccion_mapa: formData.direccionMapa.trim() || null,
      }
    } else if (ownedEntity.type === "curso") {
      payload = {
        ...commonPayload,
        responsable: formData.responsable.trim() || null,
        contacto: formData.contacto.trim() || null,
      }
    } else {
      payload = {
        ...commonPayload,
        ...premiumPayload,
        direccion: formData.direccion.trim() || null,
        direccion_mapa: formData.direccionMapa.trim() || null,
        telefono: formData.telefono.trim() || null,
      }
    }

    const { error: updateError } = await supabase
      .from(getUserProfileTable(ownedEntity.type))
      .update(payload)
      .eq("id", ownedEntity.record.id)

    if (updateError) {
      setError(`No pudimos guardar tu perfil: ${updateError.message}`)
      setSaving(false)
      return
    }

    setSuccess("Tus datos quedaron actualizados.")
    setOwnedEntity((current) =>
      current
        ? {
            ...current,
            record: {
              ...current.record,
              ...payload,
            },
          }
        : current
    )
    setSaving(false)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
          <div className="grid xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
              <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Mi perfil
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                {activeSection === "premium" ? "Version extendida" : "Edita tus datos"}
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Mantén actualizada la ficha de tu espacio para que el panel y la publicación siempre muestren información correcta.
              </p>

              <div className="mt-8 rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Estado actual
                </div>
                <div className="mt-3 text-xl font-semibold text-slate-950">
                  {ownedEntity ? userEntityLabels[ownedEntity.type] : "Perfil"}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {ownedEntity
                    ? normalizeUserEntityStatus(ownedEntity.record.estado) === "activo"
                      ? "Visible"
                      : normalizeUserEntityStatus(ownedEntity.record.estado) === "oculto"
                        ? "Oculto"
                        : "En revision"
                    : "Cargando"}
                </p>
              </div>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/usuarios"
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white/95 px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
                >
                  Volver al panel
                </Link>
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-10 xl:p-12">
              {loading ? (
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  Cargando perfil...
                </div>
              ) : ownedEntity ? (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => openSection("base")}
                        className={`rounded-[22px] px-5 py-4 text-left transition ${
                          activeSection === "base"
                            ? "border border-blue-200 bg-blue-50 text-blue-700"
                            : "border border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <div className="text-sm font-semibold">Ficha base</div>
                        <div className="mt-1 text-sm leading-6">
                          Datos principales, contacto, ubicacion, redes e imagen principal.
                        </div>
                      </button>
                      {supportsExtendedProfile ? (
                        <button
                          type="button"
                          onClick={() => openSection("premium")}
                          className={`rounded-[22px] px-5 py-4 text-left transition ${
                            activeSection === "premium"
                              ? "border border-violet-200 bg-violet-50 text-violet-700"
                              : "border border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <div className="text-sm font-semibold">Version extendida</div>
                          <div className="mt-1 text-sm leading-6">
                            {hasExtendedProfile
                              ? "Galeria destacada y bloque complementario del perfil."
                              : "Disponible cuando tu plan o admin activa el perfil extendido."}
                          </div>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className={activeSection === "base" ? "space-y-8" : "hidden"}>
                  <div className="rounded-[32px] border border-slate-200 bg-slate-50/80 p-6 sm:p-7">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Datos principales
                    </div>
                    <div className="mt-4 space-y-4">
                      <Field
                        label="Nombre"
                        value={formData.nombre}
                        onChange={(value) => setFormData((current) => ({ ...current, nombre: value }))}
                        required
                      />

                      {ownedEntity.type === "servicio" ? (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Categoria</label>
                          <select
                            value={formData.categoria}
                            onChange={(event) =>
                              setFormData((current) => ({ ...current, categoria: event.target.value }))
                            }
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
                          >
                            {serviceCategories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      {ownedEntity.type === "servicio" || ownedEntity.type === "curso" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field
                            label="Responsable"
                            value={formData.responsable}
                            onChange={(value) =>
                              setFormData((current) => ({ ...current, responsable: value }))
                            }
                          />
                          <Field
                            label="Contacto"
                            value={formData.contacto}
                            onChange={(value) =>
                              setFormData((current) => ({ ...current, contacto: value }))
                            }
                          />
                        </div>
                      ) : null}

                      {ownedEntity.type === "comercio" || ownedEntity.type === "institucion" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field
                            label="Direccion"
                            value={formData.direccion}
                            onChange={(value) =>
                              setFormData((current) => ({ ...current, direccion: value }))
                            }
                          />
                          <Field
                            label="Telefono"
                            value={formData.telefono}
                            onChange={(value) =>
                              setFormData((current) => ({ ...current, telefono: value }))
                            }
                          />
                        </div>
                      ) : null}

                      {ownedEntity.type === "servicio" ? (
                        <Field
                          label="Direccion"
                          value={formData.direccion}
                          onChange={(value) => setFormData((current) => ({ ...current, direccion: value }))}
                        />
                      ) : null}

                      {(ownedEntity.type === "comercio" ||
                        ownedEntity.type === "servicio" ||
                        ownedEntity.type === "institucion") ? (
                        <div className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-5">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                            Como llegar
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Usa este campo si quieres abrir un punto mas preciso en Google Maps.
                            Puedes escribir una referencia completa o pegar un link directo de Google Maps.
                          </p>
                          <div className="mt-4">
                            <TextAreaField
                              label="Ubicacion precisa para el boton de como llegar"
                              value={formData.direccionMapa}
                              onChange={(value) =>
                                setFormData((current) => ({ ...current, direccionMapa: value }))
                              }
                              rows={3}
                            />
                          </div>
                        </div>
                      ) : null}

                      <TextAreaField
                        label="Descripcion"
                        value={formData.descripcion}
                        onChange={(value) => setFormData((current) => ({ ...current, descripcion: value }))}
                      />

                      <div className="grid gap-4 md:grid-cols-3">
                        <Field
                          label="Sitio web"
                          type="url"
                          value={formData.webUrl}
                          onChange={(value) =>
                            setFormData((current) => ({ ...current, webUrl: value }))
                          }
                        />
                        <Field
                          label="Instagram"
                          type="url"
                          value={formData.instagramUrl}
                          onChange={(value) =>
                            setFormData((current) => ({ ...current, instagramUrl: value }))
                          }
                        />
                        <Field
                          label="Facebook"
                          type="url"
                          value={formData.facebookUrl}
                          onChange={(value) =>
                            setFormData((current) => ({ ...current, facebookUrl: value }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {ownedEntity.type !== "institucion" ? (
                    <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-6">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Suscripcion
                      </div>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">
                        Gestiona tu plan desde el panel
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        La version extendida se administra aparte porque depende del plan que tengas activo.
                      </p>
                      <div className="mt-4">
                        <Link
                          href="/usuarios/suscripcion"
                          className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                        >
                          Ir a suscripcion
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.usaWhatsapp}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, usaWhatsapp: event.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Este contacto tiene WhatsApp</span>
                  </label>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Imagen principal</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-600 hover:file:bg-blue-100"
                    />
                    {formData.image ? (
                      <div className="relative mt-3 h-40 w-full overflow-hidden rounded-2xl">
                        <OptimizedImage
                          src={formData.image}
                          alt="Vista previa del perfil"
                          sizes="100vw"
                          className="object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                  </div>

                  <div className={activeSection === "premium" ? "space-y-8" : "hidden"}>
                  {ownedEntity && supportsPremiumProfile(ownedEntity.type) ? (
                    ownedEntity.record.premium_activo ? (
                      <div className="space-y-6 rounded-[32px] border border-violet-200 bg-violet-50/60 p-6 sm:p-7">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-500">
                            Perfil extendido
                          </div>
                          <h3 className="mt-2 text-xl font-semibold text-slate-950">
                            Contenido ampliado
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Aqui editas solo la parte diferencial del perfil: galeria destacada y bloque complementario.
                          </p>
                        </div>

                        <div className="rounded-[28px] border border-violet-100 bg-white/90 p-6">
                          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-violet-500">
                            Cabecera del perfil ampliado
                          </div>
                          <div className="space-y-5">
                            <TextAreaField
                              label="Descripcion destacada"
                              value={formData.premiumDetalle}
                              onChange={(value) =>
                                setFormData((current) => ({ ...current, premiumDetalle: value }))
                              }
                            />

                            <ImageUploadField
                              label="Galeria principal del perfil ampliado"
                              helper="Estas imagenes se veran grandes al inicio del perfil completo. Se suben optimizadas en WebP, con ancho maximo de 800 px."
                              images={formData.premiumGaleria}
                              onUpload={(event) => void handleGalleryUpload(event, "premiumGaleria")}
                              onRemove={(index) => removeGalleryImage("premiumGaleria", index)}
                            />
                          </div>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6">
                          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Bloque complementario
                          </div>
                          <div className="space-y-5">
                            <Field
                              label="Titulo del bloque"
                              value={formData.premiumExtraTitulo}
                              onChange={(value) =>
                                setFormData((current) => ({ ...current, premiumExtraTitulo: value }))
                              }
                            />
                            <TextAreaField
                              label="Descripcion del bloque"
                              value={formData.premiumExtraDetalle}
                              onChange={(value) =>
                                setFormData((current) => ({ ...current, premiumExtraDetalle: value }))
                              }
                            />
                            <ImageUploadField
                              label="Imagenes del bloque"
                              helper="Estas imagenes solo se veran dentro del bloque complementario y tambien se optimizan automaticamente."
                              images={formData.premiumExtraGaleria}
                              onUpload={(event) => void handleGalleryUpload(event, "premiumExtraGaleria")}
                              onRemove={(index) => removeGalleryImage("premiumExtraGaleria", index)}
                            />
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                        La version extendida aun no esta activa para esta ficha. Cuando se habilite desde tu plan o desde admin, vas a poder editarla aqui.
                      </div>
                    )
                  ) : null}
                  </div>

                  {error ? <AuthFormStatus tone="error" message={error} /> : null}
                  {success ? <AuthFormStatus tone="success" message={success} /> : null}

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
                  >
                    {saving
                      ? "Guardando cambios..."
                      : activeSection === "premium"
                        ? "Guardar version extendida"
                        : "Guardar ficha base"}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
      />
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 5,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
      />
    </div>
  )
}

function ImageUploadField({
  label,
  helper,
  images,
  onUpload,
  onRemove,
}: {
  label: string
  helper?: string
  images: string[]
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={onUpload}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-600 hover:file:bg-blue-100"
      />
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
      {images.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {images.map((image, index) => (
            <div key={`${index}-${image.slice(0, 24)}`} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
              <div className="relative h-40 w-full">
                <OptimizedImage
                  src={image}
                  alt={`Vista previa ${index + 1}`}
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                <span className="text-sm text-slate-500">Imagen {index + 1}</span>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
