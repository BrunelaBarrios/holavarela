import { NextResponse } from "next/server"
import { supabaseServer } from "../../../lib/supabaseServer"

const VIEW_MORE_SECTIONS = [
  "comercios",
  "eventos",
  "cursos",
  "servicios",
  "instituciones",
] as const

type ViewMoreSection = (typeof VIEW_MORE_SECTIONS)[number]

type ViewMorePayload = {
  section?: string
  itemId?: string
  itemTitle?: string | null
}

const isViewMoreSection = (value?: string): value is ViewMoreSection =>
  Boolean(value && VIEW_MORE_SECTIONS.includes(value as ViewMoreSection))

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ViewMorePayload
    const section = body.section
    const itemId = body.itemId?.trim()

    if (!isViewMoreSection(section) || !itemId) {
      return NextResponse.json({ error: "Datos invalidos." }, { status: 400 })
    }

    const { error } = await supabaseServer.from("view_more_clicks").insert([
      {
        section,
        item_id: itemId,
        item_title: body.itemTitle || null,
      },
    ])

    if (error) {
      throw error
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo registrar Ver más."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
