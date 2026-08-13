import type { NextRequest, NextResponse } from "next/server"

const COOKIE = "hecho_varela_admin"
const TTL = 60 * 60 * 12
const encoder = new TextEncoder()

function credentials() {
  return {
    username: process.env.HECHO_VARELA_ADMIN_USERNAME || "hechoenvarela",
    password: process.env.HECHO_VARELA_ADMIN_PASSWORD || "",
  }
}

function secret() {
  const value = process.env.HECHO_VARELA_ADMIN_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error("Falta HECHO_VARELA_ADMIN_SECRET.")
  return value
}

function base64(bytes: Uint8Array) {
  let value = ""; bytes.forEach(byte => { value += String.fromCharCode(byte) })
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

async function signature(payload: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  return base64(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))))
}

export function validHechoVarelaCredentials(username: string, password: string) {
  const configured = credentials()
  return Boolean(configured.password) && username.trim() === configured.username && password === configured.password
}

export async function attachHechoVarelaSession(response: NextResponse) {
  const payload = base64(encoder.encode(JSON.stringify({ exp: Date.now() + TTL * 1000 })))
  response.cookies.set(COOKIE, `${payload}.${await signature(payload)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL })
  return response
}

export async function readHechoVarelaSession(request: NextRequest) {
  const value = request.cookies.get(COOKIE)?.value
  if (!value) return false
  const [payload, signed] = value.split(".")
  if (!payload || !signed || signed !== await signature(payload)) return false
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=")
    return JSON.parse(atob(normalized)).exp > Date.now()
  } catch { return false }
}

export function clearHechoVarelaSession(response: NextResponse) {
  response.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
  return response
}
