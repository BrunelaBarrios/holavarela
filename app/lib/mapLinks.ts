const JOSE_PEDRO_VARELA_CONTEXT = "Jose Pedro Varela, Lavalleja, Uruguay"

export function buildJosePedroVarelaDirectionsUrl(
  address?: string | null,
  directionsOverride?: string | null
) {
  const normalizedOverride = directionsOverride?.trim()
  const normalizedAddress = address?.trim()

  if (normalizedOverride && /^https?:\/\//i.test(normalizedOverride)) {
    return normalizedOverride
  }

  const queryBase = normalizedOverride || normalizedAddress
  const query = queryBase
    ? `${queryBase}, ${JOSE_PEDRO_VARELA_CONTEXT}`
    : JOSE_PEDRO_VARELA_CONTEXT

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
