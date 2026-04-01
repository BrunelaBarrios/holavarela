'use client'

import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, ImageIcon, MapPin, MessageSquareText, Phone, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthFormStatus } from "../../../components/AuthFormStatus"
import { fileToDataUrl } from "../../../lib/fileToDataUrl"
import { findUserOwnedEntity } from "../../../lib/userProfiles"
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

const categoriasEvento = ["Evento", "Promocion", "Sorteo", "Beneficio", "Consulta"]

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

export default function UsuariosNuevoEventoPage() {
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
        router.replace("/usuarios/login")
        return
      }

      try {
        const entity = await findUserOwnedEntity(session.user.email)

        if (!entity) {
          router.replace("/usuarios")
          return
        }

        setOwnerEmail(session.user.email)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No pudimos preparar tu evento.")
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
      setError(imageError instanceof Error ? imageError.message : "No pudimos cargar la imagen.")
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
      router.push("/usuarios")
      router.refresh()
    }, 900)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {loading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)]">
            Preparando formulario...
          </div>
        ) : (
          <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
            <div className="grid lg:grid-cols-[1.05fr_1.15fr]">
              <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
                <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Nuevo evento
                </div>

                <div className="mt-6 max-w-2xl">
                  <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                    Carga una novedad para tu perfil
                  </h1>
                  <p className="mt-4 text-lg leading-8 text-slate-600">
                    Puedes publicar eventos, promociones, sorteos, beneficios o consultas. Todo entra como borrador para revisarlo antes de mostrarlo.
                  </p>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-white p-3 shadow-sm">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Que conviene cargar aca</div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Actividades especiales, promos del mes, sorteos, beneficios y cualquier novedad puntual de tu espacio.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/usuarios"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    Volver al panel
                  </Link>
                </div>
              </div>

              <div className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-6 py-8 sm:px-8 sm:py-10">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Titulo</label>
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(event) => setFormData((current) => ({ ...current, titulo: event.target.value }))}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
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
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="categoria"
                            value={category}
                            checked={formData.categoria === category}
                            onChange={(event) =>
                              setFormData((current) => ({ ...current, categoria: event.target.value }))
                            }
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
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Fecha hasta</label>
                      <input
                        type="date"
                        value={formData.fechaFin}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, fechaFin: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Ubicacion</label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formData.ubicacion}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, ubicacion: event.target.value }))
                        }
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Telefono</label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formData.telefono}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, telefono: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.usaWhatsapp}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, usaWhatsapp: event.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Este numero tiene WhatsApp</span>
                  </label>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Descripcion</label>
                    <div className="relative">
                      <MessageSquareText className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400" />
                      <textarea
                        value={formData.descripcion}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, descripcion: event.target.value }))
                        }
                        rows={6}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Imagen</label>
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-600 hover:file:bg-blue-100"
                      />

                      {formData.imagen ? (
                        <img
                          src={formData.imagen}
                          alt="Vista previa del evento"
                          className="mt-4 h-52 w-full rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="mt-4 flex h-40 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                          <div className="flex items-center gap-2 text-sm">
                            <ImageIcon className="h-5 w-5" />
                            Sin imagen seleccionada
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {error ? <AuthFormStatus tone="error" message={error} /> : null}
                  {success ? <AuthFormStatus tone="success" message={success} /> : null}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
                    >
                      <Sparkles className="h-4 w-4" />
                      {saving ? "Guardando evento..." : "Guardar evento en borrador"}
                    </button>

                    <Link
                      href="/usuarios"
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      Cancelar
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
