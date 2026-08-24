import type { NextRequest, NextResponse } from "next/server"

const COOKIE = "hecho_varela_admin"
const TTL = 60 * 60 * 12
const encoder = new TextEncoder()

export type HechoVarelaSession = { id: string; username: string; role: "superadmin" | "admin"; emprendimientoId: string | null; exp: number }

function credentials() { return { username: process.env.HECHO_VARELA_ADMIN_USERNAME || "hechoenvarela", password: process.env.HECHO_VARELA_ADMIN_PASSWORD || "" } }
function secret() { const value = process.env.HECHO_VARELA_ADMIN_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY; if (!value) throw new Error("Falta HECHO_VARELA_ADMIN_SECRET."); return value }
function base64(bytes: Uint8Array) { let value = ""; bytes.forEach(byte => { value += String.fromCharCode(byte) }); return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "") }
function decodeBase64(value: string) { const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="); return Uint8Array.from(atob(normalized), char => char.charCodeAt(0)) }
async function signature(payload: string) { const key = await crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return base64(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)))) }
function safeEqual(left: string, right: string) { if (left.length !== right.length) return false; let mismatch = 0; for (let index = 0; index < left.length; index++) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index); return mismatch === 0 }

export function validBootstrapCredentials(username: string, password: string) { const configured = credentials(); return Boolean(configured.password) && username.trim() === configured.username && password === configured.password }
export async function hashHechoVarelaPassword(password: string, salt = base64(crypto.getRandomValues(new Uint8Array(16)))) { const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]); const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: decodeBase64(salt), iterations: 210000 }, material, 256); return { hash: base64(new Uint8Array(bits)), salt } }
export async function verifyHechoVarelaPassword(password: string, hash: string, salt: string) { const candidate = await hashHechoVarelaPassword(password, salt); return safeEqual(candidate.hash, hash) }

export async function attachHechoVarelaSession(response: NextResponse, session: Omit<HechoVarelaSession, "exp">) { const payload = base64(encoder.encode(JSON.stringify({ ...session, exp: Date.now() + TTL * 1000 }))); response.cookies.set(COOKIE, `${payload}.${await signature(payload)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL }); return response }
export async function readHechoVarelaSession(request: NextRequest): Promise<HechoVarelaSession | null> { const value = request.cookies.get(COOKIE)?.value; if (!value) return null; const [payload, signed] = value.split("."); if (!payload || !signed || !safeEqual(signed, await signature(payload))) return null; try { const session = JSON.parse(new TextDecoder().decode(decodeBase64(payload))) as HechoVarelaSession; return session.exp > Date.now() && Boolean(session.username) ? session : null } catch { return null } }
export function clearHechoVarelaSession(response: NextResponse) { response.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 }); return response }
