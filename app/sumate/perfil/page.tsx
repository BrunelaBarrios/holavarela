'use client'

import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AccessPageShell } from "../../components/AccessPageShell"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { entityLabels, findOwnedEntity, normalizeEntityStatus, type OwnedEntity } from "../../lib/sumateOwner"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
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

const initialForm: ProfileForm = {
  nombre: "",
  descripcion: "",
  direccion: "",
  telefono: "",
  responsable: "",
  contacto: "",
  categoria: "",
  usaWhatsapp: true,
  image: "",
}

const serviceCategories = ["Profesionales", "Alojamientos", "Oficios", "Servicios"]

export default function SumatePerfilPage() {
  const router = useRouter()
  const [ownedEntity, setOwnedEntity] = useState<OwnedEntity | null>(null)
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
        router.replace("/sumate/login")
        return
      }

      try {
        const entity = await findOwnedEntity(session.user.email)

        if (!entity) {
          router.replace("/sumate/alta")
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
        setError(
          loadError instanceof Error ? loadError.message : "No pudimos cargar tu perfil."
        )
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
      setError(
        imageError instanceof Error ? imageError.message : "No pudimos cargar la imagen."
      )
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

    const table =
      ownedEntity.type === "comercio"
        ? "comercios"
        : ownedEntity.type === "servicio"
          ? "servicios"
          : ownedEntity.type === "curso"
            ? "cursos"
            : "instituciones"

    const { error: updateError } = await supabase
      .from(table)
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
    <AccessPageShell
      eyebrow="Mi perfil"
      title="Edita tu perfil"
      description="Actualiza los datos de tu espacio para que el panel y la publicacion sigan al dia."
      secondaryLink={{ href: "/sumate/panel", label: "Volver al panel" }}
    >
      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          Cargando perfil...
        </div>
      ) : ownedEntity ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Tipo de perfil
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-900">
                  {entityLabels[ownedEntity.type]}
                </div>
              </div>

              <div className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                {normalizeEntityStatus(ownedEntity.record.estado) === "activo"
                  ? "Visible"
                  : normalizeEntityStatus(ownedEntity.record.estado) === "oculto"
                    ? "Oculto"
                    : "En revision"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nombre</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(event) => setFormData((current) => ({ ...current, nombre: event.target.value }))}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
            />
          </div>

          {ownedEntity.type === "servicio" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Categoria</label>
              <select
                value={formData.categoria}
                onChange={(event) => setFormData((current) => ({ ...current, categoria: event.target.value }))}
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Responsable</label>
                <input
                  type="text"
                  value={formData.responsable}
                  onChange={(event) => setFormData((current) => ({ ...current, responsable: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Contacto</label>
                <input
                  type="text"
                  value={formData.contacto}
                  onChange={(event) => setFormData((current) => ({ ...current, contacto: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
                />
              </div>
            </div>
          ) : null}

          {ownedEntity.type === "comercio" || ownedEntity.type === "institucion" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Direccion</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(event) => setFormData((current) => ({ ...current, direccion: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Telefono</label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={(event) => setFormData((current) => ({ ...current, telefono: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
                />
              </div>
            </div>
          ) : null}

          {ownedEntity.type === "servicio" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Direccion</label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(event) => setFormData((current) => ({ ...current, direccion: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Descripcion</label>
            <textarea
              value={formData.descripcion}
              onChange={(event) => setFormData((current) => ({ ...current, descripcion: event.target.value }))}
              rows={5}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={formData.usaWhatsapp}
              onChange={(event) => setFormData((current) => ({ ...current, usaWhatsapp: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Este contacto tiene WhatsApp</span>
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Imagen</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-600 hover:file:bg-blue-100"
            />
            {formData.image ? (
              <img src={formData.image} alt="Vista previa del perfil" className="mt-3 h-40 w-full rounded-2xl object-cover" />
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
    </AccessPageShell>
  )
}
