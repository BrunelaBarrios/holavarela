export const JOB_CATEGORIES = [
  "Atención al público", "Gastronomía", "Comercio", "Limpieza",
  "Administración", "Construcción", "Salud", "Educación",
  "Cuidado de personas", "Servicios", "Otros",
] as const

export const JOB_SCHEDULES = [
  "Tiempo completo", "Medio horario", "Por horas", "Eventual", "Zafral", "A convenir",
] as const

export const JOB_STATUSES = ["pendiente", "activa", "rechazada", "vencida"] as const
export type JobType = "oferta" | "busqueda"
export type JobStatus = (typeof JOB_STATUSES)[number]

export type JobOpportunity = {
  id: string
  tipo_publicacion: JobType
  nombre_publicante: string
  titulo: string
  categoria: string
  descripcion: string
  requisitos?: string | null
  experiencia?: string | null
  habilidades?: string | null
  tipo_jornada?: string | null
  horario?: string | null
  disponibilidad?: string | null
  localidad: string
  telefono?: string | null
  email?: string | null
  forma_postulacion?: string | null
  enlace_url?: string | null
  imagen_url?: string | null
  cv_url?: string | null
  estado: JobStatus
  fecha_creacion: string
  fecha_vencimiento?: string | null
  user_id?: string | null
}

export function formatJobDate(value: string) {
  return new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

export function getJobImages(item: Pick<JobOpportunity, "imagen_url">) {
  const value = item.imagen_url?.trim()
  if (!value) return []
  if (!value.startsWith("[")) return [value]

  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((image): image is string => typeof image === "string" && image.startsWith("data:image/"))
      : []
  } catch {
    return []
  }
}
