type SupabaseErrorLike = {
  code?: string
  message?: string
}

export type ChallengeKey = "sopa" | "memoria" | "pelicula" | "puzzle" | "laberinto"

export type ChallengeConfig = {
  activo: boolean
  juegosActivos: ChallengeKey[]
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

  const storedValue = window.localStorage.getItem(CHALLENGE_ASSIGNMENT_KEY)
  if (storedValue) {
    try {
      const parsed = JSON.parse(storedValue) as Partial<ChallengeAssignment>
      if (
        Number.isInteger(parsed.wordSearchVariantIndex) &&
        Number.isInteger(parsed.memoryVariantIndex) &&
        Number.isInteger(parsed.movieChallengeIndex)
      ) {
        return {
          wordSearchVariantIndex: Number(parsed.wordSearchVariantIndex) % params.wordSearchVariantsCount,
          memoryVariantIndex: Number(parsed.memoryVariantIndex) % params.memoryVariantsCount,
          movieChallengeIndex: Number(parsed.movieChallengeIndex) % params.movieChallengesCount,
        } satisfies ChallengeAssignment
      }
    } catch {
      window.localStorage.removeItem(CHALLENGE_ASSIGNMENT_KEY)
    }
  }

  const nextAssignment = {
    wordSearchVariantIndex: getRandomIndex(params.wordSearchVariantsCount),
    memoryVariantIndex: getRandomIndex(params.memoryVariantsCount),
    movieChallengeIndex: getRandomIndex(params.movieChallengesCount),
  } satisfies ChallengeAssignment

  window.localStorage.setItem(CHALLENGE_ASSIGNMENT_KEY, JSON.stringify(nextAssignment))
  return nextAssignment
}

export function resetChallengeAssignment(params: {
  wordSearchVariantsCount: number
  memoryVariantsCount: number
  movieChallengesCount: number
}) {
  if (typeof window === "undefined") return

  const nextAssignment = {
    wordSearchVariantIndex: getRandomIndex(params.wordSearchVariantsCount),
    memoryVariantIndex: getRandomIndex(params.memoryVariantsCount),
    movieChallengeIndex: getRandomIndex(params.movieChallengesCount),
  } satisfies ChallengeAssignment

  window.localStorage.setItem(CHALLENGE_ASSIGNMENT_KEY, JSON.stringify(nextAssignment))
}
