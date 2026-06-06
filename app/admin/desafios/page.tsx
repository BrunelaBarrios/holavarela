'use client'

import { useEffect, useMemo, useState } from "react"
import { Archive, CheckCircle2, Copy, Download, ExternalLink, Plus, Power, QrCode, RotateCcw, Save, Search, Shuffle, Trash2, Trophy, X } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"
import {
  type ChallengeMemoryMode,
  type ChallengeKey,
  CHALLENGE_GAME_OPTIONS,
  DEFAULT_CHALLENGE_CONFIG,
  isMissingChallengesSchemaError,
  normalizeChallengeKeys,
  normalizeMemoryLogoProfiles,
  normalizeMemoryMode,
  normalizePuzzleImages,
  normalizeWordSearchWords,
} from "../../lib/challengeGame"
import { printCouponsPdf } from "../../lib/couponPrint"

type ChallengeEntry = {
  id: number
  nombre: string
  telefono: string
  puntajeTotal: number
  puntosSopa: number
  puntosMemoria: number
  puntosPelicula: number
  puntosPuzzle: number
  puntosLaberinto: number
  sopaNombre: string | null
  memoriaNombre: string | null
  peliculaNombre: string | null
  puzzleNombre: string | null
  laberintoNombre: string | null
  createdAt: string | null
}

type ChallengeWinner = {
  id: number
  sorteoId: number
  participacionId: number
  entregado: boolean
  entregadoAt: string | null
  createdAt: string | null
}

type ChallengeDraw = {
  id: number
  cantidadGanadores: number
  createdAt: string | null
}

type LoadedChallengeConfig = {
  activo?: boolean
  juegosActivos?: unknown
  sopaPalabras?: unknown
  memoriaModo?: unknown
  memoriaLogos?: unknown
  puzzleImagenes?: unknown
  slug?: string
  titulo?: string
}

type ChallengeEdition = {
  slug: string
  titulo: string
  activo: boolean
  juegosActivos: ChallengeKey[]
  sopaPalabras: string[]
  memoriaModo: ChallengeMemoryMode
  memoriaLogos: ReturnType<typeof normalizeMemoryLogoProfiles>
  puzzleImagenes: string[]
  createdAt: string | null
  updatedAt: string | null
}

const PUBLIC_SITE_URL = "https://www.holavarela.uy"

type MemoryLogoProfileOption = {
  key: ReturnType<typeof normalizeMemoryLogoProfiles>[number]
  label: string
  typeLabel: "Comercio" | "Servicio"
  imageUrl: string
}

function buildChallengePublicUrl(slug?: string) {
  return slug ? `${PUBLIC_SITE_URL}/juga-y-gana/${slug}` : `${PUBLIC_SITE_URL}/juga-y-gana`
}

