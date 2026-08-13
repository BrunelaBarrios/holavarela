import { NextResponse, type NextRequest } from "next/server"
import { attachHechoVarelaSession, clearHechoVarelaSession, readHechoVarelaSession, validHechoVarelaCredentials } from "../../../lib/hechoVarelaAdminSession"

export async function GET(request: NextRequest) { return NextResponse.json({ authenticated: await readHechoVarelaSession(request) }) }
export async function POST(request: NextRequest) { const { username = "", password = "" } = await request.json(); if (!validHechoVarelaCredentials(username, password)) return NextResponse.json({ error: "Usuario o contraseña incorrectos, o acceso aún no configurado." }, { status: 401 }); return attachHechoVarelaSession(NextResponse.json({ ok: true })) }
export async function DELETE() { return clearHechoVarelaSession(NextResponse.json({ ok: true })) }
