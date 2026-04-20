import { NextResponse } from "next/server"
import { readSiteTrafficSnapshotFromEnv } from "../../../../lib/siteTrafficSummary"

export const revalidate = 1800

export async function GET() {
  const snapshot = readSiteTrafficSnapshotFromEnv()

  return NextResponse.json(snapshot, {
    headers: {
      // Dejamos cache suave para no recalcular en cada visita.
      "Cache-Control": "s-maxage=1800, stale-while-revalidate=43200",
    },
  })
}
