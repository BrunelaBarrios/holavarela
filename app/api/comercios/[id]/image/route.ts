import type { NextRequest } from "next/server"
import { dataUrlImageResponse } from "../../../../lib/dataUrlImageResponse"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return dataUrlImageResponse("comercios", ["imagen", "imagen_url"], id)
}
