export const COMMUNITY_MESSAGE_MAX_LENGTH = 500

export const COMMUNITY_MESSAGE_STATES = [
  "pendiente",
  "programado",
  "activo",
  "vencido",
  "rechazado",
  "cancelado",
] as const

export type CommunityMessageState = (typeof COMMUNITY_MESSAGE_STATES)[number]

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const linkPattern = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|uy|ar|io|co)\b)/i
const phonePattern = /(?:\+?\d[\s().-]*){7,}/

export function validatePublicCommunityMessage(input: {
  nombre?: unknown
  mensaje?: unknown
  institucionId?: unknown
  fechaProgramada?: unknown
}) {
  const nombre = typeof input.nombre === "string" ? input.nombre.trim() : ""
  const mensaje = typeof input.mensaje === "string" ? input.mensaje.trim() : ""
  const institucionId =
    input.institucionId === null || input.institucionId === "" || input.institucionId === undefined
      ? null
      : Number(input.institucionId)
  const fechaProgramada =
    typeof input.fechaProgramada === "string" && input.fechaProgramada
      ? new Date(input.fechaProgramada)
      : null

  if (!nombre || nombre.length > 80) return { error: "Ingresá un nombre de hasta 80 caracteres." }
  if (!mensaje || mensaje.length > COMMUNITY_MESSAGE_MAX_LENGTH) {
    return { error: `El mensaje debe tener entre 1 y ${COMMUNITY_MESSAGE_MAX_LENGTH} caracteres.` }
  }
  if (emailPattern.test(mensaje) || linkPattern.test(mensaje) || phonePattern.test(mensaje)) {
    return { error: "El mensaje no puede incluir enlaces, teléfonos ni correos electrónicos." }
  }
  if (institucionId !== null && (!Number.isInteger(institucionId) || institucionId <= 0)) {
    return { error: "La institución seleccionada no es válida." }
  }
  if (fechaProgramada && (Number.isNaN(fechaProgramada.getTime()) || fechaProgramada.getTime() <= Date.now())) {
    return { error: "La fecha programada debe ser posterior al momento actual." }
  }

  return {
    value: {
      nombre,
      mensaje,
      institucionId,
      fechaProgramada: fechaProgramada?.toISOString() || null,
    },
  }
}