function buildChallengeQrUrl(slug?: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=1200x1200&data=${encodeURIComponent(
    buildChallengePublicUrl(slug)
  )}`
}

function shuffleEntries<T>(items: T[]) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

export default function AdminDesafiosPage() {
  const [loading, setLoading] = useState(true)
  const [schemaReady, setSchemaReady] = useState(true)
  const [schemaMessage, setSchemaMessage] = useState("")
  const [configLoading, setConfigLoading] = useState(true)
  const [configSchemaReady, setConfigSchemaReady] = useState(true)
  const [challengeActive, setChallengeActive] = useState(DEFAULT_CHALLENGE_CONFIG.activo)
  const [activeGames, setActiveGames] = useState<ChallengeKey[]>(
    DEFAULT_CHALLENGE_CONFIG.juegosActivos
  )
  const [soupWordsInput, setSoupWordsInput] = useState("")
  const [memoryMode, setMemoryMode] = useState<ChallengeMemoryMode>(
    DEFAULT_CHALLENGE_CONFIG.memoriaModo
  )
  const [memoryLogoProfiles, setMemoryLogoProfiles] = useState<
    ReturnType<typeof normalizeMemoryLogoProfiles>
  >(DEFAULT_CHALLENGE_CONFIG.memoriaLogos)
  const [availableMemoryLogoProfiles, setAvailableMemoryLogoProfiles] = useState<
    MemoryLogoProfileOption[]
  >([])
  const [challengeSlug, setChallengeSlug] = useState("")
  const [currentChallengeSlug, setCurrentChallengeSlug] = useState("")
  const [challengeTitle, setChallengeTitle] = useState("")
  const [editions, setEditions] = useState<ChallengeEdition[]>([])
  const [activatingEdition, setActivatingEdition] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [creatingChallenge, setCreatingChallenge] = useState(false)
  const [newChallengeTitle, setNewChallengeTitle] = useState("")
  const [newChallengeActive, setNewChallengeActive] = useState(true)
  const [newChallengeGames, setNewChallengeGames] = useState<ChallengeKey[]>(
    DEFAULT_CHALLENGE_CONFIG.juegosActivos
  )
  const [newChallengeSoupWords, setNewChallengeSoupWords] = useState("")
  const [newChallengeMemoryMode, setNewChallengeMemoryMode] = useState<ChallengeMemoryMode>(
    DEFAULT_CHALLENGE_CONFIG.memoriaModo
  )
  const [newChallengeMemoryLogoProfiles, setNewChallengeMemoryLogoProfiles] = useState<
    ReturnType<typeof normalizeMemoryLogoProfiles>
  >(DEFAULT_CHALLENGE_CONFIG.memoriaLogos)
  const [puzzleImagesInput, setPuzzleImagesInput] = useState("")
  const [newChallengePuzzleImages, setNewChallengePuzzleImages] = useState("")
  const [configMessage, setConfigMessage] = useState("")
  const [entries, setEntries] = useState<ChallengeEntry[]>([])
  const [draws, setDraws] = useState<ChallengeDraw[]>([])
  const [winners, setWinners] = useState<ChallengeWinner[]>([])
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "score_desc">("recent")
  const [winnersCount, setWinnersCount] = useState("1")
  const [drawing, setDrawing] = useState(false)
  const [resettingDraws, setResettingDraws] = useState(false)
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [shareMessage, setShareMessage] = useState("")
  const [entryToDelete, setEntryToDelete] = useState<ChallengeEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState(false)
  const [showResetDrawsConfirm, setShowResetDrawsConfirm] = useState(false)
  const [showCreateChallengeConfirm, setShowCreateChallengeConfirm] = useState(false)

  const challengePublicUrl = buildChallengePublicUrl(challengeSlug)
  const challengeQrUrl = buildChallengeQrUrl(challengeSlug)
  const selectedEdition = editions.find((edition) => edition.slug === challengeSlug) || null
  const isViewingCurrentEdition = !currentChallengeSlug || challengeSlug === currentChallengeSlug
  const normalizedSoupWords = normalizeWordSearchWords(soupWordsInput)
  const normalizedPuzzleImages = normalizePuzzleImages(puzzleImagesInput)
  const selectedMemoryLogoCount = memoryLogoProfiles.length

  const openCreateChallengePanel = () => {
    setNewChallengeTitle("")
    setNewChallengeActive(true)
    setNewChallengeGames(activeGames.length > 0 ? activeGames : DEFAULT_CHALLENGE_CONFIG.juegosActivos)
    setNewChallengeSoupWords(soupWordsInput)
    setNewChallengeMemoryMode(memoryMode)
    setNewChallengeMemoryLogoProfiles(memoryLogoProfiles)
    setNewChallengePuzzleImages(puzzleImagesInput)
    setConfigMessage("")
    setErrorMessage("")
    setMessage("")
    setShareMessage("")
    setShowCreateChallengeConfirm(true)
  }

  const loadConfig = async () => {
    setConfigLoading(true)
    setConfigMessage("")

    try {
      const response = await fetch("/api/admin/desafios/config")
      const result = (await response.json()) as {
        config?: LoadedChallengeConfig
        editions?: Array<{
          slug?: string
          titulo?: string
          activo?: boolean
          juegosActivos?: unknown
          sopaPalabras?: unknown
          memoriaModo?: unknown
          memoriaLogos?: unknown
          puzzleImagenes?: unknown
          createdAt?: string | null
          updatedAt?: string | null
        }>
        schemaReady?: boolean
        warning?: string
        error?: string
      }

      if (!response.ok) {
        setConfigMessage(result.error || "No se pudo cargar la configuracion del desafio.")
        return null
      }

      setConfigSchemaReady(result.schemaReady !== false)
      if (result.warning) {
        setConfigMessage(result.warning)
      }
      setChallengeActive(result.config?.activo !== false)
      setActiveGames(normalizeChallengeKeys(result.config?.juegosActivos))
      setSoupWordsInput(normalizeWordSearchWords(result.config?.sopaPalabras).join("\n"))
      setMemoryMode(normalizeMemoryMode(result.config?.memoriaModo))
      setMemoryLogoProfiles(normalizeMemoryLogoProfiles(result.config?.memoriaLogos))
      setPuzzleImagesInput(normalizePuzzleImages(result.config?.puzzleImagenes).join("\n"))
      setChallengeSlug(result.config?.slug || "")
      setCurrentChallengeSlug(result.config?.slug || "")
      setChallengeTitle(result.config?.titulo || "")
      setEditions(
        (result.editions || [])
          .filter((edition): edition is Required<Pick<ChallengeEdition, "slug" | "titulo">> & Partial<ChallengeEdition> =>
            typeof edition.slug === "string" && edition.slug.length > 0
          )
          .map((edition) => ({
            slug: edition.slug,
            titulo: edition.titulo || edition.slug,
            activo: edition.activo !== false,
            juegosActivos: normalizeChallengeKeys(edition.juegosActivos),
            sopaPalabras: normalizeWordSearchWords(edition.sopaPalabras),
            memoriaModo: normalizeMemoryMode(edition.memoriaModo),
            memoriaLogos: normalizeMemoryLogoProfiles(edition.memoriaLogos),
            puzzleImagenes: normalizePuzzleImages(edition.puzzleImagenes),
            createdAt: edition.createdAt || null,
            updatedAt: edition.updatedAt || null,
          }))
      )
      return result.config || null
    } catch {
      setConfigMessage("No se pudo cargar la configuracion del desafio.")
      return null
    } finally {
      setConfigLoading(false)
    }
  }

  const loadMemoryLogoProfiles = async () => {
    const comerciosResult = await supabase
      .from("comercios")
      .select("id, nombre, imagen, imagen_url")
      .or("estado.is.null,estado.eq.activo")
      .order("nombre", { ascending: true })
    const comerciosFallback =
      comerciosResult.error?.code === "42703" ||
      comerciosResult.error?.message?.includes("imagen_url")
        ? await supabase
            .from("comercios")
            .select("id, nombre, imagen")
            .or("estado.is.null,estado.eq.activo")
            .order("nombre", { ascending: true })
        : comerciosResult
    const serviciosResult = await supabase
      .from("servicios")
      .select("id, nombre, imagen")
      .or("estado.is.null,estado.eq.activo")
      .order("nombre", { ascending: true })

    if (comerciosFallback.error || serviciosResult.error) {
      setConfigMessage(
        comerciosFallback.error?.message ||
          serviciosResult.error?.message ||
          "No se pudieron cargar comercios y servicios para la memoria."
      )
    }

    const comercioOptions = ((comerciosFallback.data || []) as unknown as Array<Record<string, unknown>>)
      .map((item) => ({
        key: `comercio:${Number(item.id)}` as const,
        label: String(item.nombre || "Comercio"),
        typeLabel: "Comercio" as const,
        imageUrl: String(item.imagen_url || item.imagen || ""),
      }))
      .filter((item) => item.imageUrl && Number.isFinite(Number(item.key.split(":")[1])))

    const servicioOptions = ((serviciosResult.data || []) as unknown as Array<Record<string, unknown>>)
      .map((item) => ({
        key: `servicio:${Number(item.id)}` as const,
        label: String(item.nombre || "Servicio"),
        typeLabel: "Servicio" as const,
        imageUrl: String(item.imagen || ""),
      }))
      .filter((item) => item.imageUrl && Number.isFinite(Number(item.key.split(":")[1])))

    setAvailableMemoryLogoProfiles([...comercioOptions, ...servicioOptions])
  }

  const loadData = async (activeSlug = challengeSlug) => {
    let entriesQuery = supabase
      .from("desafio_participaciones")
      .select(
        "id, nombre, telefono, puntaje_total, puntos_sopa, puntos_memoria, puntos_pelicula, puntos_puzzle, puntos_laberinto, sopa_nombre, memoria_nombre, pelicula_nombre, puzzle_nombre, laberinto_nombre, created_at"
      )
      .order("created_at", { ascending: false })
    let drawsQuery = supabase
      .from("desafio_sorteos")
      .select("id, cantidad_ganadores, created_at")
      .order("created_at", { ascending: false })

    if (activeSlug) {
      entriesQuery = entriesQuery.eq("desafio_slug", activeSlug)
      drawsQuery = drawsQuery.eq("desafio_slug", activeSlug)
    }

    const [
      { data: entriesRows, error: entriesError },
      { data: drawsRows, error: drawsError },
    ] = await Promise.all([
      entriesQuery,
      drawsQuery,
    ])

    const drawIds = ((drawsRows || []) as unknown as Array<Record<string, unknown>>).map((draw) =>
      Number(draw.id)
    )
    const { data: winnersRows, error: winnersError } =
      drawIds.length > 0
        ? await supabase
            .from("desafio_sorteo_ganadores")
            .select("id, sorteo_id, participacion_id, entregado, entregado_at, created_at")
            .in("sorteo_id", drawIds)
            .order("created_at", { ascending: false })
        : { data: [], error: null }

    const schemaError = entriesError || drawsError || winnersError
    if (schemaError) {
      if (isMissingChallengesSchemaError(schemaError)) {
        setSchemaReady(false)
        setSchemaMessage(schemaError.message || "Falta actualizar las tablas de desafios.")
      } else {
        setErrorMessage(`No se pudieron cargar los desafios: ${schemaError.message}`)
      }
      setLoading(false)
      return
    }

    setSchemaReady(true)
    setSchemaMessage("")
    setEntries(
      ((entriesRows || []) as unknown as Array<Record<string, unknown>>).map((entry) => ({
        id: Number(entry.id),
        nombre: String(entry.nombre || ""),
        telefono: String(entry.telefono || ""),
        puntajeTotal: Number(entry.puntaje_total || 0),
        puntosSopa: Number(entry.puntos_sopa || 0),
        puntosMemoria: Number(entry.puntos_memoria || 0),
        puntosPelicula: Number(entry.puntos_pelicula || 0),
        puntosPuzzle: Number(entry.puntos_puzzle || 0),
        puntosLaberinto: Number(entry.puntos_laberinto || 0),
        sopaNombre: entry.sopa_nombre ? String(entry.sopa_nombre) : null,
        memoriaNombre: entry.memoria_nombre ? String(entry.memoria_nombre) : null,
        peliculaNombre: entry.pelicula_nombre ? String(entry.pelicula_nombre) : null,
        puzzleNombre: entry.puzzle_nombre ? String(entry.puzzle_nombre) : null,
        laberintoNombre: entry.laberinto_nombre ? String(entry.laberinto_nombre) : null,
        createdAt: entry.created_at ? String(entry.created_at) : null,
      }))
    )
    setDraws(
      ((drawsRows || []) as unknown as Array<Record<string, unknown>>).map((draw) => ({
        id: Number(draw.id),
        cantidadGanadores: Number(draw.cantidad_ganadores || 0),
        createdAt: draw.created_at ? String(draw.created_at) : null,
      }))
    )
    setWinners(
      ((winnersRows || []) as unknown as Array<Record<string, unknown>>).map((winner) => ({
        id: Number(winner.id),
        sorteoId: Number(winner.sorteo_id),
        participacionId: Number(winner.participacion_id),
        entregado: winner.entregado === true,
        entregadoAt: winner.entregado_at ? String(winner.entregado_at) : null,
        createdAt: winner.created_at ? String(winner.created_at) : null,
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const [loadedConfig] = await Promise.all([
          loadConfig(),
          loadMemoryLogoProfiles(),
        ])
        await loadData(loadedConfig?.slug || "")
      })()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const toggleActiveGame = (gameKey: ChallengeKey) => {
    setActiveGames((current) =>
      current.includes(gameKey)
        ? current.filter((key) => key !== gameKey)
        : [...current, gameKey]
    )
  }

  const toggleNewChallengeGame = (gameKey: ChallengeKey) => {
    setNewChallengeGames((current) =>
      current.includes(gameKey)
        ? current.filter((key) => key !== gameKey)
        : [...current, gameKey]
    )
  }

  const toggleMemoryLogoProfile = (profileKey: MemoryLogoProfileOption["key"]) => {
    setMemoryLogoProfiles((current) =>
      current.includes(profileKey)
        ? current.filter((key) => key !== profileKey)
        : normalizeMemoryLogoProfiles([...current, profileKey])
    )
  }

  const toggleNewChallengeMemoryLogoProfile = (profileKey: MemoryLogoProfileOption["key"]) => {
    setNewChallengeMemoryLogoProfiles((current) =>
      current.includes(profileKey)
        ? current.filter((key) => key !== profileKey)
        : normalizeMemoryLogoProfiles([...current, profileKey])
    )
  }

  const handleSaveConfig = async () => {
    if (challengeActive && activeGames.length === 0) {
      setConfigMessage("Activa al menos un juego para publicar el desafio.")
      return
    }

    setSavingConfig(true)
    setConfigMessage("")

    try {
      const response = await fetch("/api/admin/desafios/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activo: challengeActive,
          juegosActivos: activeGames,
          sopaPalabras: soupWordsInput,
          memoriaModo: memoryMode,
          memoriaLogos: memoryLogoProfiles,
          puzzleImagenes: puzzleImagesInput,
        }),
      })
      const result = (await response.json()) as {
        config?: LoadedChallengeConfig
        error?: string
      }

      if (!response.ok) {
        setConfigMessage(result.error || "No se pudo guardar la configuracion.")
        return
      }

      setChallengeActive(result.config?.activo === true)
      setActiveGames(normalizeChallengeKeys(result.config?.juegosActivos))
      setSoupWordsInput(normalizeWordSearchWords(result.config?.sopaPalabras).join("\n"))
      setMemoryMode(normalizeMemoryMode(result.config?.memoriaModo))
      setMemoryLogoProfiles(normalizeMemoryLogoProfiles(result.config?.memoriaLogos))
      setPuzzleImagesInput(normalizePuzzleImages(result.config?.puzzleImagenes).join("\n"))
      setChallengeSlug(result.config?.slug || "")
      setCurrentChallengeSlug(result.config?.slug || "")
      setChallengeTitle(result.config?.titulo || "")
      setConfigSchemaReady(true)
      setConfigMessage(
        result.config?.activo
          ? "Desafio activo con los juegos seleccionados."
          : "Desafio pausado."
      )
    } catch {
      setConfigMessage("No se pudo guardar la configuracion.")
    } finally {
      setSavingConfig(false)
    }
  }

  const handleCreateChallenge = async () => {
    if (newChallengeActive && newChallengeGames.length === 0) {
      setConfigMessage("Activa al menos un juego antes de crear un nuevo desafio.")
      return
    }

    setCreatingChallenge(true)
    setConfigMessage("")
    setErrorMessage("")
    setMessage("")
    setShareMessage("")

    try {
      const response = await fetch("/api/admin/desafios/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          activo: newChallengeActive,
          juegosActivos: newChallengeGames,
          sopaPalabras: newChallengeSoupWords,
          memoriaModo: newChallengeMemoryMode,
          memoriaLogos: newChallengeMemoryLogoProfiles,
          puzzleImagenes: newChallengePuzzleImages,
          titulo: newChallengeTitle,
        }),
      })
      const result = (await response.json()) as {
        config?: LoadedChallengeConfig
        error?: string
      }

      if (!response.ok) {
        setConfigMessage(result.error || "No se pudo crear el nuevo desafio.")
        return
      }

      setChallengeActive(result.config?.activo === true)
      setActiveGames(normalizeChallengeKeys(result.config?.juegosActivos))
      setSoupWordsInput(normalizeWordSearchWords(result.config?.sopaPalabras).join("\n"))
      setMemoryMode(normalizeMemoryMode(result.config?.memoriaModo))
      setMemoryLogoProfiles(normalizeMemoryLogoProfiles(result.config?.memoriaLogos))
      setPuzzleImagesInput(normalizePuzzleImages(result.config?.puzzleImagenes).join("\n"))
      setChallengeSlug(result.config?.slug || "")
      setCurrentChallengeSlug(result.config?.slug || "")
      setChallengeTitle(result.config?.titulo || "")
      setEntries([])
      setDraws([])
      setWinners([])
      setShowCreateChallengeConfirm(false)
      setNewChallengeTitle("")
      setNewChallengeActive(true)
      setNewChallengeGames(DEFAULT_CHALLENGE_CONFIG.juegosActivos)
      setNewChallengeSoupWords("")
      setNewChallengeMemoryMode(DEFAULT_CHALLENGE_CONFIG.memoriaModo)
      setNewChallengeMemoryLogoProfiles(DEFAULT_CHALLENGE_CONFIG.memoriaLogos)
      setNewChallengePuzzleImages("")
      setConfigSchemaReady(true)
      setConfigMessage("Nuevo desafio creado. Ya tienes un link y QR nuevos.")
      await loadConfig()
      await loadData(result.config?.slug || "")
    } catch {
      setConfigMessage("No se pudo crear el nuevo desafio.")
    } finally {
      setCreatingChallenge(false)
    }
  }

  const handleSelectEdition = async (slug: string) => {
    const edition = editions.find((item) => item.slug === slug)
    if (!edition) return

    setChallengeSlug(edition.slug)
    setChallengeTitle(edition.titulo)
    setChallengeActive(edition.activo)
    setActiveGames(edition.juegosActivos)
    setSoupWordsInput(edition.sopaPalabras.join("\n"))
    setMemoryMode(edition.memoriaModo)
    setMemoryLogoProfiles(edition.memoriaLogos)
    setPuzzleImagesInput(edition.puzzleImagenes.join("\n"))
    setSearch("")
    setMessage("")
    setErrorMessage("")
    setShareMessage("")
    setLoading(true)
    await loadData(edition.slug)
  }

  const handleActivateEdition = async () => {
    if (!selectedEdition) return

    setActivatingEdition(true)
    setConfigMessage("")
    setErrorMessage("")
    setMessage("")

    try {
      const response = await fetch("/api/admin/desafios/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "activate",
          slug: selectedEdition.slug,
        }),
      })
      const result = (await response.json()) as {
        config?: LoadedChallengeConfig
        error?: string
      }

      if (!response.ok) {
        setConfigMessage(result.error || "No se pudo activar esta edicion.")
        return
      }

      setCurrentChallengeSlug(result.config?.slug || selectedEdition.slug)
      setChallengeSlug(result.config?.slug || selectedEdition.slug)
      setChallengeTitle(result.config?.titulo || selectedEdition.titulo)
      setChallengeActive(result.config?.activo === true)
      setActiveGames(normalizeChallengeKeys(result.config?.juegosActivos))
      setSoupWordsInput(normalizeWordSearchWords(result.config?.sopaPalabras).join("\n"))
      setMemoryMode(normalizeMemoryMode(result.config?.memoriaModo))
      setMemoryLogoProfiles(normalizeMemoryLogoProfiles(result.config?.memoriaLogos))
      setPuzzleImagesInput(normalizePuzzleImages(result.config?.puzzleImagenes).join("\n"))
      setConfigMessage("Edicion activada. El link y QR actuales apuntan a este desafio.")
      await loadConfig()
      await loadData(result.config?.slug || selectedEdition.slug)
    } catch {
      setConfigMessage("No se pudo activar esta edicion.")
    } finally {
      setActivatingEdition(false)
    }
  }

  const visibleEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const filteredEntries =
      !normalizedSearch
        ? entries
        : entries.filter((entry) =>
            `${entry.nombre} ${entry.telefono}`.toLowerCase().includes(normalizedSearch)
          )

    return [...filteredEntries].sort((left, right) => {
      if (sortBy === "score_desc") {
        if (right.puntajeTotal !== left.puntajeTotal) {
          return right.puntajeTotal - left.puntajeTotal
        }
      }

      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0
      return rightTime - leftTime
    })
  }, [entries, search, sortBy])

  const latestDraw = draws[0] || null
  const latestWinnerRows = useMemo(
    () => (latestDraw ? winners.filter((winner) => winner.sorteoId === latestDraw.id) : []),
    [latestDraw, winners]
  )

  const latestWinners = useMemo(() => {
    if (!latestDraw) return []

    return latestWinnerRows
      .map((winnerRow) => {
        const entry = entries.find((item) => item.id === winnerRow.participacionId)
        if (!entry) return null

        return {
          ...entry,
          winnerRowId: winnerRow.id,
          entregado: winnerRow.entregado,
          entregadoAt: winnerRow.entregadoAt,
        }
      })
      .filter(Boolean) as Array<
      ChallengeEntry & {
        winnerRowId: number
        entregado: boolean
        entregadoAt: string | null
      }
    >
  }, [entries, latestDraw, latestWinnerRows])

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(challengePublicUrl)
      setShareMessage("Link del juego copiado.")
    } catch {
      setShareMessage(`Copia manualmente este link: ${challengePublicUrl}`)
    }
  }

  const handleDownloadQr = () => {
    if (typeof window === "undefined") return

    const link = window.document.createElement("a")
    link.href = challengeQrUrl
    link.download = "qr-juga-y-gana-hola-varela.png"
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    link.click()
    setShareMessage("Se abrio el QR del juego para descargar.")
  }

  const handleExportCsv = () => {
    if (typeof window === "undefined" || visibleEntries.length === 0) return

    const escapeCsv = (value: string | number | null | undefined) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`

    const rows = [
      [
        "nombre",
        "telefono",
        "puntaje_total",
        "puntos_sopa",
        "puntos_memoria",
        "puntos_pelicula",
        "puntos_puzzle",
        "puntos_laberinto",
        "sopa",
        "memoria",
        "pelicula",
        "puzzle",
        "laberinto",
        "fecha",
      ],
      ...visibleEntries.map((entry) => [
        entry.nombre,
        entry.telefono,
        entry.puntajeTotal,
        entry.puntosSopa,
        entry.puntosMemoria,
        entry.puntosPelicula,
        entry.puntosPuzzle,
        entry.puntosLaberinto,
        entry.sopaNombre || "",
        entry.memoriaNombre || "",
        entry.peliculaNombre || "",
        entry.puzzleNombre || "",
        entry.laberintoNombre || "",
        entry.createdAt
          ? new Date(entry.createdAt).toLocaleString("sv-SE", { hour12: false })
          : "",
      ]),
    ]

    const csvContent = rows.map((row) => row.map(escapeCsv).join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = window.document.createElement("a")
    link.href = url
    link.download = "desafios-hola-varela.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const handlePrintCoupons = () => {
    if (visibleEntries.length === 0) return

    printCouponsPdf({
      documentTitle: "cupones-desafios-hola-varela",
      heading: "Cupones de participantes - Desafíos Hola Varela",
      subheading:
        "Listos para imprimir o guardar como PDF y recortar para el sorteo.",
      items: visibleEntries.map((entry) => ({
        title: entry.nombre,
        subtitle: entry.telefono,
        meta: `Puntaje total: ${entry.puntajeTotal}\nSopa: ${entry.puntosSopa} | Memoria: ${entry.puntosMemoria} | Pelicula: ${entry.puntosPelicula} | Puzzle: ${entry.puntosPuzzle} | Laberinto: ${entry.puntosLaberinto}`,
        footer: "Hola Varela - Desafíos",
      })),
    })
  }

  const handleDraw = async () => {
    const parsedCount = Number(winnersCount)
    if (!Number.isInteger(parsedCount) || parsedCount <= 0) {
      setErrorMessage("Ingresa una cantidad valida de ganadores.")
      return
    }

    if (visibleEntries.length === 0) {
      setErrorMessage("No hay participantes disponibles para sortear.")
      return
    }

    setDrawing(true)
    setErrorMessage("")
    setMessage("")
    setShareMessage("")

    const selectedWinners = shuffleEntries(visibleEntries).slice(
      0,
      Math.min(parsedCount, visibleEntries.length)
    )

    const { data: drawRow, error: drawError } = await supabase
      .from("desafio_sorteos")
      .insert([{ cantidad_ganadores: selectedWinners.length, desafio_slug: challengeSlug || null }])
      .select("id")
      .single()

    if (drawError) {
      setErrorMessage(`No se pudo guardar el sorteo: ${drawError.message}`)
      setDrawing(false)
      return
    }

    const { error: winnersError } = await supabase
      .from("desafio_sorteo_ganadores")
      .insert(
        selectedWinners.map((winner) => ({
          sorteo_id: Number(drawRow.id),
          participacion_id: winner.id,
        }))
      )

    if (winnersError) {
      setErrorMessage(`No se pudieron guardar los ganadores: ${winnersError.message}`)
      setDrawing(false)
      return
    }

    await logAdminActivity({
      action: "Sortear",
      section: "Desafíos",
      target: `Sorteo de ${selectedWinners.length} ganadores`,
      details: `Realizo un sorteo aleatorio desde los participantes de desafios (${challengeSlug || "sin slug"}).`,
    })

    await loadData(challengeSlug)
    setMessage(`Sorteo realizado con ${selectedWinners.length} ganador(es).`)
    setDrawing(false)
  }

  const handleResetDraws = async () => {
    setResettingDraws(true)
    setErrorMessage("")
    setMessage("")

    const drawIds = draws.map((draw) => draw.id)

    const { error: deleteWinnersError } =
      drawIds.length > 0
        ? await supabase.from("desafio_sorteo_ganadores").delete().in("sorteo_id", drawIds)
        : { error: null }

    if (deleteWinnersError) {
      setErrorMessage(`No se pudieron reiniciar los ganadores: ${deleteWinnersError.message}`)
      setResettingDraws(false)
      return
    }

    const { error: deleteDrawsError } = await supabase
      .from("desafio_sorteos")
      .delete()
      .eq("desafio_slug", challengeSlug || "")

    if (deleteDrawsError) {
      setErrorMessage(`No se pudieron reiniciar los sorteos: ${deleteDrawsError.message}`)
      setResettingDraws(false)
      return
    }

    setDraws([])
    setWinners([])
    setShowResetDrawsConfirm(false)
    setMessage("Se reiniciaron los sorteos y ganadores de desafios.")

    await logAdminActivity({
      action: "Reiniciar sorteos",
      section: "Desafíos",
      target: "Sorteos de desafios",
      details: "Elimino sorteos y ganadores para volver a empezar desde cero.",
    })

    setResettingDraws(false)
  }

  const handleToggleDelivered = async (
    winnerRowId: number,
    delivered: boolean,
    winnerName: string
  ) => {
    setErrorMessage("")
    setMessage("")

    const payload = delivered
      ? { entregado: false, entregado_at: null }
      : { entregado: true, entregado_at: new Date().toISOString() }

    const { error } = await supabase
      .from("desafio_sorteo_ganadores")
      .update(payload)
      .eq("id", winnerRowId)

    if (error) {
      setErrorMessage(`No se pudo actualizar la entrega del premio: ${error.message}`)
      return
    }

    setWinners((prev) =>
      prev.map((winner) =>
        winner.id === winnerRowId
          ? {
              ...winner,
              entregado: !delivered,
              entregadoAt: delivered ? null : payload.entregado_at,
            }
          : winner
      )
    )

    setMessage(
      delivered
        ? `Quitaste la marca de premio entregado para ${winnerName}.`
        : `Marcaste como premio entregado a ${winnerName}.`
    )

    await logAdminActivity({
      action: delivered ? "Quitar entrega" : "Marcar entrega",
      section: "Desafíos",
      target: winnerName,
      details: "Actualizo el estado de entrega del premio de un ganador de desafios.",
    })
  }

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return

    setDeletingEntry(true)
    setErrorMessage("")
    setMessage("")

    const { error: deleteWinnerLinksError } = await supabase
      .from("desafio_sorteo_ganadores")
      .delete()
      .eq("participacion_id", entryToDelete.id)

    if (deleteWinnerLinksError) {
      setErrorMessage(
        `No se pudieron quitar los sorteos del participante: ${deleteWinnerLinksError.message}`
      )
      setDeletingEntry(false)
      return
    }

    const { error: deleteEntryError } = await supabase
      .from("desafio_participaciones")
      .delete()
      .eq("id", entryToDelete.id)

    if (deleteEntryError) {
      setErrorMessage(`No se pudo eliminar el participante: ${deleteEntryError.message}`)
      setDeletingEntry(false)
      return
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== entryToDelete.id))
    setWinners((prev) => prev.filter((winner) => winner.participacionId !== entryToDelete.id))
    setEntryToDelete(null)
    setMessage(`Eliminaste a ${entryToDelete.nombre} de los desafios.`)

    await logAdminActivity({
      action: "Eliminar participante",
      section: "Desafíos",
      target: entryToDelete.nombre,
      details: "Elimino un participante de desafios desde admin.",
    })

    setDeletingEntry(false)
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        Cargando desafios...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(entryToDelete)}
        title="Eliminar participante"
        description={`Vas a eliminar a "${entryToDelete?.nombre || ""}" de los desafios. Tambien se quitaran sus registros de sorteos.`}
        confirmLabel="Eliminar"
        onCancel={() => setEntryToDelete(null)}
        onConfirm={() => {
          void handleDeleteEntry()
        }}
        isLoading={deletingEntry}
      />
      <AdminConfirmModal
        isOpen={showResetDrawsConfirm}
        title="Reiniciar sorteos"
        description="Vas a borrar los sorteos y ganadores registrados en desafios para volver a empezar desde cero. Los participantes quedan guardados."
        confirmLabel="Reiniciar"
        confirmVariant="primary"
        onCancel={() => setShowResetDrawsConfirm(false)}
        onConfirm={() => {
          void handleResetDraws()
        }}
        isLoading={resettingDraws}
      />

      <CreateChallengePanel
        isOpen={showCreateChallengeConfirm}
        title={newChallengeTitle}
        active={newChallengeActive}
        selectedGames={newChallengeGames}
        soupWords={newChallengeSoupWords}
        memoryMode={newChallengeMemoryMode}
        memoryLogoProfiles={newChallengeMemoryLogoProfiles}
        availableMemoryLogoProfiles={availableMemoryLogoProfiles}
        puzzleImages={newChallengePuzzleImages}
        isCreating={creatingChallenge}
        onTitleChange={setNewChallengeTitle}
        onActiveChange={setNewChallengeActive}
        onToggleGame={toggleNewChallengeGame}
        onSoupWordsChange={setNewChallengeSoupWords}
        onMemoryModeChange={setNewChallengeMemoryMode}
        onToggleMemoryLogoProfile={toggleNewChallengeMemoryLogoProfile}
        onPuzzleImagesChange={setNewChallengePuzzleImages}
        onCancel={() => setShowCreateChallengeConfirm(false)}
        onConfirm={() => {
          void handleCreateChallenge()
        }}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Desafíos</h1>
        <p className="mt-2 max-w-3xl text-slate-500">
          Crea ediciones, comparte links y QR unicos, revisa historiales y realiza sorteos por desafio.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="hidden">
            <span className="sr-only">Nombre del nuevo desafio</span>
            <input
              type="text"
              value={newChallengeTitle}
              onChange={(event) => setNewChallengeTitle(event.target.value)}
              placeholder="Nombre del nuevo desafio, por ejemplo Feria de junio"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500"
            />
          </label>
          <button
            type="button"
            onClick={openCreateChallengePanel}
            disabled={configLoading || savingConfig || creatingChallenge}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Nuevo desafio
          </button>
        </div>
      </div>

      {!schemaReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          {schemaMessage
            ? `Falta actualizar el esquema de desafios en Supabase: ${schemaMessage}`
            : "Primero corre el SQL actualizado en Supabase para crear las tablas de desafios."}
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Historial
                </div>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Ediciones de desafios
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Revisa participantes y sorteos de ediciones anteriores, o vuelve a activar una edicion existente.
                </p>
              </div>

              {!isViewingCurrentEdition ? (
                <button
                  type="button"
                  onClick={() => void handleActivateEdition()}
                  disabled={activatingEdition}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Power className="h-4 w-4" />
                  {activatingEdition ? "Activando..." : "Activar esta edicion"}
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-900">
                  Ver edicion
                </span>
                <select
                  value={challengeSlug}
                  onChange={(event) => void handleSelectEdition(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500"
                >
                  {editions.map((edition) => (
                    <option key={edition.slug} value={edition.slug}>
                      {edition.titulo}
                      {edition.slug === currentChallengeSlug ? " - activa" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Estado
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {isViewingCurrentEdition ? "Activa" : "Historial"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Participantes
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{entries.length}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Sorteos
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{draws.length}</div>
                </div>
              </div>
            </div>

            {selectedEdition ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <Archive className="h-4 w-4" />
                <span>
                  {selectedEdition.createdAt
                    ? `Creada el ${new Date(selectedEdition.createdAt).toLocaleString("es-UY", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}`
                    : "Edicion migrada desde el desafio actual"}
                </span>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Estado del desafio
                </div>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Activacion y juegos disponibles
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Define si la pagina publica esta disponible y que juegos forman parte del recorrido.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={challengeActive}
                onClick={() => setChallengeActive((current) => !current)}
                disabled={configLoading || savingConfig || !isViewingCurrentEdition}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  challengeActive
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Power className="h-4 w-4" />
                {challengeActive ? "Activo" : "Pausado"}
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {CHALLENGE_GAME_OPTIONS.map((game) => {
                const selected = activeGames.includes(game.key)

                return (
                  <label
                    key={game.key}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      selected
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleActiveGame(game.key)}
                        disabled={configLoading || savingConfig || !isViewingCurrentEdition}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{game.label}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-500">
                          {game.description}
                        </div>
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>

            {activeGames.includes("sopa") ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-950">Palabras de la sopa</div>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Escribe una palabra por linea. El juego arma rondas rotativas de hasta 4 palabras. Si lo dejas vacio, usa las rondas clasicas.
                </p>
                <textarea
                  value={soupWordsInput}
                  onChange={(event) => setSoupWordsInput(event.target.value)}
                  disabled={configLoading || savingConfig || !isViewingCurrentEdition}
                  rows={5}
                  placeholder="PANADERIA&#10;FARMACIA&#10;TALLER&#10;CAFETERIA"
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {normalizedSoupWords.length} palabra(s) validas
                </div>
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">Contenido de la memoria</div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Elegi si la memoria usa palabras o imagenes de comercios y servicios. Esta configuracion queda guardada aunque actives o desactives el juego.
                  </p>
                </div>
                {!activeGames.includes("memoria") ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                    Memoria desactivada
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { value: "palabras" as const, label: "Palabras", description: "Rondas clasicas con textos cortos." },
                  { value: "logos" as const, label: "Logos de comercios y servicios", description: "Cartas con imagenes de perfiles activos." },
                ].map((option) => {
                  const selected = memoryMode === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMemoryMode(option.value)}
                      disabled={configLoading || savingConfig || !isViewingCurrentEdition}
                      className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        selected
                          ? "border-emerald-300 bg-white"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-950">{option.label}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-500">{option.description}</div>
                    </button>
                  )
                })}
              </div>
              {memoryMode === "logos" ? (
                <MemoryLogoProfileSelector
                  profiles={availableMemoryLogoProfiles}
                  selectedProfiles={memoryLogoProfiles}
                  disabled={configLoading || savingConfig || !isViewingCurrentEdition}
                  onToggle={toggleMemoryLogoProfile}
                />
              ) : null}
            </div>

            {activeGames.includes("puzzle") ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-950">Imagenes del puzzle</div>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Agrega una imagen por linea. Puede ser una URL publica, una ruta local del sitio o una imagen en base64. El juego va rotando entre estas opciones.
                </p>
                <textarea
                  value={puzzleImagesInput}
                  onChange={(event) => setPuzzleImagesInput(event.target.value)}
                  disabled={configLoading || savingConfig || !isViewingCurrentEdition}
                  rows={5}
                  placeholder="/logo-varela-grande.png&#10;https://ejemplo.com/imagen.jpg"
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {normalizedPuzzleImages.length} imagen(es) validas
                </div>
              </div>
            ) : null}

            {configMessage ? (
              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                  configSchemaReady
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {configMessage}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                Juegos activos:{" "}
                <span className="font-semibold text-slate-900">{activeGames.length}</span>
                {activeGames.includes("memoria") && memoryMode === "logos" ? (
                  <span className="ml-3">
                    Logos seleccionados:{" "}
                    <span className="font-semibold text-slate-900">
                      {selectedMemoryLogoCount || "automatico"}
                    </span>
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleSaveConfig()}
                disabled={
                  configLoading ||
                  savingConfig ||
                  !isViewingCurrentEdition ||
                  (challengeActive && activeGames.length === 0)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingConfig ? "Guardando..." : "Guardar configuracion"}
              </button>
            </div>
            {!isViewingCurrentEdition ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Estas viendo una edicion del historial. Activala si quieres cambiar su configuracion publica.
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Acceso rapido
                </div>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Link y QR del juego
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Usa este acceso para compartir la experiencia de desafios en ferias, eventos o actividades.
                </p>
                {challengeTitle || challengeSlug ? (
                  <div className="mt-3 text-sm text-slate-500">
                    Edicion actual:{" "}
                    <span className="font-semibold text-slate-900">
                      {challengeTitle || challengeSlug}
                    </span>
                  </div>
                ) : null}
                <div className="mt-3 break-all rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {challengePublicUrl}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleCopyPublicLink()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  Copiar link
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <QrCode className="h-4 w-4" />
                  Descargar QR
                </button>
                <a
                  href={challengePublicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver página pública
                </a>
              </div>
            </div>

            {shareMessage ? (
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                {shareMessage}
              </div>
            ) : null}
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Participantes
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">
                    {entries.length}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={visibleEntries.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </button>
                <button
                  type="button"
                  onClick={handlePrintCoupons}
                  disabled={visibleEntries.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Descargar PDF cupones
                </button>
              </div>

              <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nombre o telefono"
                    className="w-full outline-none"
                  />
                </label>

                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value === "score_desc" ? "score_desc" : "recent")
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500"
                >
                  <option value="recent">Ordenar por más recientes</option>
                  <option value="score_desc">Ordenar por mayor puntaje</option>
                </select>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">Teléfono</th>
                        <th className="px-4 py-3">Puntos</th>
                        <th className="px-4 py-3">Detalle</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {visibleEntries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-sm text-slate-500">
                            No encontramos participantes con ese filtro.
                          </td>
                        </tr>
                      ) : (
                        visibleEntries.map((entry) => (
                          <tr key={entry.id} className="text-sm text-slate-700">
                            <td className="px-4 py-3 font-medium text-slate-900">{entry.nombre}</td>
                            <td className="px-4 py-3">{entry.telefono}</td>
                            <td className="px-4 py-3 font-semibold">{entry.puntajeTotal}</td>
                            <td className="px-4 py-3 text-xs leading-6 text-slate-500">
                              <div>Sopa: {entry.puntosSopa}</div>
                              <div>Memoria: {entry.puntosMemoria}</div>
                              <div>Pelicula: {entry.puntosPelicula}</div>
                              <div>Puzzle: {entry.puntosPuzzle}</div>
                              <div>Laberinto: {entry.puntosLaberinto}</div>
                            </td>
                            <td className="px-4 py-3">
                              {entry.createdAt
                                ? new Date(entry.createdAt).toLocaleString("es-UY", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })
                                : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => setEntryToDelete(entry)}
                                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-600 p-3 text-white">
                    <Shuffle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Sorteo aleatorio</h2>
                    <p className="text-sm text-slate-500">
                      Elige cuantas personas quieres sacar como ganadoras.
                    </p>
                  </div>
                </div>

                {errorMessage ? (
                  <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                ) : null}

                {message ? (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {message}
                  </div>
                ) : null}

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Cantidad de ganadores
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, visibleEntries.length)}
                    value={winnersCount}
                    onChange={(event) => setWinnersCount(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleDraw()}
                  disabled={drawing || visibleEntries.length === 0}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trophy className="h-5 w-5" />
                  {drawing ? "Sorteando..." : "Realizar sorteo"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowResetDrawsConfirm(true)}
                  disabled={resettingDraws || (draws.length === 0 && winners.length === 0)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RotateCcw className="h-5 w-5" />
                  {resettingDraws ? "Reiniciando..." : "Reiniciar sorteos"}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Ultimo sorteo
                </div>
                {latestDraw ? (
                  <>
                    <div className="mt-2 text-lg font-semibold text-slate-900">
                      {latestDraw.cantidadGanadores} ganador(es)
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {latestDraw.createdAt
                        ? new Date(latestDraw.createdAt).toLocaleString("es-UY", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "-"}
                    </div>
                    <div className="mt-5 space-y-3">
                      {latestWinners.map((winner) => (
                        <div
                          key={winner.id}
                          className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{winner.nombre}</div>
                              <div className="text-sm text-slate-600">{winner.telefono}</div>
                              <div className="text-sm text-emerald-700">
                                Puntaje: {winner.puntajeTotal}
                              </div>
                              <div
                                className={`mt-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                                  winner.entregado ? "text-emerald-700" : "text-amber-700"
                                }`}
                              >
                                {winner.entregado ? "Premio entregado" : "Pendiente de entrega"}
                              </div>
                              {winner.entregadoAt ? (
                                <div className="mt-1 text-xs text-slate-500">
                                  {new Date(winner.entregadoAt).toLocaleString("es-UY", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex flex-col gap-2 sm:items-end">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleToggleDelivered(
                                    winner.winnerRowId,
                                    winner.entregado,
                                    winner.nombre
                                  )
                                }
                                className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                  winner.entregado
                                    ? "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100"
                                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                                }`}
                              >
                                {winner.entregado ? "Quitar marca" : "Marcar entregado"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEntryToDelete(winner)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar participante
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-3 text-sm text-slate-500">
                    Todavía no realizaste ningún sorteo desde este panel.
                  </div>
                )}
              </div>
            </aside>
          </section>
        </div>
      )}
    </div>
  )
}

function MemoryLogoProfileSelector({
  profiles,
  selectedProfiles,
  disabled = false,
  onToggle,
}: {
  profiles: MemoryLogoProfileOption[]
  selectedProfiles: ReturnType<typeof normalizeMemoryLogoProfiles>
  disabled?: boolean
  onToggle: (profileKey: MemoryLogoProfileOption["key"]) => void
}) {
  const selectedCount = selectedProfiles.length

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">
            Comercios y servicios para la memoria
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Marca los perfiles que pueden aparecer. Si no seleccionas ninguno, se usan perfiles activos automaticamente.
          </p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {selectedCount > 0 ? `${selectedCount} seleccionado(s)` : "Automatico"}
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No hay comercios o servicios activos con imagen para seleccionar.
        </div>
      ) : (
        <div className="mt-4 grid max-h-80 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile) => {
            const selected = selectedProfiles.includes(profile.key)

            return (
              <button
                key={profile.key}
                type="button"
                onClick={() => onToggle(profile.key)}
                disabled={disabled}
                className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="relative flex h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profile.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-950">
                    {profile.label}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-slate-500">
                    {profile.typeLabel}
                  </span>
                </span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {selected ? <CheckCircle2 className="h-4 w-4" /> : null}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CreateChallengePanel({
  isOpen,
  title,
  active,
  selectedGames,
  soupWords,
  memoryMode,
  memoryLogoProfiles,
  availableMemoryLogoProfiles,
  puzzleImages,
  isCreating,
  onTitleChange,
  onActiveChange,
  onToggleGame,
  onSoupWordsChange,
  onMemoryModeChange,
  onToggleMemoryLogoProfile,
  onPuzzleImagesChange,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean
  title: string
  active: boolean
  selectedGames: ChallengeKey[]
  soupWords: string
  memoryMode: ChallengeMemoryMode
  memoryLogoProfiles: ReturnType<typeof normalizeMemoryLogoProfiles>
  availableMemoryLogoProfiles: MemoryLogoProfileOption[]
  puzzleImages: string
  isCreating: boolean
  onTitleChange: (value: string) => void
  onActiveChange: (value: boolean) => void
  onToggleGame: (game: ChallengeKey) => void
  onSoupWordsChange: (value: string) => void
  onMemoryModeChange: (value: ChallengeMemoryMode) => void
  onToggleMemoryLogoProfile: (profileKey: MemoryLogoProfileOption["key"]) => void
  onPuzzleImagesChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!isOpen) return null

  const canCreate = !active || selectedGames.length > 0
  const normalizedSoupWords = normalizeWordSearchWords(soupWords)
  const normalizedPuzzleImages = normalizePuzzleImages(puzzleImages)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Nuevo desafio
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Configurar nueva edicion
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Esta pantalla crea una edicion independiente con link y QR propios. Los participantes y sorteos empiezan vacios.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-900">
                Nombre de la edicion
              </span>
              <input
                type="text"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Ejemplo: Feria de junio, Expo local, Vacaciones"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500"
              />
            </label>

            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Juegos incluidos</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Elige el recorrido que van a jugar los participantes.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  onClick={() => onActiveChange(!active)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Power className="h-4 w-4" />
                  {active ? "Crear activo" : "Crear pausado"}
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {CHALLENGE_GAME_OPTIONS.map((game) => {
                  const selected = selectedGames.includes(game.key)

                  return (
                    <button
                      key={game.key}
                      type="button"
                      onClick={() => onToggleGame(game.key)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {selected ? <CheckCircle2 className="h-4 w-4" /> : null}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-950">{game.label}</div>
                          <div className="mt-1 text-sm leading-6 text-slate-500">
                            {game.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {selectedGames.includes("sopa") ? (
              <section>
                <h3 className="text-base font-semibold text-slate-950">Palabras de la sopa</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Una palabra por linea. Se agrupan automaticamente en rondas rotativas de hasta 4.
                </p>
                <textarea
                  value={soupWords}
                  onChange={(event) => onSoupWordsChange(event.target.value)}
                  rows={5}
                  placeholder="PANADERIA&#10;FARMACIA&#10;TALLER&#10;CAFETERIA"
                  className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500"
                />
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {normalizedSoupWords.length} palabra(s) validas
                </div>
              </section>
            ) : null}

            {selectedGames.includes("memoria") ? (
              <section>
                <h3 className="text-base font-semibold text-slate-950">Contenido de la memoria</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Puedes usar las palabras clasicas o imagenes de comercios y servicios activos.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { value: "palabras" as const, label: "Palabras", description: "Cartas con textos cortos." },
                    { value: "logos" as const, label: "Logos locales", description: "Cartas con imagenes de comercios y servicios." },
                  ].map((option) => {
                    const selected = memoryMode === option.value

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onMemoryModeChange(option.value)}
                        className={`rounded-xl border p-4 text-left transition ${
                          selected
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-sm font-semibold text-slate-950">{option.label}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-500">{option.description}</div>
                      </button>
                    )
                  })}
                </div>
                {memoryMode === "logos" ? (
                  <MemoryLogoProfileSelector
                    profiles={availableMemoryLogoProfiles}
                    selectedProfiles={memoryLogoProfiles}
                    onToggle={onToggleMemoryLogoProfile}
                  />
                ) : null}
              </section>
            ) : null}

            {selectedGames.includes("puzzle") ? (
              <section>
                <h3 className="text-base font-semibold text-slate-950">Imagenes del puzzle</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Una imagen por linea. El juego rota entre estas opciones y el participante elige dificultad.
                </p>
                <textarea
                  value={puzzleImages}
                  onChange={(event) => onPuzzleImagesChange(event.target.value)}
                  rows={5}
                  placeholder="/logo-varela-grande.png&#10;https://ejemplo.com/imagen.jpg"
                  className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500"
                />
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {normalizedPuzzleImages.length} imagen(es) validas
                </div>
              </section>
            ) : null}
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Resumen
            </div>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <div className="text-slate-500">Nombre</div>
                <div className="mt-1 font-semibold text-slate-950">
                  {title.trim() || "Desafio sin nombre"}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Estado inicial</div>
                <div className="mt-1 font-semibold text-slate-950">
                  {active ? "Activo y listo para compartir" : "Pausado"}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Juegos</div>
                <div className="mt-1 font-semibold text-slate-950">
                  {selectedGames.length} seleccionado(s)
                </div>
              </div>
              {selectedGames.includes("sopa") ? (
                <div>
                  <div className="text-slate-500">Sopa</div>
                  <div className="mt-1 font-semibold text-slate-950">
                    {normalizedSoupWords.length > 0
                      ? `${normalizedSoupWords.length} palabra(s)`
                      : "Rondas clasicas"}
                  </div>
                </div>
              ) : null}
              {selectedGames.includes("memoria") ? (
                <div>
                  <div className="text-slate-500">Memoria</div>
                  <div className="mt-1 font-semibold text-slate-950">
                    {memoryMode === "logos"
                      ? memoryLogoProfiles.length > 0
                        ? `${memoryLogoProfiles.length} logo(s)`
                        : "Logos automaticos"
                      : "Palabras"}
                  </div>
                </div>
              ) : null}
              {selectedGames.includes("puzzle") ? (
                <div>
                  <div className="text-slate-500">Puzzle</div>
                  <div className="mt-1 font-semibold text-slate-950">
                    {normalizedPuzzleImages.length > 0
                      ? `${normalizedPuzzleImages.length} imagen(es)`
                      : "Imagen por defecto"}
                  </div>
                </div>
              ) : null}
            </div>

            {!canCreate ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Para publicar activo, selecciona al menos un juego.
              </div>
            ) : null}
          </aside>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canCreate || isCreating}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {isCreating ? "Creando..." : "Crear desafio"}
          </button>
        </div>
      </div>
    </div>
  )
}
