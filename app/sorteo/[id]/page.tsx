import { SweepstakesLandingPage } from "../../components/SweepstakesLandingPage"

type SorteoPageParams = {
  params: Promise<{ id: string }>
}

export default async function SorteoByIdPage({ params }: SorteoPageParams) {
  const { id } = await params
  const sorteoId = Number(id)

  return <SweepstakesLandingPage sorteoId={Number.isFinite(sorteoId) ? sorteoId : undefined} />
}
