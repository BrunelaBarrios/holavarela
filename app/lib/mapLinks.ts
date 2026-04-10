const JOSE_PEDRO_VARELA_CONTEXT = "Jose Pedro Varela, Lavalleja, Uruguay"

export function buildJosePedroVarelaDirectionsUrl(address?: string | null) {
  const normalizedAddress = address?.trim()

  const query = normalizedAddress
    ? `${normalizedAddress}, ${JOSE_PEDRO_VARELA_CONTEXT}`
    : JOSE_PEDRO_VARELA_CONTEXT

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
