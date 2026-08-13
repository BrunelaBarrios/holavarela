export const HECHO_EN_VARELA_CATEGORIES = [
  "Artesanías", "Decoración", "Regalos", "Tejidos y textiles", "Accesorios",
  "Alimentos artesanales", "Cuidado personal", "Otros",
] as const

export type EmprendimientoVarela = {
  id: string; nombre: string; slug: string; descripcion: string | null; whatsapp: string
  instagram_url: string | null; redes_url: string | null; modalidad_entrega: string | null
  logo_url: string | null; activo: boolean; orden: number
}

export type ProductoVarela = {
  id: string; emprendimiento_id: string; nombre: string; slug: string
  descripcion_breve: string | null; descripcion: string | null; categoria: string
  precio: number | null; consultar_precio: boolean; imagenes: string[]; variantes: string[]
  informacion_entrega: string | null; activo: boolean; destacado: boolean; orden: number
  emprendimientos_varela?: EmprendimientoVarela | null
}

export function whatsappUrl(phone: string, productName: string) {
  const number = phone.replace(/\D/g, "")
  const message = `Hola, vi este producto en Hecho en Varela y me gustaría recibir más información: ${productName}`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export function formatPrice(price: number | null, consult: boolean) {
  if (consult || price == null) return "Consultar precio"
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(price)
}

export function makeSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}
