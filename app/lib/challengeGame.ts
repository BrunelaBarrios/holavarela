type SupabaseErrorLike = {
  code?: string
  message?: string
}

export type ChallengeKey = "sopa" | "memoria" | "pelicula" | "puzzle" | "laberinto"
export type ChallengeMemoryMode = "palabras" | "logos"
export type ChallengeMemoryLogoProfile = `comercio:${number}` | `servicio:${number}`

export type ChallengeConfig = {
  activo: boolean
  juegosActivos: ChallengeKey[]
  sopaPalabras: string[]
  memoriaModo: ChallengeMemoryMode
  memoriaLogos: ChallengeMemoryLogoProfile[]
  puzzleImagenes: string[]
  slug?: string
  titulo?: string
}

type ChallengeAssignment = {
  wordSearchVariantIndex: number
  memoryVariantIndex: number
  movieChallengeIndex: number
}

export const CHALLENGE_GAME_OPTIONS: Array<{
  key: ChallengeKey
  label: string
  description: string
}> = [
  {
    key: "sopa",
    label: "Sopa de letras",
    description: "Encuentra palabras de la plataforma antes de que termine el tiempo.",
  },
  {
    key: "memoria",
    label: "Juego de memoria",
    description: "Une pares relacionados a comercios, cursos, eventos y servicios.",
  },
  {
    key: "pelicula",
    label: "Adivina la pelicula",
    description: "Resuelve titulos con pistas cortas y errores limitados.",
  },
  {
    key: "puzzle",
    label: "Puzzle",
    description: "Ordena las piezas antes de que termine el tiempo.",
  },
  {
    key: "laberinto",
    label: "Laberinto",
    description: "Llega a la meta evitando paredes y sumando por velocidad.",
  },
]

export const DEFAULT_CHALLENGE_CONFIG: ChallengeConfig = {
  activo: true,
  juegosActivos: CHALLENGE_GAME_OPTIONS.map((game) => game.key),
  sopaPalabras: [],
  memoriaModo: "palabras",
  memoriaLogos: [],
  puzzleImagenes: [],
}

const CHALLENGE_BROWSER_KEY = "hola-varela-challenges-browser"
const CHALLENGE_ASSIGNMENT_KEY = "hola-varela-challenges-assignment"

function createBrowserKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `challenge-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

function getRandomIndex(length: number) {
  return Math.floor(Math.random() * Math.max(length, 1))
}

function createRandomChallengeAssignment(params: {
  wordSearchVariantsCount: number
  memoryVariantsCount: number
  movieChallengesCount: number
}) {
  return {
    wordSearchVariantIndex: getRandomIndex(params.wordSearchVariantsCount),
    memoryVariantIndex: getRandomIndex(params.memoryVariantsCount),
    movieChallengeIndex: getRandomIndex(params.movieChallengesCount),
  } satisfies ChallengeAssignment
}

function isSameChallengeAssignment(
  first: ChallengeAssignment,
  second: ChallengeAssignment
) {
  return (
    first.wordSearchVariantIndex === second.wordSearchVariantIndex &&
    first.memoryVariantIndex === second.memoryVariantIndex &&
    first.movieChallengeIndex === second.movieChallengeIndex
  )
}

function readStoredChallengeAssignment() {
  if (typeof window === "undefined") return null

  const storedValue = window.localStorage.getItem(CHALLENGE_ASSIGNMENT_KEY)
  if (!storedValue) return null

  try {
    const parsed = JSON.parse(storedValue) as Partial<ChallengeAssignment>
    if (
      Number.isInteger(parsed.wordSearchVariantIndex) &&
      Number.isInteger(parsed.memoryVariantIndex) &&
      Number.isInteger(parsed.movieChallengeIndex)
    ) {
      return {
        wordSearchVariantIndex: Number(parsed.wordSearchVariantIndex),
        memoryVariantIndex: Number(parsed.memoryVariantIndex),
        movieChallengeIndex: Number(parsed.movieChallengeIndex),
      } satisfies ChallengeAssignment
    }
  } catch {
    window.localStorage.removeItem(CHALLENGE_ASSIGNMENT_KEY)
  }

  return null
}

export function isMissingChallengesSchemaError(error: SupabaseErrorLike | null | undefined) {
  const normalizedMessage = error?.message?.toLowerCase() || ""

  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    normalizedMessage.includes("desafio_participaciones") ||
    normalizedMessage.includes("desafio_config") ||
    normalizedMessage.includes("desafio_sorteos") ||
    normalizedMessage.includes("desafio_sorteo_ganadores") ||
    normalizedMessage.includes("could not find the table")
  )
}

export function normalizeChallengeKeys(value: unknown): ChallengeKey[] {
  if (!Array.isArray(value)) return DEFAULT_CHALLENGE_CONFIG.juegosActivos

  const allowedKeys = new Set(CHALLENGE_GAME_OPTIONS.map((game) => game.key))
  const normalized = value.filter((item): item is ChallengeKey => {
    return typeof item === "string" && allowedKeys.has(item as ChallengeKey)
  })

  return normalized.length > 0 ? Array.from(new Set(normalized)) : []
}

export function normalizeMemoryMode(value: unknown): ChallengeMemoryMode {
  return value === "logos" ? "logos" : "palabras"
}

export function normalizeMemoryLogoProfiles(value: unknown): ChallengeMemoryLogoProfile[] {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,;]+/)
      : []

  const normalized = rawItems
    .map((item) => String(item).trim())
    .filter((item): item is ChallengeMemoryLogoProfile => {
      return /^(comercio|servicio):\d+$/.test(item)
    })

  return Array.from(new Set(normalized)).slice(0, 80)
}

export function normalizeWordSearchWords(value: unknown): string[] {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,;]+/)
      : []

  const normalized = rawItems
    .map((item) =>
      String(item)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-ZÑ]/g, "")
        .slice(0, 10)
    )
    .filter((word) => word.length >= 2)

  return Array.from(new Set(normalized)).slice(0, 40)
}

export function normalizePuzzleImages(value: unknown): string[] {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,;]+/)
      : []

  const normalized = rawItems
    .map((item) => String(item).trim())
    .filter((item) => {
      return (
        item.startsWith("/") ||
        item.startsWith("https://") ||
        item.startsWith("http://") ||
        item.startsWith("data:image/")
      )
    })

  return Array.from(new Set(normalized)).slice(0, 12)
}

export function getChallengeBrowserKey() {
  if (typeof window === "undefined") return ""

  const existingKey = window.localStorage.getItem(CHALLENGE_BROWSER_KEY)
  if (existingKey) return existingKey

  const nextKey = createBrowserKey()
  window.localStorage.setItem(CHALLENGE_BROWSER_KEY, nextKey)
  return nextKey
}

export function getChallengeAssignment(params: {
  wordSearchVariantsCount: number
  memoryVariantsCount: number
  movieChallengesCount: number
}) {
  if (typeof window === "undefined") {
    return {
      wordSearchVariantIndex: 0,
      memoryVariantIndex: 0,
      movieChallengeIndex: 0,
    } satisfies ChallengeAssignment
  }

  const storedAssignment = readStoredChallengeAssignment()
  if (storedAssignment) {
    return {
      wordSearchVariantIndex: storedAssignment.wordSearchVariantIndex % params.wordSearchVariantsCount,
      memoryVariantIndex: storedAssignment.memoryVariantIndex % params.memoryVariantsCount,
      movieChallengeIndex: storedAssignment.movieChallengeIndex % params.movieChallengesCount,
    } satisfies ChallengeAssignment
  }

  const nextAssignment = createRandomChallengeAssignment(params)

  window.localStorage.setItem(CHALLENGE_ASSIGNMENT_KEY, JSON.stringify(nextAssignment))
  return nextAssignment
}

export function resetChallengeAssignment(params: {
  wordSearchVariantsCount: number
  memoryVariantsCount: number
  movieChallengesCount: number
}) {
  if (typeof window === "undefined") return

  const previousAssignment = readStoredChallengeAssignment()
  const canChangeAssignment =
    params.wordSearchVariantsCount > 1 ||
    params.memoryVariantsCount > 1 ||
    params.movieChallengesCount > 1
  let nextAssignment = createRandomChallengeAssignment(params)

  if (previousAssignment && canChangeAssignment) {
    for (let attempt = 0; attempt < 8 && isSameChallengeAssignment(nextAssignment, previousAssignment); attempt += 1) {
      nextAssignment = createRandomChallengeAssignment(params)
    }
  }

  window.localStorage.setItem(CHALLENGE_ASSIGNMENT_KEY, JSON.stringify(nextAssignment))
}
