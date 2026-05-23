import { NextResponse } from "next/server"
import { supabaseServer } from "./supabaseServer"

const DATA_URL_PATTERN = /^data:([^;]+);base64,([\s\S]+)$/

export async function dataUrlImageResponse(
  table: string,
  field: string,
  id: string
) {
  const { data, error } = await supabaseServer
    .from(table)
    .select(field)
    .eq("id", id)
    .maybeSingle()

  const row = data as Record<string, unknown> | null
  const imageValue = row?.[field]

  if (error || typeof imageValue !== "string") {
    return new NextResponse(null, { status: 404 })
  }

  const match = imageValue.match(DATA_URL_PATTERN)
  if (!match) {
    return new NextResponse(null, { status: 404 })
  }

  const [, contentType, base64Body] = match
  const body = Buffer.from(base64Body, "base64")

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
    },
  })
}
