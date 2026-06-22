import { GoalGameExperience } from "../components/GoalGameExperience"
import {
  DEFAULT_GOAL_GAME_CONFIG,
  isMissingGoalGameSchemaError,
  type GoalGameConfig,
  type GoalGameRankingEntry,
} from "../lib/goalGame"
import { supabaseServer } from "../lib/supabaseServer"

export const revalidate = 60
export const dynamic = "force-dynamic"

async function getGoalGameData(): Promise<{
  config: GoalGameConfig
  ranking: GoalGameRankingEntry[]
}> {
  try {
    const [{ data: configData, error: configError }, { data: rankingData, error: rankingError }] =
      await Promise.all([
        supabaseServer
          .from("juego_gol_config")
          .select("activo, titulo, texto_banner, mostrar_ranking_home")
          .eq("id", 1)
          .maybeSingle(),
        supabaseServer
          .from("juego_gol_participaciones")
          .select("id, nombre, puntaje, created_at")
          .order("puntaje", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(20),
      ])

    if (configError || rankingError) {
      if (
        isMissingGoalGameSchemaError(configError) ||
        isMissingGoalGameSchemaError(rankingError)
      ) {
        return {
          config: DEFAULT_GOAL_GAME_CONFIG,
          ranking: [],
        }
      }

      return {
        config: DEFAULT_GOAL_GAME_CONFIG,
        ranking: [],
      }
    }

    return {
      config: {
        activo: configData?.activo === true,
        titulo: configData?.titulo || DEFAULT_GOAL_GAME_CONFIG.titulo,
        textoBanner: configData?.texto_banner || DEFAULT_GOAL_GAME_CONFIG.textoBanner,
        mostrarRankingHome: configData?.mostrar_ranking_home === true,
      },
      ranking: (rankingData || []).map((entry) => ({
        id: Number(entry.id),
        nombre: entry.nombre || "Participante",
        puntaje: Number(entry.puntaje || 0),
        createdAt: entry.created_at || null,
      })),
    }
  } catch (error) {
    if (isMissingGoalGameSchemaError(error as { code?: string; message?: string })) {
      return {
        config: DEFAULT_GOAL_GAME_CONFIG,
        ranking: [],
      }
    }

    throw error
  }
}

export default async function JuegoGolPage() {
  const { config, ranking } = await getGoalGameData()

  return <GoalGameExperience config={config} initialRanking={ranking} />
}
