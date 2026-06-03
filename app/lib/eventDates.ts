const EVENT_TIME_ZONE = "America/Montevideo"

const parseEventDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const toDateKey = (date: Date, timeZone = EVENT_TIME_ZONE) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10)
  }

  return `${year}-${month}-${day}`
}

export const getTodayInMontevideo = () => toDateKey(new Date())

export const getDateKeyDaysAgo = (days: number, timeZone = EVENT_TIME_ZONE) => {
  const date = new Date()
  date.setDate(date.getDate() - Math.max(0, Math.trunc(days)))
  return toDateKey(date, timeZone)
}

const getMonthEndDate = (year: number, month: number) => {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
}

type EventDateFields = {
  id?: number | string | null
  fecha?: string | null
  fecha_fin?: string | null
  fecha_solo_mes?: boolean | null
}

const fallbackFutureDate = "9999-12-31"
const fallbackPastDate = "0000-01-01"

const getEventStartDate = (event: EventDateFields) => event.fecha || fallbackFutureDate

export const getEventEndDate = (event: EventDateFields) => {
  if (!event.fecha) return null

  if (event.fecha_solo_mes) {
    return buildMonthEventRange(event.fecha.slice(0, 7))?.endDate || event.fecha
  }

  return event.fecha_fin || event.fecha
}

const getEventSortDate = (event: EventDateFields, today: string) => {
  if (!event.fecha) return fallbackFutureDate

  const endDate = getEventEndDate(event)
  if (endDate && event.fecha <= today && endDate >= today) return today

  return event.fecha
}

export const compareUpcomingEvents = <T extends EventDateFields>(
  first: T,
  second: T,
  today = getTodayInMontevideo()
) => {
  const firstSortDate = getEventSortDate(first, today)
  const secondSortDate = getEventSortDate(second, today)
  if (firstSortDate !== secondSortDate) return firstSortDate.localeCompare(secondSortDate)

  const firstMonthOnly = first.fecha_solo_mes ? 1 : 0
  const secondMonthOnly = second.fecha_solo_mes ? 1 : 0
  if (firstMonthOnly !== secondMonthOnly) return firstMonthOnly - secondMonthOnly

  const firstStartDate = getEventStartDate(first)
  const secondStartDate = getEventStartDate(second)
  if (firstStartDate !== secondStartDate) return firstStartDate.localeCompare(secondStartDate)

  return String(first.id || "").localeCompare(String(second.id || ""))
}

export const comparePastEvents = <T extends EventDateFields>(first: T, second: T) => {
  const firstEndDate = getEventEndDate(first) || fallbackPastDate
  const secondEndDate = getEventEndDate(second) || fallbackPastDate
  if (firstEndDate !== secondEndDate) return secondEndDate.localeCompare(firstEndDate)

  const firstStartDate = getEventStartDate(first)
  const secondStartDate = getEventStartDate(second)
  if (firstStartDate !== secondStartDate) return secondStartDate.localeCompare(firstStartDate)

  return String(second.id || "").localeCompare(String(first.id || ""))
}

const formatLongDate = (value: string, locale = "es-UY") => {
  const date = parseEventDate(value)
  if (!date) return value

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

const formatMonthDate = (value: string, locale = "es-UY") => {
  const date = parseEventDate(value)
  if (!date) return value

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
  })
}

export const buildMonthEventRange = (monthValue: string) => {
  if (!/^\d{4}-\d{2}$/.test(monthValue)) return null

  const [yearRaw, monthRaw] = monthValue.split("-")
  const year = Number(yearRaw)
  const month = Number(monthRaw)

  if (!year || !month || month < 1 || month > 12) return null

  const startDate = `${yearRaw}-${monthRaw}-01`
  const endDate = getMonthEndDate(year, month)

  return { startDate, endDate }
}

export const formatEventDateRange = (
  startDate: string,
  endDate?: string | null,
  monthOnly = false,
  locale = "es-UY"
) => {
  if (!startDate) return "Sin fecha"
  if (monthOnly) return formatMonthDate(startDate, locale)
  if (!endDate || endDate === startDate) return formatLongDate(startDate, locale)

  const start = parseEventDate(startDate)
  const end = parseEventDate(endDate)

  if (!start || !end) return `${startDate} al ${endDate}`

  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()

  if (sameMonth) {
    const month = start.toLocaleDateString(locale, { month: "long" })
    return `${start.getDate()} al ${end.getDate()} de ${month} de ${start.getFullYear()}`
  }

  if (sameYear) {
    const startMonth = start.toLocaleDateString(locale, { month: "long" })
    const endMonth = end.toLocaleDateString(locale, { month: "long" })
    return `${start.getDate()} de ${startMonth} al ${end.getDate()} de ${endMonth} de ${start.getFullYear()}`
  }

  return `${formatLongDate(startDate, locale)} al ${formatLongDate(endDate, locale)}`
}

export const buildActiveEventsFilter = (today: string) =>
  `fecha.gte.${today},and(fecha.lte.${today},fecha_fin.gte.${today})`

export const isEventCurrentOrUpcoming = ({
  fecha,
  fecha_fin,
  fecha_solo_mes,
}: {
  fecha?: string | null
  fecha_fin?: string | null
  fecha_solo_mes?: boolean | null
}) => {
  if (!fecha) return false
  const today = getTodayInMontevideo()

  if (fecha_solo_mes) {
    const monthRange = buildMonthEventRange(fecha.slice(0, 7))
    return Boolean(monthRange && monthRange.endDate >= today)
  }

  return (getEventEndDate({ fecha, fecha_fin, fecha_solo_mes }) || fecha) >= today
}

export const isEventExpiredBefore = (
  {
    fecha,
    fecha_fin,
    fecha_solo_mes,
  }: {
    fecha?: string | null
    fecha_fin?: string | null
    fecha_solo_mes?: boolean | null
  },
  limitDate: string
) => {
  if (!fecha) return false

  if (fecha_solo_mes) {
    const monthRange = buildMonthEventRange(fecha.slice(0, 7))
    return Boolean(monthRange && monthRange.endDate < limitDate)
  }

  const endDate = fecha_fin || fecha
  return endDate < limitDate
}
