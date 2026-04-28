type SubmissionContact = {
  senderName: string
  senderPhone: string
}

type EventDescriptionOptions = {
  contact?: SubmissionContact | null
  hideDate?: boolean
}

const META_MARKER = "[[HV_SUBMISSION_META]]"

export function buildEventDescription(
  description: string,
  options?: SubmissionContact | EventDescriptionOptions | null
) {
  const baseDescription = description.trim()
  const normalizedOptions =
    options && ("senderName" in options || "senderPhone" in options)
      ? { contact: options as SubmissionContact, hideDate: false }
      : ((options || {}) as EventDescriptionOptions)
  const contact = normalizedOptions.contact
  const hideDate = Boolean(normalizedOptions.hideDate)

  if (!hideDate && (!contact?.senderName?.trim() || !contact?.senderPhone?.trim())) {
    return baseDescription
  }

  return [
    baseDescription,
    META_MARKER,
    hideDate ? "hide_date=true" : null,
    contact?.senderName?.trim() ? `sender_name=${contact.senderName.trim()}` : null,
    contact?.senderPhone?.trim() ? `sender_phone=${contact.senderPhone.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n")
}

export function parseEventDescription(rawDescription?: string | null) {
  const content = rawDescription || ""
  const markerIndex = content.indexOf(META_MARKER)

  if (markerIndex === -1) {
    return {
      baseDescription: content.trim(),
      hideDate: false,
      submissionContact: null,
    }
  }

  const baseDescription = content.slice(0, markerIndex).trim()
  const metaLines = content
    .slice(markerIndex + META_MARKER.length)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const senderName =
    metaLines.find((line) => line.startsWith("sender_name="))?.slice("sender_name=".length).trim() || ""
  const senderPhone =
    metaLines.find((line) => line.startsWith("sender_phone="))?.slice("sender_phone=".length).trim() || ""
  const hideDate = metaLines.some((line) => line === "hide_date=true")

  return {
    baseDescription,
    hideDate,
    submissionContact:
      senderName && senderPhone
        ? {
            senderName,
            senderPhone,
          }
        : null,
  }
}

export function shouldHideEventDate(
  rawDescription?: string | null,
  categoria?: string | null
) {
  const normalizedCategory = categoria?.trim().toLowerCase()

  if (normalizedCategory === "aviso" || normalizedCategory === "avisos") {
    return true
  }

  return parseEventDescription(rawDescription).hideDate
}
