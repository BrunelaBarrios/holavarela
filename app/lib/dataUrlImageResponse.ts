import { NextResponse } from "next/server"
import { unstable_cache } from "next/cache"
import { supabaseServer } from "./supabaseServer"

const DATA_URL_PATTERN = /^data:([^;]+);base64,([\s\S]+)$/
const IMAGE_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800"

const getCachedDataUrlImage = unstable_cache(
  async (table: string, field: string, id: string) => {
    const { data, error } = await supabaseServer
      .from(table)
      .select(field)
      .eq("id", id)
      .maybeSingle()

    if (error) return null

    const row = data as Record<string, unknown> | null
    const imageValue = row?.[field]

    return typeof imageValue === "string" ? imageValue : null
  },
  ["data-url-image"],
  { revalidate: 86400 }
)

export async function dataUrlImageResponse(
  table: string,
  field: string,
  id: string
) {
  const imageValue = await getCachedDataUrlImage(table, field, id)

  if (!imageValue) {
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
      "Cache-Control": IMAGE_CACHE_CONTROL,
      "Content-Length": String(body.byteLength),
    },
  })
}
