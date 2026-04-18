import type { NextRequest, NextResponse } from "next/server"
import type { AdminRole, AdminSession } from "./adminAuth"

export const ADMIN_SESSION_COOKIE = "hola_varela_admin"
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

type SignedAdminSession = AdminSession & {
  exp: number
}

type CookieReader = {
  get(name: string): { value: string } | undefined
}

export const ADMIN_DEFAULT_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME?.trim() || "admin",
  password: process.env.ADMIN_PASSWORD || "333Varela2026",
  name: process.env.ADMIN_NAME?.trim() || "Superadministrador",
  role: (process.env.ADMIN_ROLE === "admin" ? "admin" : "superadmin") as AdminRole,
}

function getAdminSessionSecret() {
  const secret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!secret) {
    throw new Error(
      "Falta ADMIN_SESSION_SECRET o una clave de Supabase para firmar la sesion admin."
    )
  }

  return secret
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function toBase64Url(value: string) {
  return bytesToBase64Url(textEncoder.encode(value))
}

function fromBase64Url(value: string) {
  return textDecoder.decode(base64UrlToBytes(value))
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(getAdminSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
}

async function signValue(value: string) {
  const signature = await crypto.subtle.sign("HMAC", await getSigningKey(), textEncoder.encode(value))
  return bytesToBase64Url(new Uint8Array(signature))
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false

  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return mismatch === 0
}

async function encodeSignedSession(session: AdminSession) {
  const payload: SignedAdminSession = {
    ...session,
    exp: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000,
  }
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  return `${encodedPayload}.${await signValue(encodedPayload)}`
}

async function decodeSignedSession(value?: string | null): Promise<AdminSession | null> {
  if (!value) return null

  const [encodedPayload, signature] = value.split(".")
  if (!encodedPayload || !signature) return null

  const expectedSignature = await signValue(encodedPayload)

  if (!safeEqual(signature, expectedSignature)) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SignedAdminSession
    if (!payload?.username || !payload?.name || !payload?.role || payload.exp < Date.now()) {
      return null
    }

    return {
      username: payload.username,
      name: payload.name,
      role: payload.role,
    }
  } catch {
    return null
  }
}

export async function attachAdminSessionCookie(response: NextResponse, session: AdminSession) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: await encodeSignedSession(session),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  })
  return response
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  return response
}

export async function readAdminSessionFromCookies(cookieStore: CookieReader) {
  return decodeSignedSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)
}

export async function readAdminSessionFromRequest(request: NextRequest) {
  return readAdminSessionFromCookies(request.cookies)
}
