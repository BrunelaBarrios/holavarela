'use client'

import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AccessPageShell } from "../../../components/AccessPageShell"
import { AuthFormStatus } from "../../../components/AuthFormStatus"
import { findOwnedEntity } from "../../../lib/sumateOwner"
import { fileToDataUrl } from "../../../lib/fileToDataUrl"
import { supabase } from "../../../supabase"

type EventForm = {
  titulo: string
  categoria: string
  fecha: string
  fechaFin: string
  ubicacion: string
  telefono: string
  descripcion: string
  imagen: string
  usaWhatsapp: boolean
}

const initialForm: EventForm = {
  titulo: "",
  categoria: "Evento",
  fecha: "",
  fechaFin: "",
  ubicacion: "",
  telefono: "",
  descripcion: "",
  imagen: "",
  usaWhatsapp: true,
}

const categoriasEvento = ["Evento", "Promocion", "Sorteo", "Beneficio", "Consulta"]

export default function SumateNuevoEventoPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<EventForm>(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")

  useEffect(() => {
    const loadContext = async () => {
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

        setOwnerEmail(session.user.email)
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "No pudimos preparar tu evento."
        )
      } finally {
        setLoading(false)
      }
    }

    void loadContext()
  }, [router])

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const imageDataUrl = await fileToDataUrl(file)
      setFormData((current) => ({ ...current, imagen: imageDataUrl }))
    } catch (imageError) {
      setError(
        imageError instanceof Error ? imageError.message : "No pudimos cargar la imagen."
      )
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    const today = new Date().toISOString().slice(0, 10)

    if (formData.fecha < today) {
      setError("La fecha del evento no puede ser anterior a hoy.")
      return
    }

    if (formData.fechaFin && formData.fechaFin < formData.fecha) {
      setError("La fecha final no puede ser anterior a la fecha inicial.")
      return
    }

    if (!ownerEmail) {
      setError("Necesitas una cuenta activa para cargar eventos.")
      return
    }

    setSaving(true)

    const payload = {
      titulo: formData.titulo.trim(),
      categoria: formData.categoria,
      fecha: formData.fecha,
      fecha_fin: formData.fechaFin || null,
      ubicacion: formData.ubicacion.trim(),
      telefono: formData.telefono.trim() || null,
      descripcion: formData.descripcion.trim(),
      imagen: formData.imagen || null,
      estado: "borrador",
      usa_whatsapp: formData.usaWhatsapp,
      owner_email: ownerEmail,
    }

    const { error: insertError } = await supabase.from("eventos").insert([payload])

    if (insertError) {
      setError(`No pudimos guardar el evento: ${insertError.message}`)
      setSaving(false)
      return
    }

    setSuccess("Tu evento quedo guardado como borrador.")
    setSaving(false)
    window.setTimeout(() => {
      router.push("/sumate/panel")
      router.refresh()
    }, 900)
  }

  return (
    <AccessPageShell
      eyebrow="Nuevo evento"
      title="Carga un evento"
      description="Puedes sumar eventos, promos o sorteos desde tu panel. Quedan guardados como borrador."
      secondaryLink={{ href: "/sumate/panel", label: "Volver al panel" }}
    >
      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          Preparando formulario...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Titulo</label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(event) => setFormData((current) => ({ ...current, titulo: event.target.value }))}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Categoria</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {categoriasEvento.map((category) => (
                <label
                  key={category}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    formData.categoria === category
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-700 hover:border-blue-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="categoria"
                    value={category}
                    checked={formData.categoria === category}
                    onChange={(event) => setFormData((current) => ({ ...current, categoria: event.target.value }))}
                    className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Fecha desde</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(event) => setFormData((current) => ({ ...current, fecha: event.target.value }))}
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Fecha hasta</label>
              <input
                type="date"
                value={formData.fechaFin}
                onChange={(event) => setFormData((current) => ({ ...current, fechaFin: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Ubicacion</label>
            <input
              type="text"
              value={formData.ubicacion}
              onChange={(event) => setFormData((current) => ({ ...current, ubicacion: event.target.value }))}
              required
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

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={formData.usaWhatsapp}
              onChange={(event) => setFormData((current) => ({ ...current, usaWhatsapp: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Este numero tiene WhatsApp</span>
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Descripcion</label>
            <textarea
              value={formData.descripcion}
              onChange={(event) => setFormData((current) => ({ ...current, descripcion: event.target.value }))}
              rows={5}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Imagen</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-600 hover:file:bg-blue-100"
            />
            {formData.imagen ? (
              <img src={formData.imagen} alt="Vista previa del evento" className="mt-3 h-44 w-full rounded-2xl object-cover" />
            ) : null}
          </div>

          {error ? <AuthFormStatus tone="error" message={error} /> : null}
          {success ? <AuthFormStatus tone="success" message={success} /> : null}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
          >
            {saving ? "Guardando evento..." : "Guardar evento en borrador"}
          </button>
        </form>
      )}
    </AccessPageShell>
  )
}
