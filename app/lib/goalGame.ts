export type GoalGameConfig = {
  activo: boolean
  titulo: string
  textoBanner: string
  mostrarRankingHome: boolean
}

export type GoalGameRankingEntry = {
  id: number
  nombre: string
  puntaje: number
  createdAt: string | null
}

export const DEFAULT_GOAL_GAME_CONFIG: GoalGameConfig = {
  activo: false,
  titulo: "Desafio del Gol",
  textoBanner: "Jugá al Desafío del Gol",
  mostrarRankingHome: false,
}

export function isMissingGoalGameSchemaError(
  error: { code?: string; message?: string } | null | undefined
) {
  const normalizedMessage = error?.message?.toLowerCase() || ""

  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    normalizedMessage.includes("juego_gol_config") ||
    normalizedMessage.includes("juego_gol_participaciones") ||
    normalizedMessage.includes("could not find the table")
  )
}

export function normalizeGoalPlayerName(value: unknown) {
  if (typeof value !== "string") return ""

  return value.replace(/\s+/g, " ").trim().slice(0, 30)
}

export function normalizeGoalGameTitle(value: unknown) {
  if (typeof value !== "string") return DEFAULT_GOAL_GAME_CONFIG.titulo

  const normalized = value.replace(/\s+/g, " ").trim().slice(0, 80)
  return normalized || DEFAULT_GOAL_GAME_CONFIG.titulo
}

export function normalizeGoalGameBanner(value: unknown) {
  if (typeof value !== "string") return DEFAULT_GOAL_GAME_CONFIG.textoBanner

  const normalized = value.replace(/\s+/g, " ").trim().slice(0, 90)
  return normalized || DEFAULT_GOAL_GAME_CONFIG.textoBanner
}
