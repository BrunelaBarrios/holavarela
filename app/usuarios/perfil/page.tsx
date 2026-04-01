'use client'

import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import { findUserOwnedEntity, getUserProfileTable, normalizeUserEntityStatus, userEntityLabels, type UserOwnedEntity } from "../../lib/userProfiles"
import { supabase } from "../../supabase"

type ProfileForm = {
  nombre: string
  descripcion: string
  direccion: string
  telefono: string
  responsable: string
  contacto: string
  categoria: string
  usaWhatsapp: boolean
  image: string
}

const serviceCategories = ["Profesionales", "Alojamientos", "Oficios", "Servicios"]

const initialForm: ProfileForm = {
  nombre: "",
  descripcion: "",
  direccion: "",
  telefono: "",
  responsable: "",
  contacto: "",
  categoria: "Profesionales",
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
          telefono: entity.record.telefono || "",
          responsable: entity.record.responsable || "",
          contacto: entity.record.contacto || "",
          categoria: entity.record.categoria || "Profesionales",
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

  const imageColumn = useMemo(() => {
    if (!ownedEntity) return "imagen"
    if (ownedEntity.type === "comercio") return "imagen_url"
    if (ownedEntity.type === "institucion") return "foto"
    return "imagen"
  }, [ownedEntity])

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
      [imageColumn]: formData.image || null,
    }

    let payload: Record<string, string | boolean | null>

    if (ownedEntity.type === "comercio") {
      payload = {
        ...commonPayload,
        direccion: formData.direccion.trim() || null,
        telefono: formData.telefono.trim() || null,
      }
    } else if (ownedEntity.type === "servicio") {
      payload = {
        ...commonPayload,
        categoria: formData.categoria,
        responsable: formData.responsable.trim() || null,
        contacto: formData.contacto.trim() || null,
        direccion: formData.direccion.trim() || null,
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
        direccion: formData.direccion.trim() || null,
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
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
              <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Mi perfil
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Edita tus datos
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
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Volver al panel
                </Link>
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              {loading ? (
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  Cargando perfil...
                </div>
              ) : ownedEntity ? (
                <form onSubmit={handleSubmit} className="space-y-6">
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

                  <TextAreaField
                    label="Descripcion"
                    value={formData.descripcion}
                    onChange={(value) => setFormData((current) => ({ ...current, descripcion: value }))}
                  />

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
                      <img
                        src={formData.image}
                        alt="Vista previa del perfil"
                        className="mt-3 h-40 w-full rounded-2xl object-cover"
                      />
                    ) : null}
                  </div>

                  {error ? <AuthFormStatus tone="error" message={error} /> : null}
                  {success ? <AuthFormStatus tone="success" message={success} /> : null}

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
                  >
                    {saving ? "Guardando cambios..." : "Guardar perfil"}
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
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type="text"
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
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
      />
    </div>
  )
}
