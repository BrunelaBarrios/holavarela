import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

type EntityType = "comercio" | "servicio" | "curso" | "institucion"
type EntityTable = "comercios" | "servicios" | "cursos" | "instituciones"

type ProfilePayload = {
  type?: EntityType
  payload?: Record<string, unknown>
}

const entityConfigs: Array<{ type: EntityType; table: EntityTable }> = [
  { type: "comercio", table: "comercios" },
  { type: "servicio", table: "servicios" },
  { type: "curso", table: "cursos" },
  { type: "institucion", table: "instituciones" },
]

function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error("Faltan variables de entorno de Supabase.")
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function getAuthenticatedEmail(request: Request) {
  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (!token) return null

  const serverSupabase = getServerSupabase()
  const {
    data: { user },
    error,
  } = await serverSupabase.auth.getUser(token)

  if (error || !user?.email) return null
  return user.email
}

function normalizeText(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : ""
  return normalized ? normalized : null
}

function normalizeRequiredText(value: unknown) {
  return normalizeText(value) || ""
}

function normalizeUrl(value: unknown) {
  const normalized = normalizeText(value)
  if (!normalized) return null

  try {
    const url = new URL(normalized)
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

function normalizeBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback
}

function buildInsertPayload(type: EntityType, payload: Record<string, unknown>, email: string) {
  if (type === "comercio") {
    return {
      nombre: normalizeRequiredText(payload.nombre),
      direccion: normalizeText(payload.direccion),
      telefono: normalizeText(payload.telefono),
      descripcion: normalizeText(payload.descripcion),
      web_url: normalizeUrl(payload.web_url),
      instagram_url: normalizeUrl(payload.instagram_url),
      facebook_url: normalizeUrl(payload.facebook_url),
      imagen_url: null,
      estado: "borrador",
      owner_email: email,
      usa_whatsapp: normalizeBoolean(payload.usa_whatsapp, true),
    }
  }

  if (type === "servicio") {
    return {
      nombre: normalizeRequiredText(payload.nombre),
      categoria: normalizeRequiredText(payload.categoria) || "Profesionales",
      descripcion: normalizeText(payload.descripcion),
      responsable: normalizeText(payload.responsable),
      contacto: normalizeText(payload.contacto),
      direccion: normalizeText(payload.direccion),
      web_url: normalizeUrl(payload.web_url),
      instagram_url: normalizeUrl(payload.instagram_url),
      facebook_url: normalizeUrl(payload.facebook_url),
      imagen: null,
      estado: "borrador",
      owner_email: email,
      usa_whatsapp: normalizeBoolean(payload.usa_whatsapp, true),
    }
  }

  if (type === "curso") {
    return {
      nombre: normalizeRequiredText(payload.nombre),
      descripcion: normalizeRequiredText(payload.descripcion),
      responsable: normalizeRequiredText(payload.responsable),
      contacto: normalizeRequiredText(payload.contacto),
      web_url: normalizeUrl(payload.web_url),
      instagram_url: normalizeUrl(payload.instagram_url),
      facebook_url: normalizeUrl(payload.facebook_url),
      imagen: null,
      estado: "borrador",
      owner_email: email,
      usa_whatsapp: normalizeBoolean(payload.usa_whatsapp, true),
    }
  }

  return {
    nombre: normalizeRequiredText(payload.nombre),
    descripcion: normalizeText(payload.descripcion),
    direccion: normalizeText(payload.direccion),
    telefono: normalizeText(payload.telefono),
    web_url: normalizeUrl(payload.web_url),
    instagram_url: normalizeUrl(payload.instagram_url),
    facebook_url: normalizeUrl(payload.facebook_url),
    foto: null,
    estado: "borrador",
    owner_email: email,
    usa_whatsapp: normalizeBoolean(payload.usa_whatsapp, true),
  }
}

function validatePayload(type: EntityType, payload: ReturnType<typeof buildInsertPayload>) {
  if (!payload.nombre) return "Completa el nombre antes de continuar."

  if (type === "curso") {
    const coursePayload = payload as {
      descripcion: string
      responsable: string
      contacto: string
    }

    if (!coursePayload.descripcion || !coursePayload.responsable || !coursePayload.contacto) {
      return "Completa nombre, descripcion, responsable y contacto del curso."
    }
  }

  return null
}

function revalidateProfilePages(type: EntityType, id?: number) {
  revalidatePath("/")

  if (type === "comercio") {
    revalidatePath("/comercios")
    if (id) revalidatePath(`/comercios/${id}`)
    return
  }

  if (type === "servicio") {
    revalidatePath("/servicios")
    if (id) revalidatePath(`/servicios/${id}`)
    return
  }

  if (type === "curso") {
    revalidatePath("/cursos")
    return
  }

  revalidatePath("/instituciones")
  if (id) revalidatePath(`/instituciones/${id}`)
}

export async function POST(request: Request) {
  try {
    const email = await getAuthenticatedEmail(request)

    if (!email) {
      return NextResponse.json({ error: "Sesion no valida." }, { status: 401 })
    }

    const body = (await request.json()) as ProfilePayload
    const type = body.type
    const config = entityConfigs.find((item) => item.type === type)

    if (!type || !config || !body.payload) {
      return NextResponse.json({ error: "Faltan datos para crear el perfil." }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    for (const currentConfig of entityConfigs) {
      const { data, error } = await supabaseAdmin
        .from(currentConfig.table)
        .select("id")
        .eq("owner_email", email)
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        return NextResponse.json(
          { error: "Esta cuenta ya tiene una ficha vinculada." },
          { status: 409 }
        )
      }
    }

    const insertPayload = buildInsertPayload(type, body.payload, email)
    const validationError = validatePayload(type, insertPayload)

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from(config.table)
      .insert([insertPayload])
      .select("id")
      .single()

    if (error) throw error

    revalidateProfilePages(type, data?.id)

    return NextResponse.json({ ok: true, id: data?.id })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos crear el perfil."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
