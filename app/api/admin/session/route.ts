import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import type { AdminSession } from "../../../lib/adminAuth"
import {
  ADMIN_DEFAULT_CREDENTIALS,
  attachAdminSessionCookie,
  clearAdminSessionCookie,
  readAdminSessionFromCookies,
} from "../../../lib/adminSession"
import { getClientIp, consumeRateLimit } from "../../../lib/rateLimit"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

async function validateCredentials(username: string, password: string): Promise<AdminSession | null> {
  const normalizedUsername = username.trim()

  if (
    normalizedUsername === ADMIN_DEFAULT_CREDENTIALS.username &&
    password === ADMIN_DEFAULT_CREDENTIALS.password
  ) {
    return {
      username: ADMIN_DEFAULT_CREDENTIALS.username,
      name: ADMIN_DEFAULT_CREDENTIALS.name,
      role: ADMIN_DEFAULT_CREDENTIALS.role,
    }
  }

  const { data, error } = await getSupabaseAdmin()
    .from("administradores")
    .select("usuario, nombre, contrasena, rol, activo")
    .eq("usuario", normalizedUsername)
    .eq("activo", true)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data || data.contrasena !== password) {
    return null
  }

  return {
    username: data.usuario,
    name: data.nombre || data.usuario,
    role: data.rol === "superadmin" ? "superadmin" : "admin",
  }
}

export async function GET() {
  const session = await readAdminSessionFromCookies(await cookies())
  return NextResponse.json({ session })
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const rateLimit = consumeRateLimit({
      key: `admin-session:${clientIp}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera un poco y vuelve a probar." },
        { status: 429 }
      )
    }

    const { username, password } = (await request.json()) as {
      username?: string
      password?: string
    }

    if (!username?.trim() || !password) {
      return NextResponse.json(
        { error: "Ingresa usuario y contrasena." },
        { status: 400 }
      )
    }

    const session = await validateCredentials(username, password)

    if (!session) {
      return NextResponse.json(
        { error: "Usuario o contrasena incorrectos." },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ ok: true, session })
    return await attachAdminSessionCookie(response, session)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos iniciar sesion."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  return clearAdminSessionCookie(response)
}
