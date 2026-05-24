import { SumateClient, type SumateType } from "./SumateClient"

const isSumateType = (value: string | string[] | undefined): value is SumateType =>
  value === "comercio" || value === "servicio" || value === "curso"

export default async function SumatePage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string | string[] }>
}) {
  const params = await searchParams
  const selectedType = isSumateType(params.tipo) ? params.tipo : "comercio"

  return <SumateClient selectedType={selectedType} />
}
