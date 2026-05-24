'use client'

import { useMemo, useState } from "react"
import { CheckCircle2, Send } from "lucide-react"
import { PublicHeader } from "../components/PublicHeader"
import { serializePublicLead, type PublicLeadType } from "../lib/publicLead"
import { buildPublicNav } from "../lib/publicNav"

export type SumateType = Extract<PublicLeadType, "comercio" | "servicio" | "curso">

type SumateCopy = {
  title: string
  description: string
  listingLabel: string
  listingPlaceholder: string
  detailsLabel: string
  detailsPlaceholder: string
  extraLabel: string
  extraPlaceholder: string
}

const copyByType: Record<SumateType, SumateCopy> = {
  comercio: {
    title: "Sumar comercio",
    description: "Compartinos los datos del comercio para revisarlo y sumarlo a Hola Varela.",
    listingLabel: "Nombre del comercio",
    listingPlaceholder: "Ej: Almacen Centro",
    detailsLabel: "Descripcion breve",
    detailsPlaceholder: "Que ofrece, horarios o datos importantes.",
    extraLabel: "Direccion",
    extraPlaceholder: "Calle, numero o referencia",
  },
  servicio: {
    title: "Sumar servicio",
    description: "Envia un servicio o profesional para incorporarlo a la guia.",
    listingLabel: "Nombre del servicio",
    listingPlaceholder: "Ej: Electricista, alojamiento, gestoria",
    detailsLabel: "Descripcion breve",
    detailsPlaceholder: "Que servicio ofrece y como trabaja.",
    extraLabel: "Categoria",
    extraPlaceholder: "Ej: Oficios, Profesionales, Alojamiento",
  },
  curso: {
    title: "Sumar curso o clase",
    description: "Mandanos la propuesta para revisarla y publicarla en cursos.",
    listingLabel: "Nombre del curso",
    listingPlaceholder: "Ej: Taller de guitarra",
    detailsLabel: "Descripcion breve",
    detailsPlaceholder: "Dias, modalidad, publico o informacion clave.",
    extraLabel: "Responsable",
    extraPlaceholder: "Persona, institucion o equipo a cargo",
  },
}

type SumateClientProps = {
  selectedType: SumateType
}

const initialForm = {
  senderName: "",
  senderPhone: "",
  listingName: "",
  listingDescription: "",
  extra: "",
  listingPhone: "",
  notes: "",
}

export function SumateClient({ selectedType }: SumateClientProps) {
  const copy = copyByType[selectedType]
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const activeNav = useMemo(() => {
    if (selectedType === "curso") return "cursos"
    if (selectedType === "servicio") return "servicios"
    return "comercios"
  }, [selectedType])

  const updateForm = (key: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("")
    setError("")
    setLoading(true)

    const message = serializePublicLead({
      version: 1,
      type: selectedType,
      senderName: form.senderName.trim(),
      senderEmail: "",
      senderPhone: form.senderPhone.trim(),
      listingName: form.listingName.trim(),
      listingDescription: form.listingDescription.trim(),
      listingAddress: selectedType === "comercio" ? form.extra.trim() : "",
      listingPhone: form.listingPhone.trim(),
      listingImage: null,
      serviceCategory: selectedType === "servicio" ? form.extra.trim() : undefined,
      courseResponsible: selectedType === "curso" ? form.extra.trim() : undefined,
      courseContact: selectedType === "curso" ? form.listingPhone.trim() : undefined,
      notes: form.notes.trim() || undefined,
    })

    const response = await fetch("/api/contacto", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre: form.senderName.trim(),
        telefono: form.senderPhone.trim(),
        mensaje: message,
      }),
    })

    const result = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null

    setLoading(false)

    if (!response.ok) {
      setError(result?.error || "No pudimos enviar la solicitud. Proba de nuevo.")
      return
    }

    setForm(initialForm)
    setStatus("Recibimos tu solicitud. La vamos a revisar antes de publicarla.")
  }

  return (
    <main className="min-h-screen bg-white">
      <PublicHeader items={buildPublicNav(activeNav)} />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-950">{copy.title}</h1>
          <p className="mt-2 text-slate-600">{copy.description}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-900">
              Tu nombre
              <input
                type="text"
                value={form.senderName}
                onChange={(event) => updateForm("senderName", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-300"
                placeholder="Nombre y apellido"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-900">
              Tu telefono
              <input
                type="tel"
                value={form.senderPhone}
                onChange={(event) => updateForm("senderPhone", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-300"
                placeholder="Para contactarte"
                required
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-900">
              {copy.listingLabel}
              <input
                type="text"
                value={form.listingName}
                onChange={(event) => updateForm("listingName", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-300"
                placeholder={copy.listingPlaceholder}
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-900">
              Telefono publico
              <input
                type="tel"
                value={form.listingPhone}
                onChange={(event) => updateForm("listingPhone", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-300"
                placeholder="WhatsApp o telefono de contacto"
              />
            </label>
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-900">
            {copy.extraLabel}
            <input
              type="text"
              value={form.extra}
              onChange={(event) => updateForm("extra", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-300"
              placeholder={copy.extraPlaceholder}
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-900">
            {copy.detailsLabel}
            <textarea
              value={form.listingDescription}
              onChange={(event) => updateForm("listingDescription", event.target.value)}
              className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-300"
              placeholder={copy.detailsPlaceholder}
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-900">
            Notas para el equipo
            <textarea
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-300"
              placeholder="Cualquier dato extra que ayude a revisar la publicacion."
            />
          </label>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {status ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {status}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {loading ? "Enviando..." : "Enviar solicitud"}
          </button>
        </form>
      </div>
    </main>
  )
}
