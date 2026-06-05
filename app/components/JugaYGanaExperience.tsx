'use client'

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Clock3,
  Gift,
  RefreshCcw,
  Star,
  Trophy,
} from "lucide-react"
import { supabase } from "../supabase"
import {
  type ChallengeKey,
  DEFAULT_CHALLENGE_CONFIG,
  getChallengeAssignment,
  getChallengeBrowserKey,
  isMissingChallengesSchemaError,
  normalizeChallengeKeys,
  normalizeMemoryLogoProfiles,
  normalizeMemoryMode,
  normalizePuzzleImages,
  normalizeWordSearchWords,
  resetChallengeAssignment,
} from "../lib/challengeGame"

type ChallengeMeta = {
  key: ChallengeKey
  title: string
  description: string
  points: number
}

type MemoryCard = {
  id: string
  value: string
  matchKey: string
  imageUrl?: string
  sourceLabel?: string
  matched: boolean
}

type MemoryItem = {
  id: string
  label: string
  imageUrl?: string
  sourceLabel?: string
}

type PuzzleDifficulty = "facil" | "dificil"
type ChallengeLevel = "facil" | "intermedio" | "dificil"

const CHALLENGE_LEVEL_OPTIONS: Array<{
  key: ChallengeLevel
  title: string
  description: string
}> = [
  {
    key: "facil",
    title: "Facil",
    description: "Jugá solo y registrá tus puntos.",
  },
  {
    key: "intermedio",
    title: "Intermedio",
    description: "Jugá acompañado y participá en familia.",
  },
  {
    key: "dificil",
    title: "Dificil",
    description: "Mas exigente, pensado para quienes quieren competir fuerte.",
  },
]

type WordSearchVariant = {
  name: string
  targets: string[]
  placements: Array<{
    word: string
    row: number
    col: number
    rowStep: number
    colStep: number
  }>
}

type WordPlacement = {
  word: string
  row: number
  col: number
  rowStep: number
  colStep: number
}

const CHALLENGES: ChallengeMeta[] = [
  {
    key: "sopa",
    title: "Sopa de letras",
    description: "Encuentra todas las palabras antes de que termine el tiempo y suma más puntos.",
    points: 30,
  },
  {
    key: "memoria",
    title: "Juego de memoria",
    description: "Descubre todas las parejas antes de que se acabe el tiempo para sumar más.",
    points: 30,
  },
  {
    key: "pelicula",
    title: "Adivina la película",
    description: "Adivina el titulo con la menor cantidad posible de errores.",
    points: 40,
  },
  {
    key: "puzzle",
    title: "Puzzle",
    description: "Mueve las piezas vecinas al espacio libre hasta ordenar el tablero.",
    points: 35,
  },
  {
    key: "laberinto",
    title: "Laberinto",
    description: "Encuentra el camino hasta la meta con la menor cantidad de movimientos.",
    points: 35,
  },
]

const WORD_SEARCH_VARIANTS: WordSearchVariant[] = [
  {
    name: "Feria central",
    targets: ["VARELA", "PREMIOS", "FERIA", "HOLA"],
    placements: [
      { word: "VARELA", row: 0, col: 0, rowStep: 0, colStep: 1 },
      { word: "PREMIOS", row: 8, col: 0, rowStep: 0, colStep: 1 },
      { word: "FERIA", row: 2, col: 4, rowStep: 1, colStep: 1 },
      { word: "HOLA", row: 3, col: 0, rowStep: 0, colStep: 1 },
    ],
  },
  {
    name: "Edicion plaza",
    targets: ["HOLA", "FERIA", "PLAZAS", "MERCADOS"],
    placements: [
      { word: "HOLA", row: 0, col: 0, rowStep: 1, colStep: 1 },
      { word: "FERIA", row: 4, col: 0, rowStep: 0, colStep: 1 },
      { word: "PLAZAS", row: 0, col: 8, rowStep: 1, colStep: -1 },
      { word: "MERCADOS", row: 8, col: 0, rowStep: 0, colStep: 1 },
    ],
  },
  {
    name: "Edicion evento",
    targets: ["PLAN", "VARELA", "CURSOS", "PREMIAR"],
    placements: [
      { word: "PLAN", row: 0, col: 0, rowStep: 1, colStep: 1 },
      { word: "VARELA", row: 4, col: 0, rowStep: 0, colStep: 1 },
      { word: "CURSOS", row: 0, col: 8, rowStep: 1, colStep: 0 },
      { word: "PREMIAR", row: 8, col: 0, rowStep: 0, colStep: 1 },
    ],
  },
  {
    name: "Recorrido barrial",
    targets: ["BARRIOS", "LOCALES", "RUTAS", "PASEO"],
    placements: [
      { word: "BARRIOS", row: 0, col: 0, rowStep: 0, colStep: 1 },
      { word: "LOCALES", row: 0, col: 8, rowStep: 1, colStep: 0 },
      { word: "RUTAS", row: 4, col: 0, rowStep: 1, colStep: 1 },
      { word: "PASEO", row: 3, col: 0, rowStep: 0, colStep: 1 },
    ],
  },
  {
    name: "Salida familiar",
    targets: ["FAMILIA", "CINES", "PLAZAS", "SALIDAS"],
    placements: [
      { word: "FAMILIA", row: 0, col: 0, rowStep: 0, colStep: 1 },
      { word: "CINES", row: 1, col: 8, rowStep: 1, colStep: 0 },
      { word: "PLAZAS", row: 0, col: 8, rowStep: 1, colStep: -1 },
      { word: "SALIDAS", row: 3, col: 0, rowStep: 0, colStep: 1 },
    ],
  },
  {
    name: "Comercios y servicios",
    targets: ["NEGOCIOS", "OFERTAS", "SERVICIOS", "COMPRAS"],
    placements: [
      { word: "NEGOCIOS", row: 0, col: 0, rowStep: 1, colStep: 0 },
      { word: "OFERTAS", row: 1, col: 1, rowStep: 0, colStep: 1 },
      { word: "SERVICIOS", row: 8, col: 0, rowStep: 0, colStep: 1 },
      { word: "COMPRAS", row: 3, col: 1, rowStep: 0, colStep: 1 },
    ],
  },
  {
    name: "Agenda local",
    targets: ["AGENDA", "EVENTOS", "MUSICAS", "TALLERES"],
    placements: [
      { word: "AGENDA", row: 0, col: 0, rowStep: 1, colStep: 1 },
      { word: "EVENTOS", row: 1, col: 0, rowStep: 0, colStep: 1 },
      { word: "MUSICAS", row: 0, col: 8, rowStep: 1, colStep: 0 },
      { word: "TALLERES", row: 3, col: 0, rowStep: 0, colStep: 1 },
    ],
  },
  {
    name: "Explora la ciudad",
    targets: ["CIUDADES", "MAPAS", "GUIAS", "PARADAS"],
    placements: [
      { word: "CIUDADES", row: 0, col: 0, rowStep: 0, colStep: 1 },
      { word: "MAPAS", row: 0, col: 8, rowStep: 1, colStep: 0 },
      { word: "GUIAS", row: 2, col: 0, rowStep: 1, colStep: 1 },
      { word: "PARADAS", row: 3, col: 0, rowStep: 0, colStep: 1 },
    ],
  },
  {
    name: "Estudia y aprende",
    targets: ["CURSOS", "CLASES", "APRENDER", "DOCENTES"],
    placements: [
      { word: "CURSOS", row: 0, col: 0, rowStep: 0, colStep: 1 },
      { word: "CLASES", row: 1, col: 0, rowStep: 1, colStep: 1 },
      { word: "APRENDER", row: 0, col: 8, rowStep: 1, colStep: 0 },
      { word: "DOCENTES", row: 3, col: 0, rowStep: 0, colStep: 1 },
    ],
  },
  {
    name: "Fin de semana",
    targets: ["PASEOS", "SABADO", "DOMINGO", "PREMIOS"],
    placements: [
      { word: "PASEOS", row: 0, col: 0, rowStep: 0, colStep: 1 },
      { word: "SABADO", row: 1, col: 0, rowStep: 1, colStep: 1 },
      { word: "DOMINGO", row: 0, col: 8, rowStep: 1, colStep: 0 },
      { word: "PREMIOS", row: 3, col: 0, rowStep: 0, colStep: 1 },
    ],
  },
  {
    name: "Impulso premium",
    targets: ["PREMIUM", "DESTACADO", "VISITAS", "LIKES"],
    placements: [
      { word: "PREMIUM", row: 0, col: 0, rowStep: 0, colStep: 1 },
      { word: "DESTACADO", row: 0, col: 8, rowStep: 1, colStep: 0 },
      { word: "VISITAS", row: 2, col: 0, rowStep: 1, colStep: 1 },
      { word: "LIKES", row: 3, col: 0, rowStep: 0, colStep: 1 },
    ],
  },
  {
    name: "Descubre más",
    targets: ["DESCUBRE", "JUEGOS", "PUNTOS", "GANAR"],
    placements: [
      { word: "DESCUBRE", row: 0, col: 0, rowStep: 0, colStep: 1 },
      { word: "JUEGOS", row: 0, col: 8, rowStep: 1, colStep: 0 },
      { word: "PUNTOS", row: 2, col: 0, rowStep: 1, colStep: 1 },
      { word: "GANAR", row: 6, col: 0, rowStep: 0, colStep: 1 },
    ],
  },
]

const WORD_SEARCH_TIME = 75
const MEMORY_TIME = 55
const WORD_SEARCH_WORDS_PER_ROUND = 4

const MEMORY_VARIANTS = [
  ["MATE", "RADIO", "FERIA", "CINE", "TAZA", "QR"],
  ["HOLA", "VARELA", "PREMIO", "JUEGO", "PLAZA", "LOCAL"],
  ["CURSO", "EVENTO", "COMERCIO", "BARRIO", "MEMO", "SORTEO"],
  ["MAPA", "GUIA", "PASEO", "CUPON", "PREMIO", "FERIA"],
  ["AULA", "CLASE", "CURSO", "TALLER", "PROFE", "LIBRO"],
  ["CINE", "SERIE", "POCHO", "MUSICA", "BAILE", "SHOW"],
  ["CAFE", "PIZZA", "TARTA", "PASTA", "POSTRE", "HELADO"],
  ["RUTA", "PLAZA", "PARQUE", "BARRIO", "PASEO", "VISITA"],
  ["RADIO", "NOTA", "FOTO", "VIDEO", "LIKES", "POST"],
  ["TAZA", "BOLSO", "GORRA", "STICKER", "LLAVERO", "CUPON"],
]

const MIN_LOGO_MEMORY_ITEMS = 6

function wordsToMemoryItems(values: string[]) {
  return values.map((value) => ({
    id: `palabra-${value}`,
    label: value,
  }))
}

const MOVIE_CHALLENGES = [
  {
    title: "COCO",
    hint: "Animacion sobre musica, familia y el Dia de Muertos.",
  },
  {
    title: "TITANIC",
    hint: "Romance y tragedia en un viaje muy famoso.",
  },
  {
    title: "SHREK",
    hint: "Un ogro verde que vive en un pantano.",
  },
  {
    title: "FROZEN",
    hint: "Dos hermanas, hielo y una cancion muy conocida.",
  },
  {
    title: "UP",
    hint: "Una casa viaja por el cielo sostenida por globos.",
  },
  {
    title: "RATATOUILLE",
    hint: "Un pequeno chef inesperado en una cocina francesa.",
  },
  {
    title: "INTENSAMENTE",
    hint: "Emociones que viven dentro de la mente de una nina.",
  },
  {
    title: "GLADIADOR",
    hint: "Un general romano convertido en luchador.",
  },
  {
    title: "ENCANTO",
    hint: "Una familia con dones magicos en Colombia.",
  },
  {
    title: "AVATAR",
    hint: "Un mundo azul lleno de naturaleza y conexion espiritual.",
  },
  {
    title: "MOANA",
    hint: "Una joven navega el oceano para salvar a su pueblo.",
  },
  {
    title: "MULAN",
    hint: "Una heroina se disfraza para ir a la guerra.",
  },
  {
    title: "ALADDIN",
    hint: "Una lampara, un genio y una alfombra voladora.",
  },
  {
    title: "CARS",
    hint: "Autos de carrera con mucha velocidad y amistad.",
  },
  {
    title: "NEMO",
    hint: "Un pez payaso recorre el oceano buscando a su hijo.",
  },
  {
    title: "DUMBO",
    hint: "Un elefante que puede volar con sus orejas.",
  },
  {
    title: "BAMBI",
    hint: "La historia de un pequeno ciervo en el bosque.",
  },
  {
    title: "MADAGASCAR",
    hint: "Animales del zoologico viven una aventura inesperada.",
  },
  {
    title: "KUNG FU PANDA",
    hint: "Un panda torpe termina convertido en gran guerrero.",
  },
  {
    title: "TOY STORY",
    hint: "Juguetes que cobran vida cuando nadie los ve.",
  },
  {
    title: "BUSCANDO A DORY",
    hint: "Una pez olvidadiza busca reencontrarse con su familia.",
  },
  {
    title: "EL REY LEON",
    hint: "Un cachorro debe crecer para ocupar su lugar en la sabana.",
  },
  {
    title: "MONSTERS INC",
    hint: "Monstruos trabajan asustando ninos para generar energia.",
  },
  {
    title: "LUCA",
    hint: "Un verano italiano con amigos muy especiales.",
  },
  {
    title: "SOUL",
    hint: "Un musico reflexiona sobre la vida y su verdadera chispa.",
  },
  {
    title: "BRAVE",
    hint: "Una princesa arquera desafia su destino en Escocia.",
  },
  {
    title: "ZOOTOPIA",
    hint: "Una coneja policia investiga un caso en una gran ciudad.",
  },
  {
    title: "WALLE",
    hint: "Un robot solitario limpia la Tierra y encuentra compania.",
  },
  {
    title: "MEGAMENTE",
    hint: "Un villano brillante termina convirtiéndose en héroe.",
  },
  {
    title: "MINIONS",
    hint: "Pequenos personajes amarillos buscando a su jefe ideal.",
  },
  {
    title: "SING",
    hint: "Animales participan en un concurso musical.",
  },
  {
    title: "RIO",
    hint: "Aves coloridas viven una gran aventura en Brasil.",
  },
  {
    title: "HOTEL TRANSYLVANIA",
    hint: "Monstruos pasan sus vacaciones en un hotel muy especial.",
  },
  {
    title: "JUMANJI",
    hint: "Un juego desata desafios peligrosos y sorpresas.",
  },
  {
    title: "MATRIX",
    hint: "Un elegido descubre que su realidad no es lo que parece.",
  },
  {
    title: "ROCKY",
    hint: "Un boxeador humilde recibe una oportunidad unica.",
  },
  {
    title: "CREED",
    hint: "El hijo de una leyenda busca su propio camino en el ring.",
  },
  {
    title: "BARBIE",
    hint: "Una aventura rosa que mezcla fantasia con mundo real.",
  },
  {
    title: "SONIC",
    hint: "Un erizo azul super rapido enfrenta a un cientifico loco.",
  },
  {
    title: "SPIDERMAN",
    hint: "Un joven héroe lanza telarañas y protege su ciudad.",
  },
  {
    title: "BATMAN",
    hint: "Un vigilante oscuro combate el crimen en Gotham.",
  },
  {
    title: "SUPERMAN",
    hint: "Un héroe venido de otro planeta protege la Tierra.",
  },
  {
    title: "JOKER",
    hint: "La historia de un personaje perturbador que cae en la locura.",
  },
  {
    title: "HARRY POTTER",
    hint: "Un mago joven estudia en una escuela muy especial.",
  },
  {
    title: "EL HOBBIT",
    hint: "Una aventura fantastica con un anillo y criaturas sorprendentes.",
  },
  {
    title: "EL PADRINO",
    hint: "Un clasico sobre familia, poder y mafia.",
  },
  {
    title: "FORREST GUMP",
    hint: "Un hombre vive momentos historicos con una mirada muy particular.",
  },
  {
    title: "JURASSIC PARK",
    hint: "Un parque tematico revive dinosaurios.",
  },
  {
    title: "KING KONG",
    hint: "Un enorme gorila se convierte en leyenda.",
  },
  {
    title: "GODZILLA",
    hint: "Un monstruo gigante emerge para sembrar caos.",
  },
  {
    title: "RAPIDOS Y FURIOSOS",
    hint: "Velocidad, autos y carreras llenas de acción.",
  },
  {
    title: "MISION IMPOSIBLE",
    hint: "Un agente arriesga todo en operaciones extremas.",
  },
  {
    title: "TOP GUN",
    hint: "Pilotos de combate entrenan al limite.",
  },
  {
    title: "CAZA FANTASMAS",
    hint: "Un grupo atrapa seres sobrenaturales en la ciudad.",
  },
  {
    title: "VOLVER AL FUTURO",
    hint: "Un auto especial lleva a sus protagonistas a otras epocas.",
  },
  {
    title: "INDIANA JONES",
    hint: "Un arqueologo vive aventuras buscando reliquias historicas.",
  },
  {
    title: "STAR WARS",
    hint: "Una saga galactica con jedis, naves y una gran fuerza.",
  },
  {
    title: "ET",
    hint: "Un pequeno extraterrestre quiere volver a su casa.",
  },
  {
    title: "LA MASCARA",
    hint: "Una máscara transforma a un hombre común en alguien disparatado.",
  },
  {
    title: "ACE VENTURA",
    hint: "Un detective muy excéntrico busca animales perdidos.",
  },
  {
    title: "MI POBRE ANGELITO",
    hint: "Un nino queda solo en casa y enfrenta a dos ladrones.",
  },
  {
    title: "MATILDA",
    hint: "Una nina muy inteligente descubre poderes especiales.",
  },
  {
    title: "CHARLIE Y LA FABRICA",
    hint: "Un nino entra en una fabrica de chocolate inolvidable.",
  },
  {
    title: "EL GRINCH",
    hint: "Un personaje verde intenta arruinar la Navidad.",
  },
  {
    title: "LA MASCARA DE ZORRO",
    hint: "Un héroe enmascarado deja su marca con la espada.",
  },
  {
    title: "NACHO LIBRE",
    hint: "Un cocinero sueña con ser luchador.",
  },
  {
    title: "ESCUELA DE ROCK",
    hint: "Un musico arma una banda con sus estudiantes.",
  },
  {
    title: "LEGALMENTE RUBIA",
    hint: "Una joven demuestra que puede brillar en la facultad de derecho.",
  },
  {
    title: "DIABLO VISTE A LA MODA",
    hint: "Una asistente entra al exigente mundo de la moda.",
  },
  {
    title: "HOMBRES DE NEGRO",
    hint: "Agentes secretos controlan la presencia extraterrestre.",
  },
  {
    title: "BUSCANDO NUNCA JAMAS",
    hint: "Un nino que no quiere crecer lidera una aventura fantastica.",
  },
  {
    title: "PETER PAN",
    hint: "Un chico vuela hacia un lugar donde nadie crece.",
  },
  {
    title: "LILO Y STITCH",
    hint: "Una nina hawaiana adopta una criatura muy traviesa.",
  },
  {
    title: "TARZAN",
    hint: "Un joven criado en la selva descubre su origen.",
  },
  {
    title: "HERCULES",
    hint: "Un héroe mitológico busca demostrar su verdadero valor.",
  },
  {
    title: "PINOCHO",
    hint: "Un muneco de madera sueña con ser un nino real.",
  },
  {
    title: "CENICIENTA",
    hint: "Un zapatito cambia el destino de una joven.",
  },
  {
    title: "LA BELLA Y LA BESTIA",
    hint: "Una historia romantica en un castillo encantado.",
  },
  {
    title: "BLANCANIEVES",
    hint: "Una princesa encuentra ayuda en siete companeros.",
  },
  {
    title: "LOS INCREIBLES",
    hint: "Una familia de superhéroes intenta volver a la acción.",
  },
  {
    title: "BICHOS",
    hint: "Insectos pequenos buscan defender a su colonia.",
  },
  {
    title: "TURBO",
    hint: "Un caracol suena con correr a gran velocidad.",
  },
  {
    title: "BOLT",
    hint: "Un perro actor cree tener superpoderes.",
  },
  {
    title: "EL GATO CON BOTAS",
    hint: "Un felino espadachin vive aventuras con mucho estilo.",
  },
  {
    title: "DRAGON BALL SUPER",
    hint: "Guerreros poderosos pelean por universos enteros.",
  },
  {
    title: "KARATE KID",
    hint: "Un joven aprende defensa y disciplina con un maestro especial.",
  },
  {
    title: "RAMBO",
    hint: "Un exsoldado sobrevive en situaciones extremas.",
  },
  {
    title: "TERMINATOR",
    hint: "Una máquina llega del futuro para cambiar la historia.",
  },
]

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const MAX_MOVIE_ERRORS = 6
const MAX_MOVIE_ROUNDS = 4
const PUZZLE_TIME = 80
const DEFAULT_PUZZLE_IMAGES = ["/logo-varela-grande.png"]
const PUZZLE_DIFFICULTY_SIZE: Record<PuzzleDifficulty, number> = {
  facil: 3,
  dificil: 4,
}
const MAZE_TIME = 70
const MAZE_LAYOUT = [
  "S..#...",
  "##.#.#.",
  "...#.#.",
  ".###.#.",
  "...#...",
  ".#.###.",
  "..G#...",
]
const MAZE_START = { row: 0, col: 0 }

function shuffleArray<T>(items: T[]) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

function getNextDifferentMovieIndex(currentIndex: number, total: number) {
  if (total <= 1) return currentIndex

  let nextIndex = Math.floor(Math.random() * total)
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * total)
  }

  return nextIndex
}

function createPuzzleOrder(size: number) {
  const solvedOrder = Array.from({ length: size * size }, (_, index) => index)
  let nextOrder = shuffleArray(solvedOrder)

  if (nextOrder.every((tile, index) => tile === index)) {
    nextOrder = [...nextOrder]
    ;[nextOrder[0], nextOrder[1]] = [nextOrder[1], nextOrder[0]]
  }

  return nextOrder
}

function isPuzzleSolved(tiles: number[]) {
  return tiles.every((tile, index) => tile === index)
}

function getMazeCell(row: number, col: number) {
  return MAZE_LAYOUT[row]?.[col] || "#"
}

function isMazeWalkable(row: number, col: number) {
  const cell = getMazeCell(row, col)
  return cell !== "#"
}

function createMemoryDeck(items: MemoryItem[]) {
  return shuffleArray(
    items.flatMap((item, index) => [
      {
        id: `${item.id}-${index}-a`,
        value: item.label,
        matchKey: item.id,
        imageUrl: item.imageUrl,
        sourceLabel: item.sourceLabel,
        matched: false,
      },
      {
        id: `${item.id}-${index}-b`,
        value: item.label,
        matchKey: item.id,
        imageUrl: item.imageUrl,
        sourceLabel: item.sourceLabel,
        matched: false,
      },
    ])
  )
}

function formatPhone(value: string) {
  return value.replace(/[^\d+]/g, "")
}

function getCellPosition(cellIndex: number, columnCount: number) {
  return {
    row: Math.floor(cellIndex / columnCount),
    col: cellIndex % columnCount,
  }
}

function getStepDirection(fromIndex: number, toIndex: number, columnCount: number) {
  const from = getCellPosition(fromIndex, columnCount)
  const to = getCellPosition(toIndex, columnCount)
  const rowStep = to.row - from.row
  const colStep = to.col - from.col

  if (Math.abs(rowStep) > 1 || Math.abs(colStep) > 1) {
    return null
  }

  if (rowStep === 0 && colStep === 0) {
    return null
  }

  return { rowStep, colStep }
}

function addCellToWordSelection(
  current: number[],
  cellIndex: number,
  columnCount: number,
  options: { allowBacktrack: boolean }
) {
  if (current.length === 0) {
    return [cellIndex]
  }

  const lastSelectedIndex = current[current.length - 1]

  if (cellIndex === lastSelectedIndex) {
    return current
  }

  if (options.allowBacktrack && current.length > 1 && cellIndex === current[current.length - 2]) {
    return current.slice(0, -1)
  }

  if (current.includes(cellIndex)) {
    return current
  }

  const nextDirection = getStepDirection(lastSelectedIndex, cellIndex, columnCount)

  if (!nextDirection) {
    return current
  }

  if (current.length === 1) {
    return [...current, cellIndex]
  }

  const lockedDirection = getStepDirection(current[0], current[1], columnCount)

  if (!lockedDirection) {
    return current
  }

  if (
    nextDirection.rowStep !== lockedDirection.rowStep ||
    nextDirection.colStep !== lockedDirection.colStep
  ) {
    return current
  }

  return [...current, cellIndex]
}

function createSeededRandom(seedText: string) {
  let seed = 0

  for (let index = 0; index < seedText.length; index += 1) {
    seed = (seed * 31 + seedText.charCodeAt(index)) >>> 0
  }

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function canPlaceWord(grid: string[][], size: number, placement: WordPlacement) {
  return placement.word.split("").every((letter, letterIndex) => {
    const row = placement.row + placement.rowStep * letterIndex
    const col = placement.col + placement.colStep * letterIndex

    if (row < 0 || row >= size || col < 0 || col >= size) {
      return false
    }

    const currentValue = grid[row][col]
    return !currentValue || currentValue === letter
  })
}

function applyWordPlacement(grid: string[][], placement: WordPlacement) {
  placement.word.split("").forEach((letter, letterIndex) => {
    const row = placement.row + placement.rowStep * letterIndex
    const col = placement.col + placement.colStep * letterIndex
    grid[row][col] = letter
  })
}

function buildConfiguredWordSearchVariants(words: string[]) {
  const normalizedWords = normalizeWordSearchWords(words)
  if (normalizedWords.length === 0) return WORD_SEARCH_VARIANTS

  const roundsCount = Math.max(1, Math.ceil(normalizedWords.length / WORD_SEARCH_WORDS_PER_ROUND))

  return Array.from({ length: roundsCount }, (_, roundIndex) => {
    const startIndex = roundIndex * WORD_SEARCH_WORDS_PER_ROUND
    const targets = Array.from(
      { length: Math.min(WORD_SEARCH_WORDS_PER_ROUND, normalizedWords.length) },
      (_, wordOffset) => normalizedWords[(startIndex + wordOffset) % normalizedWords.length]
    )

    return {
      name: `Palabras configuradas ${roundIndex + 1}`,
      targets,
      placements: [],
    } satisfies WordSearchVariant
  })
}

function buildWordSearchGrid(variant: WordSearchVariant) {
  const size = 10
  const filler = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => ""))
  const random = createSeededRandom(variant.name)
  const placedWords = new Set<string>()

  const directions = [
    { rowStep: 0, colStep: 1 },
    { rowStep: 1, colStep: 0 },
    { rowStep: 1, colStep: 1 },
    { rowStep: 1, colStep: -1 },
    { rowStep: 0, colStep: -1 },
    { rowStep: -1, colStep: 0 },
    { rowStep: -1, colStep: -1 },
    { rowStep: -1, colStep: 1 },
  ]

  variant.placements.forEach((placement) => {
    if (canPlaceWord(grid, size, placement)) {
      applyWordPlacement(grid, placement)
      placedWords.add(placement.word)
    }
  })

  variant.targets.forEach((word) => {
    if (placedWords.has(word)) return

    const candidateDirections = [...directions].sort(() => random() - 0.5)
    let placed = false

    for (const direction of candidateDirections) {
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const row = Math.floor(random() * size)
        const col = Math.floor(random() * size)
        const placement = {
          word,
          row,
          col,
          rowStep: direction.rowStep,
          colStep: direction.colStep,
        }

        if (!canPlaceWord(grid, size, placement)) {
          continue
        }

        applyWordPlacement(grid, placement)
        placed = true
        break
      }

      if (placed) break
    }

    if (!placed) {
      throw new Error(`No se pudo ubicar la palabra ${word} en la sopa.`)
    }
  })

  return grid.map((row, rowIndex) =>
    row.map((value, colIndex) => value || filler[(rowIndex * size + colIndex) % filler.length])
  )
}

function ScoreCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  )
}

type JugaYGanaExperienceProps = {
  challengeSlug?: string
}

export function JugaYGanaExperience({ challengeSlug }: JugaYGanaExperienceProps = {}) {
  const initialAssignment = getChallengeAssignment({
    wordSearchVariantsCount: WORD_SEARCH_VARIANTS.length,
    memoryVariantsCount: MEMORY_VARIANTS.length,
    movieChallengesCount: MOVIE_CHALLENGES.length,
  })

  const [stage, setStage] = useState<"intro" | "play" | "form" | "done">("intro")
  const [challengeLevel, setChallengeLevel] = useState<ChallengeLevel | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [challengeConfig, setChallengeConfig] = useState(DEFAULT_CHALLENGE_CONFIG)
  const [activeChallengeIndex, setActiveChallengeIndex] = useState(0)
  const [completedChallenges, setCompletedChallenges] = useState<Record<ChallengeKey, boolean>>({
    sopa: false,
    memoria: false,
    pelicula: false,
    puzzle: false,
    laberinto: false,
  })
  const [earnedPoints, setEarnedPoints] = useState<Record<ChallengeKey, number>>({
    sopa: 0,
    memoria: 0,
    pelicula: 0,
    puzzle: 0,
    laberinto: 0,
  })

  const [wordSearchVariantIndex, setWordSearchVariantIndex] = useState(() =>
    initialAssignment.wordSearchVariantIndex
  )
  const [wordSelection, setWordSelection] = useState<number[]>([])
  const [foundWords, setFoundWords] = useState<string[]>([])
  const [scoredWords, setScoredWords] = useState<string[]>([])
  const [wordTimeLeft, setWordTimeLeft] = useState(WORD_SEARCH_TIME)
  const [memoryVariantIndex, setMemoryVariantIndex] = useState(() =>
    initialAssignment.memoryVariantIndex
  )
  const [logoMemoryItems, setLogoMemoryItems] = useState<MemoryItem[]>([])
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>(() =>
    createMemoryDeck(wordsToMemoryItems(MEMORY_VARIANTS[initialAssignment.memoryVariantIndex]))
  )
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [memoryLocked, setMemoryLocked] = useState(false)
  const [memoryTimeLeft, setMemoryTimeLeft] = useState(MEMORY_TIME)

  const [movieChallengeIndex, setMovieChallengeIndex] = useState(() =>
    initialAssignment.movieChallengeIndex
  )
  const [guessedLetters, setGuessedLetters] = useState<string[]>([])
  const [wrongLetters, setWrongLetters] = useState<string[]>([])
  const [movieRoundCompleted, setMovieRoundCompleted] = useState(false)
  const [movieRoundPoints, setMovieRoundPoints] = useState(0)
  const [movieRoundsCompleted, setMovieRoundsCompleted] = useState(0)
  const [movieTitlesCompleted, setMovieTitlesCompleted] = useState<string[]>([])
  const [puzzleVariantIndex, setPuzzleVariantIndex] = useState(0)
  const [puzzleDifficulty, setPuzzleDifficulty] = useState<PuzzleDifficulty | null>(null)
  const [puzzleTiles, setPuzzleTiles] = useState<number[]>(() =>
    createPuzzleOrder(PUZZLE_DIFFICULTY_SIZE.facil)
  )
  const [draggedPuzzleIndex, setDraggedPuzzleIndex] = useState<number | null>(null)
  const [puzzleMoves, setPuzzleMoves] = useState(0)
  const [puzzleTimeLeft, setPuzzleTimeLeft] = useState(PUZZLE_TIME)
  const [mazePosition, setMazePosition] = useState(MAZE_START)
  const [mazeMoves, setMazeMoves] = useState(0)
  const [mazeTimeLeft, setMazeTimeLeft] = useState(MAZE_TIME)

  const [participantName, setParticipantName] = useState("")
  const [participantPhone, setParticipantPhone] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [submitLoading, setSubmitLoading] = useState(false)

  const resetChallengeProgress = () => {
    setActiveChallengeIndex(0)
    setCompletedChallenges({ sopa: false, memoria: false, pelicula: false, puzzle: false, laberinto: false })
    setEarnedPoints({ sopa: 0, memoria: 0, pelicula: 0, puzzle: 0, laberinto: 0 })
    setWordSelection([])
    setFoundWords([])
    setScoredWords([])
    setWordTimeLeft(WORD_SEARCH_TIME)
    setMemoryCards(createMemoryDeck(activeMemoryItems))
    setFlippedCards([])
    setMemoryLocked(false)
    setMemoryTimeLeft(MEMORY_TIME)
    setGuessedLetters([])
    setWrongLetters([])
    setMovieRoundCompleted(false)
    setMovieRoundPoints(0)
    setMovieRoundsCompleted(0)
    setMovieTitlesCompleted([])
    setPuzzleDifficulty(null)
    setPuzzleTiles(createPuzzleOrder(PUZZLE_DIFFICULTY_SIZE.facil))
    setDraggedPuzzleIndex(null)
    setPuzzleMoves(0)
    setPuzzleTimeLeft(PUZZLE_TIME)
    setMazePosition(MAZE_START)
    setMazeMoves(0)
    setMazeTimeLeft(MAZE_TIME)
  }

  const activeChallenges = useMemo(
    () => CHALLENGES.filter((challenge) => challengeConfig.juegosActivos.includes(challenge.key)),
    [challengeConfig.juegosActivos]
  )
  const activeChallenge = activeChallenges[activeChallengeIndex]
  const activeWordSearchVariants = useMemo(
    () => buildConfiguredWordSearchVariants(challengeConfig.sopaPalabras),
    [challengeConfig.sopaPalabras]
  )
  const activeWordSearch = activeWordSearchVariants[wordSearchVariantIndex % activeWordSearchVariants.length]
  const activeWordSearchGrid = useMemo(
    () => buildWordSearchGrid(activeWordSearch),
    [activeWordSearch]
  )
  const fallbackMemoryItems = useMemo(
    () => wordsToMemoryItems(MEMORY_VARIANTS[memoryVariantIndex]),
    [memoryVariantIndex]
  )
  const hasSelectedLogoProfiles = challengeConfig.memoriaLogos.length > 0
  const canUseLogoMemory =
    challengeConfig.memoriaModo === "logos" &&
    logoMemoryItems.length >= (hasSelectedLogoProfiles ? 2 : MIN_LOGO_MEMORY_ITEMS)
  const activeMemoryItems = canUseLogoMemory
    ? logoMemoryItems.slice(0, MIN_LOGO_MEMORY_ITEMS)
    : fallbackMemoryItems
  const activeMemoryLabel = canUseLogoMemory
    ? "Logos de comercios y servicios"
    : activeMemoryItems.map((item) => item.label).join(" • ")
  const movieChallenge = MOVIE_CHALLENGES[movieChallengeIndex]
  const activePuzzleImages = normalizePuzzleImages(challengeConfig.puzzleImagenes)
  const puzzleImages = activePuzzleImages.length > 0 ? activePuzzleImages : DEFAULT_PUZZLE_IMAGES
  const activePuzzleImage = puzzleImages[puzzleVariantIndex % puzzleImages.length]
  const activePuzzleName =
    activePuzzleImages.length > 0
      ? `Imagen ${puzzleVariantIndex + 1}`
      : "Imagen Hola Varela"
  const activePuzzleSize = puzzleDifficulty
    ? PUZZLE_DIFFICULTY_SIZE[puzzleDifficulty]
    : PUZZLE_DIFFICULTY_SIZE.facil

  const assignNextChallengeSet = () => {
    resetChallengeAssignment({
      wordSearchVariantsCount: activeWordSearchVariants.length,
      memoryVariantsCount: MEMORY_VARIANTS.length,
      movieChallengesCount: MOVIE_CHALLENGES.length,
    })

    const nextAssignment = getChallengeAssignment({
      wordSearchVariantsCount: activeWordSearchVariants.length,
      memoryVariantsCount: MEMORY_VARIANTS.length,
      movieChallengesCount: MOVIE_CHALLENGES.length,
    })

    setWordSearchVariantIndex(nextAssignment.wordSearchVariantIndex)
    setWordSelection([])
    setFoundWords([])
    setScoredWords([])
    setWordTimeLeft(WORD_SEARCH_TIME)
    setMemoryVariantIndex(nextAssignment.memoryVariantIndex)
    setMemoryCards(createMemoryDeck(wordsToMemoryItems(MEMORY_VARIANTS[nextAssignment.memoryVariantIndex])))
    setFlippedCards([])
    setMemoryLocked(false)
    setMemoryTimeLeft(MEMORY_TIME)
    setMovieChallengeIndex(nextAssignment.movieChallengeIndex)
    setGuessedLetters([])
    setWrongLetters([])
    setMovieRoundCompleted(false)
    setMovieRoundPoints(0)
    setMovieRoundsCompleted(0)
    setMovieTitlesCompleted([])
    setPuzzleVariantIndex((current) => (current + 1) % puzzleImages.length)
    setPuzzleDifficulty(null)
    setPuzzleTiles(createPuzzleOrder(PUZZLE_DIFFICULTY_SIZE.facil))
    setDraggedPuzzleIndex(null)
    setPuzzleMoves(0)
    setPuzzleTimeLeft(PUZZLE_TIME)
    setMazePosition(MAZE_START)
    setMazeMoves(0)
    setMazeTimeLeft(MAZE_TIME)
  }

  const getWordFromSelection = (selection: number[]) =>
    selection
      .map((cellIndex) => {
      const row = Math.floor(cellIndex / activeWordSearchGrid[0].length)
      const col = cellIndex % activeWordSearchGrid[0].length
      return activeWordSearchGrid[row][col]
    })
    .join("")
  const selectedWord = getWordFromSelection(wordSelection)

  const movieAnswer = movieChallenge.title.replace(/\s/g, "")
  const maskedMovieWords = movieChallenge.title
    .split(" ")
    .map((word) =>
      word
        .split("")
        .map((character) => (guessedLetters.includes(character) ? character : "_"))
        .join(" ")
    )

  const totalPoints = useMemo(
    () => Object.values(earnedPoints).reduce((sum, value) => sum + value, 0),
    [earnedPoints]
  )

  const allChallengesCompleted = useMemo(
    () => activeChallenges.every((challenge) => completedChallenges[challenge.key]),
    [activeChallenges, completedChallenges]
  )

  const matchedCardsCount = memoryCards.filter((card) => card.matched).length
  const matchedPairs = matchedCardsCount / 2
  const wordSearchFinished = completedChallenges.sopa
  const wordSearchTimedOut = wordTimeLeft === 0
  const memoryFinished = completedChallenges.memoria || memoryTimeLeft === 0
  const movieFailed = !movieRoundCompleted && wrongLetters.length >= MAX_MOVIE_ERRORS
  const canPlayAnotherMovie = movieRoundCompleted && movieRoundsCompleted < MAX_MOVIE_ROUNDS
  const puzzleFinished = completedChallenges.puzzle || puzzleTimeLeft === 0
  const mazeFinished = completedChallenges.laberinto || mazeTimeLeft === 0

  useEffect(() => {
    let mounted = true

    const loadChallengeConfig = async () => {
      const fullConfigSelect =
        "activo, juegos_activos, sopa_palabras, memoria_modo, memoria_logos, puzzle_imagenes, slug, titulo"
      const legacyConfigSelect =
        "activo, juegos_activos, sopa_palabras, memoria_modo, puzzle_imagenes, slug, titulo"
      let configResult = challengeSlug
        ? await supabase
            .from("desafio_ediciones")
            .select(fullConfigSelect)
            .eq("slug", challengeSlug)
            .maybeSingle()
        : await supabase
            .from("desafio_config")
            .select(fullConfigSelect)
            .eq("id", 1)
            .maybeSingle()

      if (
        configResult.error?.code === "42703" &&
        configResult.error.message?.includes("memoria_logos")
      ) {
        configResult = challengeSlug
          ? await supabase
              .from("desafio_ediciones")
              .select(legacyConfigSelect)
              .eq("slug", challengeSlug)
              .maybeSingle()
          : await supabase
              .from("desafio_config")
              .select(legacyConfigSelect)
              .eq("id", 1)
              .maybeSingle()
      }

      const { data, error } = configResult

      if (!mounted) return

      if (error) {
        if (challengeSlug && isMissingChallengesSchemaError(error)) {
          let fallbackResult = await supabase
            .from("desafio_config")
            .select(fullConfigSelect)
            .eq("slug", challengeSlug)
            .maybeSingle()

          if (
            fallbackResult.error?.code === "42703" &&
            fallbackResult.error.message?.includes("memoria_logos")
          ) {
            fallbackResult = await supabase
              .from("desafio_config")
              .select(legacyConfigSelect)
              .eq("slug", challengeSlug)
              .maybeSingle()
          }

          const { data: fallbackData, error: fallbackError } = fallbackResult

          if (!mounted) return

          if (!fallbackError && fallbackData) {
            setChallengeConfig({
              activo: fallbackData.activo !== false,
              juegosActivos: normalizeChallengeKeys(fallbackData.juegos_activos),
              sopaPalabras: normalizeWordSearchWords(fallbackData.sopa_palabras),
              memoriaModo: normalizeMemoryMode(fallbackData.memoria_modo),
              memoriaLogos: normalizeMemoryLogoProfiles(fallbackData.memoria_logos),
              puzzleImagenes: normalizePuzzleImages(fallbackData.puzzle_imagenes),
              slug: fallbackData.slug || undefined,
              titulo: fallbackData.titulo || undefined,
            })
            resetChallengeProgress()
            setStage("intro")
            setConfigLoading(false)
            return
          }
        }

        if (!isMissingChallengesSchemaError(error)) {
          setSubmitError("No se pudo cargar la configuracion del desafio.")
        }
        setConfigLoading(false)
        return
      }

      setChallengeConfig({
        activo: data?.activo !== false,
        juegosActivos: normalizeChallengeKeys(data?.juegos_activos),
        sopaPalabras: normalizeWordSearchWords(data?.sopa_palabras),
        memoriaModo: normalizeMemoryMode(data?.memoria_modo),
        memoriaLogos: normalizeMemoryLogoProfiles(data?.memoria_logos),
        puzzleImagenes: normalizePuzzleImages(data?.puzzle_imagenes),
        slug: data?.slug || undefined,
        titulo: data?.titulo || undefined,
      })
      resetChallengeProgress()
      setStage("intro")
      setConfigLoading(false)
    }

    void loadChallengeConfig()

    return () => {
      mounted = false
    }
  }, [challengeSlug])

  useEffect(() => {
    if (challengeConfig.memoriaModo !== "logos") {
      setLogoMemoryItems([])
      setMemoryCards(createMemoryDeck(fallbackMemoryItems))
      return
    }

    let mounted = true

    const loadLogoMemoryItems = async () => {
      const selectedLogoProfiles = normalizeMemoryLogoProfiles(challengeConfig.memoriaLogos)
      const selectedCommerceIds = selectedLogoProfiles
        .filter((item) => item.startsWith("comercio:"))
        .map((item) => Number(item.split(":")[1]))
      const selectedServiceIds = selectedLogoProfiles
        .filter((item) => item.startsWith("servicio:"))
        .map((item) => Number(item.split(":")[1]))
      const hasSelectedProfiles = selectedLogoProfiles.length > 0
      const buildCommerceQuery = (withImageUrl: boolean) => {
        let query = supabase
          .from("comercios")
          .select(withImageUrl ? "id, nombre, imagen, imagen_url" : "id, nombre, imagen")
          .or("estado.is.null,estado.eq.activo")
          .order("id", { ascending: false })
          .limit(24)

        if (hasSelectedProfiles) {
          query =
            selectedCommerceIds.length > 0
              ? query.in("id", selectedCommerceIds)
              : query.eq("id", -1)
        }

        return query
      }
      let serviceQuery = supabase
        .from("servicios")
        .select("id, nombre, imagen")
        .or("estado.is.null,estado.eq.activo")
        .order("id", { ascending: false })
        .limit(24)

      if (hasSelectedProfiles) {
        serviceQuery =
          selectedServiceIds.length > 0
            ? serviceQuery.in("id", selectedServiceIds)
            : serviceQuery.eq("id", -1)
      }

      const [commerceResult, { data: servicios }] = await Promise.all([
        buildCommerceQuery(true),
        serviceQuery,
      ])
      const commerceFallback =
        commerceResult.error?.code === "42703" ||
        commerceResult.error?.message?.includes("imagen_url")
          ? await buildCommerceQuery(false)
          : commerceResult

      if (!mounted) return

      const comercioItems = ((commerceFallback.data || []) as Array<Record<string, unknown>>)
        .map((item) => ({
          id: `comercio-${item.id}`,
          label: String(item.nombre || "Comercio"),
          imageUrl: String(item.imagen_url || item.imagen || ""),
          sourceLabel: "Comercio",
        }))
        .filter((item) => item.imageUrl)

      const servicioItems = ((servicios || []) as Array<Record<string, unknown>>)
        .map((item) => ({
          id: `servicio-${item.id}`,
          label: String(item.nombre || "Servicio"),
          imageUrl: String(item.imagen || ""),
          sourceLabel: "Servicio",
        }))
        .filter((item) => item.imageUrl)

      const nextItems = shuffleArray([...comercioItems, ...servicioItems]).slice(0, MIN_LOGO_MEMORY_ITEMS)
      setLogoMemoryItems(nextItems)
      setMemoryCards(
        createMemoryDeck(
          nextItems.length >= (hasSelectedProfiles ? 2 : MIN_LOGO_MEMORY_ITEMS)
            ? nextItems
            : fallbackMemoryItems
        )
      )
      setFlippedCards([])
      setMemoryLocked(false)
    }

    void loadLogoMemoryItems()

    return () => {
      mounted = false
    }
  }, [challengeConfig.memoriaLogos, challengeConfig.memoriaModo, fallbackMemoryItems])

  useEffect(() => {
    if (stage !== "play" || activeChallenge?.key !== "sopa") return
    if (wordSearchTimedOut) return

    const intervalId = window.setInterval(() => {
      setWordTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
          setCompletedChallenges((prev) => ({ ...prev, sopa: true }))
          setEarnedPoints((prev) => ({ ...prev, sopa: 0 }))
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [activeChallenge?.key, completedChallenges.sopa, stage, wordSearchTimedOut])

  useEffect(() => {
    if (stage !== "play" || activeChallenge?.key !== "memoria") return
    if (memoryFinished) return

    const intervalId = window.setInterval(() => {
      setMemoryTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
          setFlippedCards([])
          setMemoryLocked(false)
          setCompletedChallenges((prev) => ({ ...prev, memoria: true }))
          setEarnedPoints((prev) => ({ ...prev, memoria: 0 }))
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [activeChallenge?.key, memoryFinished, stage])

  useEffect(() => {
    if (stage !== "play" || activeChallenge?.key !== "puzzle") return
    if (!puzzleDifficulty) return
    if (puzzleFinished) return

    const intervalId = window.setInterval(() => {
      setPuzzleTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
          setCompletedChallenges((prev) => ({ ...prev, puzzle: true }))
          setEarnedPoints((prev) => ({ ...prev, puzzle: 0 }))
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [activeChallenge?.key, puzzleDifficulty, puzzleFinished, stage])

  useEffect(() => {
    if (stage !== "play" || activeChallenge?.key !== "laberinto") return
    if (mazeFinished) return

    const intervalId = window.setInterval(() => {
      setMazeTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
          setCompletedChallenges((prev) => ({ ...prev, laberinto: true }))
          setEarnedPoints((prev) => ({ ...prev, laberinto: 0 }))
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [activeChallenge?.key, mazeFinished, stage])

  const handleWordCellToggle = (cellIndex: number) => {
    if (wordSearchFinished || completedChallenges.sopa) return

    setWordSelection((current) => {
      if (current.length === 0) {
        return [cellIndex]
      }

      const lastSelectedIndex = current[current.length - 1]

      if (cellIndex === lastSelectedIndex) {
        return current.slice(0, -1)
      }

      const columnCount = activeWordSearchGrid[0].length
      return addCellToWordSelection(current, cellIndex, columnCount, {
        allowBacktrack: true,
      })
    })
  }

  const validateWordSelection = (selection: number[]) => {
    const wordToCheck = getWordFromSelection(selection)
    if (!wordToCheck) {
      setWordSelection([])
      return
    }

    const normalizedWord = wordToCheck.toUpperCase()
    const reversedWord = normalizedWord.split("").reverse().join("")
    const matchedWord = activeWordSearch.targets.find(
      (word) => !foundWords.includes(word) && (word === normalizedWord || word === reversedWord)
    )

    if (matchedWord) {
      const nextFoundWords = [...foundWords, matchedWord]
      setFoundWords(nextFoundWords)

      if (!wordSearchTimedOut) {
        setScoredWords((current) =>
          current.includes(matchedWord) ? current : [...current, matchedWord]
        )
      }

      if (nextFoundWords.length === activeWordSearch.targets.length) {
        const soupPoints =
          scoredWords
            .concat(!wordSearchTimedOut && !scoredWords.includes(matchedWord) ? [matchedWord] : [])
            .reduce((total, word) => total + word.length * 5, 0) +
          wordTimeLeft

        setCompletedChallenges((prev) => ({ ...prev, sopa: true }))
        setEarnedPoints((prev) => ({ ...prev, sopa: soupPoints }))
      }
    }

    setWordSelection([])
  }

  const handleCheckWord = () => {
    validateWordSelection(wordSelection)
  }

  const handleStartWordSelection = (cellIndex: number) => {
    if (wordSearchFinished || completedChallenges.sopa) return
    setWordSelection([cellIndex])
  }

  const handleExtendWordSelection = (cellIndex: number) => {
    if (wordSearchFinished || completedChallenges.sopa) return

    setWordSelection((current) =>
      addCellToWordSelection(current, cellIndex, activeWordSearchGrid[0].length, {
        allowBacktrack: true,
      })
    )
  }

  const handleAutoCheckWordSelection = (selection: number[]) => {
    if (wordSearchFinished || completedChallenges.sopa) return
    validateWordSelection(selection)
  }

  const resetWordSearch = () => {
    setWordSelection([])
    setFoundWords([])
    setScoredWords([])
    setWordTimeLeft(WORD_SEARCH_TIME)
    setCompletedChallenges((prev) => ({ ...prev, sopa: false }))
    setEarnedPoints((prev) => ({ ...prev, sopa: 0 }))
  }

  const handleFlipCard = (index: number) => {
    if (memoryFinished) return
    if (memoryLocked || flippedCards.includes(index) || memoryCards[index]?.matched) return
    if (flippedCards.length >= 2) return

    if (flippedCards.length === 0) {
      setFlippedCards([index])
      return
    }

    const firstIndex = flippedCards[0]
    const firstCard = memoryCards[firstIndex]
    const secondCard = memoryCards[index]

    if (!firstCard || !secondCard) {
      setFlippedCards([])
      return
    }

    if (firstCard.matchKey === secondCard.matchKey) {
      const nextCards = memoryCards.map((card, cardIndex) =>
        cardIndex === firstIndex || cardIndex === index
          ? { ...card, matched: true }
          : card
      )

      setMemoryCards(nextCards)
      setFlippedCards([])

      if (nextCards.every((card) => card.matched)) {
        const memoryPoints =
          (CHALLENGES.find((challenge) => challenge.key === "memoria")?.points || 0) +
          memoryTimeLeft +
          activeMemoryItems.reduce((sum, item) => sum + item.label.length, 0)

        setCompletedChallenges((prev) => ({ ...prev, memoria: true }))
        setEarnedPoints((prev) => ({
          ...prev,
          memoria: memoryPoints,
        }))
      }
      return
    }

    setFlippedCards([firstIndex, index])
    setMemoryLocked(true)
    window.setTimeout(() => {
      setFlippedCards([])
      setMemoryLocked(false)
    }, 700)
  }

  const resetMemoryGame = () => {
    setMemoryCards(createMemoryDeck(activeMemoryItems))
    setFlippedCards([])
    setMemoryLocked(false)
    setMemoryTimeLeft(MEMORY_TIME)
    setCompletedChallenges((prev) => ({ ...prev, memoria: false }))
    setEarnedPoints((prev) => ({ ...prev, memoria: 0 }))
  }

  const handleGuessLetter = (letter: string) => {
    if (movieRoundCompleted || movieFailed) return
    if (guessedLetters.includes(letter) || wrongLetters.includes(letter)) return

    if (movieAnswer.includes(letter)) {
      const nextGuessedLetters = [...guessedLetters, letter]
      setGuessedLetters(nextGuessedLetters)

      const solved = movieAnswer
        .split("")
        .every((character) => nextGuessedLetters.includes(character))

      if (solved) {
        const moviePoints =
          (CHALLENGES.find((challenge) => challenge.key === "pelicula")?.points || 0) +
          Math.max(0, MAX_MOVIE_ERRORS - wrongLetters.length) * 4 +
          movieAnswer.length

        setMovieRoundCompleted(true)
        setMovieRoundPoints(moviePoints)
        setMovieRoundsCompleted((current) => current + 1)
        setMovieTitlesCompleted((current) => [...current, movieChallenge.title])
        setCompletedChallenges((prev) => ({ ...prev, pelicula: true }))
        setEarnedPoints((prev) => ({
          ...prev,
          pelicula: prev.pelicula + moviePoints,
        }))
      }
      return
    }

    setWrongLetters((current) => {
      const nextWrongLetters = [...current, letter]
      if (nextWrongLetters.length >= MAX_MOVIE_ERRORS) {
        setCompletedChallenges((prev) => ({ ...prev, pelicula: true }))
      }
      return nextWrongLetters
    })
  }

  const resetMovieGame = () => {
    setMovieChallengeIndex((current) =>
      getNextDifferentMovieIndex(current, MOVIE_CHALLENGES.length)
    )
    setGuessedLetters([])
    setWrongLetters([])
    setMovieRoundCompleted(false)
    setMovieRoundPoints(0)
  }

  const handlePlayAnotherMovie = () => {
    if (!canPlayAnotherMovie) return

    setMovieChallengeIndex((current) =>
      getNextDifferentMovieIndex(current, MOVIE_CHALLENGES.length)
    )
    setGuessedLetters([])
    setWrongLetters([])
    setMovieRoundCompleted(false)
    setMovieRoundPoints(0)
  }

  const handleSelectPuzzleDifficulty = (difficulty: PuzzleDifficulty) => {
    if (puzzleFinished) return

    const size = PUZZLE_DIFFICULTY_SIZE[difficulty]
    setPuzzleDifficulty(difficulty)
    setPuzzleTiles(createPuzzleOrder(size))
    setDraggedPuzzleIndex(null)
    setPuzzleMoves(0)
    setPuzzleTimeLeft(PUZZLE_TIME)
    setCompletedChallenges((prev) => ({ ...prev, puzzle: false }))
    setEarnedPoints((prev) => ({ ...prev, puzzle: 0 }))
  }

  const handlePuzzleSwap = (fromIndex: number, toIndex: number) => {
    if (puzzleFinished || !puzzleDifficulty) return
    if (fromIndex === toIndex) return

    const nextTiles = [...puzzleTiles]
    ;[nextTiles[fromIndex], nextTiles[toIndex]] = [nextTiles[toIndex], nextTiles[fromIndex]]
    const nextMoves = puzzleMoves + 1

    setPuzzleTiles(nextTiles)
    setPuzzleMoves(nextMoves)
    setDraggedPuzzleIndex(null)

    if (isPuzzleSolved(nextTiles)) {
      const puzzlePoints =
        (CHALLENGES.find((challenge) => challenge.key === "puzzle")?.points || 0) +
        puzzleTimeLeft +
        (puzzleDifficulty === "dificil" ? 40 : 20) +
        Math.max(0, 60 - nextMoves * 2)

      setCompletedChallenges((prev) => ({ ...prev, puzzle: true }))
      setEarnedPoints((prev) => ({ ...prev, puzzle: puzzlePoints }))
    }
  }

  const resetPuzzleGame = () => {
    setPuzzleDifficulty(null)
    setPuzzleTiles(createPuzzleOrder(PUZZLE_DIFFICULTY_SIZE.facil))
    setDraggedPuzzleIndex(null)
    setPuzzleMoves(0)
    setPuzzleTimeLeft(PUZZLE_TIME)
    setCompletedChallenges((prev) => ({ ...prev, puzzle: false }))
    setEarnedPoints((prev) => ({ ...prev, puzzle: 0 }))
  }

  const handleMazeMove = (rowStep: number, colStep: number) => {
    if (mazeFinished) return

    const nextPosition = {
      row: mazePosition.row + rowStep,
      col: mazePosition.col + colStep,
    }

    if (!isMazeWalkable(nextPosition.row, nextPosition.col)) return

    const nextMoves = mazeMoves + 1
    setMazePosition(nextPosition)
    setMazeMoves(nextMoves)

    if (getMazeCell(nextPosition.row, nextPosition.col) === "G") {
      const mazePoints =
        (CHALLENGES.find((challenge) => challenge.key === "laberinto")?.points || 0) +
        mazeTimeLeft +
        Math.max(0, 50 - nextMoves * 2)

      setCompletedChallenges((prev) => ({ ...prev, laberinto: true }))
      setEarnedPoints((prev) => ({ ...prev, laberinto: mazePoints }))
    }
  }

  const resetMazeGame = () => {
    setMazePosition(MAZE_START)
    setMazeMoves(0)
    setMazeTimeLeft(MAZE_TIME)
    setCompletedChallenges((prev) => ({ ...prev, laberinto: false }))
    setEarnedPoints((prev) => ({ ...prev, laberinto: 0 }))
  }

  const handleContinue = () => {
    if (activeChallengeIndex < activeChallenges.length - 1) {
      setActiveChallengeIndex((current) => current + 1)
      return
    }
    setStage("form")
  }

  const handleSubmitEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!allChallengesCompleted) return
    if (!participantName.trim() || !participantPhone.trim()) return
    setSubmitLoading(true)
    setSubmitError("")

    const browserKey = getChallengeBrowserKey()
    const { error } = await supabase.from("desafio_participaciones").insert([
      {
        browser_key: browserKey,
        desafio_slug: challengeConfig.slug || challengeSlug || null,
        nombre: participantName.trim(),
        telefono: participantPhone.trim(),
        puntaje_total: totalPoints,
        puntos_sopa: earnedPoints.sopa,
        puntos_memoria: earnedPoints.memoria,
        puntos_pelicula: earnedPoints.pelicula,
        puntos_puzzle: earnedPoints.puzzle,
        puntos_laberinto: earnedPoints.laberinto,
        sopa_nombre: activeWordSearch.name,
        memoria_nombre: `Memoria ${memoryVariantIndex + 1}`,
        pelicula_nombre: movieTitlesCompleted.join(" | "),
        puzzle_nombre: `${activePuzzleName}${puzzleDifficulty ? ` (${puzzleDifficulty})` : ""}`,
        laberinto_nombre: "Laberinto Varela",
      },
    ])

    if (error) {
      if (isMissingChallengesSchemaError(error)) {
        setSubmitError("Falta crear la tabla de desafios en Supabase para guardar participantes.")
      } else {
        setSubmitError(`No se pudo guardar la participacion: ${error.message}`)
      }
      setSubmitLoading(false)
      return
    }

    assignNextChallengeSet()
    setSubmitLoading(false)
    setStage("done")
  }

  if (configLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff2d9_0%,#fffdf8_28%,#e9f7ff_64%,#f9fcff_100%)] text-slate-950">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10">
          <div className="w-full rounded-[28px] border border-white/80 bg-white/90 p-8 text-center shadow-sm">
            <div className="text-sm font-semibold text-slate-500">Cargando desafio...</div>
          </div>
        </div>
      </main>
    )
  }

  if (!challengeConfig.activo || activeChallenges.length === 0) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff2d9_0%,#fffdf8_28%,#e9f7ff_64%,#f9fcff_100%)] text-slate-950">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10">
          <div className="w-full rounded-[28px] border border-white/80 bg-white/90 p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Gift className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
              El desafio no esta activo.
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Pronto vamos a publicar una nueva actividad para jugar y participar por premios.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Hola Varela
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const selectedChallengeLevel = CHALLENGE_LEVEL_OPTIONS.find(
    (option) => option.key === challengeLevel
  )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff2d9_0%,#fffdf8_28%,#e9f7ff_64%,#f9fcff_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700">
            <ArrowLeft className="h-4 w-4" />
            Volver a Hola Varela
          </Link>
        </div>

        <section className="overflow-hidden rounded-[34px] border border-white/80 bg-white/85 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.32)] backdrop-blur">
          <div className={stage === "intro" ? "grid gap-0" : "grid gap-0 lg:grid-cols-[0.95fr_1.05fr]"}>
            <div className="bg-[linear-gradient(160deg,#0f172a_0%,#0b4ea2_45%,#0ea5e9_100%)] p-6 text-white sm:p-8 lg:p-10">
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">
                Hola Varela en eventos
              </div>
              <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Desafíos cortos, jugá y ganá.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-sky-50/90 sm:text-lg">
                Acumula puntos y participa de ganar premios.
              </p>
              {selectedChallengeLevel && stage !== "intro" ? (
                <div className="mt-5 inline-flex rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-semibold text-sky-50">
                  Nivel {selectedChallengeLevel.title}
                </div>
              ) : null}
              {stage !== "intro" ? (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {activeChallenges.map((challenge, index) => (
                  <div key={challenge.key} className={`min-w-0 rounded-[24px] border px-4 py-4 ${completedChallenges[challenge.key] ? "border-emerald-300/40 bg-emerald-400/15" : activeChallengeIndex === index && stage === "play" ? "border-white/30 bg-white/10" : "border-white/10 bg-black/10"}`}>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100/80">
                      Desafío {index + 1}
                    </div>
                    <div className="mt-2 flex min-w-0 items-start gap-2 text-lg font-semibold leading-7">
                      {completedChallenges[challenge.key] ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : null}
                      <span className="min-w-0 break-words">{challenge.title}</span>
                    </div>
                    <div className="mt-2 text-sm text-sky-50/80">{challenge.points} pts base</div>
                  </div>
                ))}
              </div>
              ) : null}

              {stage === "intro" ? (
                <div className="mt-8">
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-100">
                    Seleccionar nivel
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {CHALLENGE_LEVEL_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setChallengeLevel(option.key)
                          setStage("play")
                        }}
                        className="rounded-2xl border border-white/25 bg-white/12 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
                      >
                        <span className="block text-lg font-semibold text-white">
                          {option.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {stage !== "intro" ? (
            <div className="p-6 sm:p-8 lg:p-10">
              {stage === "play" && activeChallenge?.key === "sopa" ? (
                <WordSearchPanel
                  challengeNumber={activeChallengeIndex + 1}
                  variantName={activeWordSearch.name}
                  grid={activeWordSearchGrid}
                  targets={activeWordSearch.targets}
                  selectedWord={selectedWord}
                  wordSelection={wordSelection}
                  foundWords={foundWords}
                  timeLeft={wordTimeLeft}
                  completed={completedChallenges.sopa}
                  finished={wordSearchFinished}
                  onToggleCell={handleWordCellToggle}
                  onStartSelection={handleStartWordSelection}
                  onExtendSelection={handleExtendWordSelection}
                  onAutoCheckSelection={handleAutoCheckWordSelection}
                  onCheckWord={handleCheckWord}
                  onClear={() => setWordSelection([])}
                  onReset={resetWordSearch}
                  earnedPoints={earnedPoints.sopa}
                />
              ) : null}
              {stage === "play" && activeChallenge?.key === "memoria" ? (
                <MemoryPanel
                  challengeNumber={activeChallengeIndex + 1}
                  cards={memoryCards}
                  variantLabel={activeMemoryLabel}
                  flippedCards={flippedCards}
                  matchedPairs={matchedPairs}
                  totalPairs={memoryCards.length / 2}
                  timeLeft={memoryTimeLeft}
                  completed={completedChallenges.memoria}
                  finished={memoryFinished}
                  earnedPoints={earnedPoints.memoria}
                  onFlipCard={handleFlipCard}
                  onReset={resetMemoryGame}
                />
              ) : null}
              {stage === "play" && activeChallenge?.key === "pelicula" ? (
                <MoviePanel
                  challengeNumber={activeChallengeIndex + 1}
                  hint={movieChallenge.hint}
                  maskedWords={maskedMovieWords}
                  guessedLetters={guessedLetters}
                  wrongLetters={wrongLetters}
                  completed={movieRoundCompleted}
                  failed={movieFailed}
                  earnedPoints={earnedPoints.pelicula}
                  movieRoundPoints={movieRoundPoints}
                  movieRoundsCompleted={movieRoundsCompleted}
                  maxMovieRounds={MAX_MOVIE_ROUNDS}
                  canPlayAnotherMovie={canPlayAnotherMovie}
                  onGuessLetter={handleGuessLetter}
                  onReset={resetMovieGame}
                  onPlayAnotherMovie={handlePlayAnotherMovie}
                  onFinish={handleContinue}
                />
              ) : null}
              {stage === "play" && activeChallenge?.key === "puzzle" ? (
                <PuzzlePanel
                  challengeNumber={activeChallengeIndex + 1}
                  variantName={activePuzzleName}
                  imageUrl={activePuzzleImage}
                  difficulty={puzzleDifficulty}
                  draggedIndex={draggedPuzzleIndex}
                  size={activePuzzleSize}
                  tiles={puzzleTiles}
                  moves={puzzleMoves}
                  timeLeft={puzzleTimeLeft}
                  completed={completedChallenges.puzzle}
                  finished={puzzleFinished}
                  earnedPoints={earnedPoints.puzzle}
                  onSelectDifficulty={handleSelectPuzzleDifficulty}
                  onDragStart={setDraggedPuzzleIndex}
                  onSwapTiles={handlePuzzleSwap}
                  onReset={resetPuzzleGame}
                />
              ) : null}
              {stage === "play" && activeChallenge?.key === "laberinto" ? (
                <MazePanel
                  challengeNumber={activeChallengeIndex + 1}
                  layout={MAZE_LAYOUT}
                  position={mazePosition}
                  moves={mazeMoves}
                  timeLeft={mazeTimeLeft}
                  completed={completedChallenges.laberinto}
                  finished={mazeFinished}
                  earnedPoints={earnedPoints.laberinto}
                  onMove={handleMazeMove}
                  onReset={resetMazeGame}
                />
              ) : null}
              {stage === "form" ? (
                <EntryFormPanel
                  totalPoints={totalPoints}
                  challengeCount={activeChallenges.length}
                  participantName={participantName}
                  participantPhone={participantPhone}
                  submitError={submitError}
                  submitLoading={submitLoading}
                  onNameChange={setParticipantName}
                  onPhoneChange={(value) => setParticipantPhone(formatPhone(value))}
                  onSubmit={handleSubmitEntry}
                />
              ) : null}
              {stage === "done" ? (
                <DonePanel
                  participantName={participantName}
                  participantPhone={participantPhone}
                  totalPoints={totalPoints}
                />
              ) : null}

              {stage === "play" ? (
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
                  <div className="text-sm text-slate-500">
                    Puntaje acumulado: <span className="font-semibold text-slate-900">{totalPoints}</span>
                  </div>
                  {activeChallenge?.key !== "pelicula" || !movieRoundCompleted ? (
                    <button
                      type="button"
                      onClick={handleContinue}
                      disabled={!activeChallenge || !completedChallenges[activeChallenge.key]}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {activeChallengeIndex === activeChallenges.length - 1 ? "Terminar" : "Continuar"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}

function IntroPanel({
  challengeCount,
  onStart,
}: {
  challengeCount: number
  onStart: () => void
}) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
          Bienvenida
        </div>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
          Primero conoce Hola Varela, despues juga y suma puntos.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
          Hola Varela es una web para descubrir comercios, servicios, cursos, eventos y oportunidades cerca tuyo.
          En esta experiencia vas a conocer la plataforma y despues vas a jugar desafios cortos para acumular puntos.
        </p>
        <div className="mt-8 grid gap-4">
          {[
            "Conoces todo lo que puedes encontrar en Hola Varela",
            `Juegas ${challengeCount} desafio${challengeCount === 1 ? "" : "s"} corto${challengeCount === 1 ? "" : "s"} desde tu celular`,
            "Acumulas puntos para participar por premios",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700">
              <Star className="h-4 w-4 text-amber-500" />
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-sky-600"
        >
          Comenzar
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function WordSearchPanel(props: {
  challengeNumber: number
  variantName: string
  grid: string[][]
  targets: string[]
  selectedWord: string
  wordSelection: number[]
  foundWords: string[]
  timeLeft: number
  completed: boolean
  finished: boolean
  onToggleCell: (index: number) => void
  onStartSelection: (index: number) => void
  onExtendSelection: (index: number) => void
  onAutoCheckSelection: (selection: number[]) => void
  onCheckWord: () => void
  onClear: () => void
  onReset: () => void
  earnedPoints: number
}) {
  const isDraggingSelectionRef = useRef(false)
  const suppressNextClickRef = useRef(false)
  const dragSelectionRef = useRef<number[]>(props.wordSelection)

  useEffect(() => {
    if (!isDraggingSelectionRef.current) {
      dragSelectionRef.current = props.wordSelection
    }
  }, [props.wordSelection])

  const extendDragSelection = (cellIndex: number) => {
    const nextSelection = addCellToWordSelection(
      dragSelectionRef.current,
      cellIndex,
      props.grid[0].length,
      { allowBacktrack: true }
    )

    if (nextSelection === dragSelectionRef.current) return

    dragSelectionRef.current = nextSelection
    props.onExtendSelection(cellIndex)
  }

  const finishDragSelection = () => {
    if (!isDraggingSelectionRef.current) return

    isDraggingSelectionRef.current = false
    props.onAutoCheckSelection(dragSelectionRef.current)
    dragSelectionRef.current = []
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Desafío {props.challengeNumber}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            Sopa de letras
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
          <Clock3 className="h-4 w-4 text-rose-500" />
          {props.timeLeft}s
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600">
        Variante: {props.variantName}. Encuentra: {props.targets.join(", ")}. Puedes marcarlas en linea recta, horizontal, vertical o diagonal.
      </p>

      <div
        className="mt-6 grid w-full max-w-[480px] touch-none select-none gap-2"
        style={{ gridTemplateColumns: `repeat(${props.grid[0].length}, minmax(0, 1fr))` }}
        onPointerMove={(event) => {
          if (!isDraggingSelectionRef.current) return

          event.preventDefault()
          const element = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLElement>("[data-word-cell-index]")
          const cellIndex = Number(element?.dataset.wordCellIndex)

          if (Number.isInteger(cellIndex)) {
            extendDragSelection(cellIndex)
          }
        }}
        onPointerUp={finishDragSelection}
        onPointerCancel={finishDragSelection}
      >
        {props.grid.flat().map((letter, index) => (
          <button
            key={`${letter}-${index}`}
            type="button"
            data-word-cell-index={index}
            onPointerDown={(event) => {
              if (props.finished || props.completed) return

              event.preventDefault()
              event.currentTarget.setPointerCapture(event.pointerId)
              isDraggingSelectionRef.current = true
              suppressNextClickRef.current = true
              dragSelectionRef.current = [index]
              props.onStartSelection(index)
            }}
            onClick={() => {
              if (suppressNextClickRef.current) {
                suppressNextClickRef.current = false
                return
              }

              props.onToggleCell(index)
            }}
            className={`aspect-square touch-none rounded-2xl border text-lg font-semibold transition ${
              props.wordSelection.includes(index)
                ? "border-sky-500 bg-sky-500 text-white"
                : "border-slate-200 bg-slate-50 text-slate-800 hover:border-sky-300 hover:bg-sky-50"
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        Seleccion actual: <span className="font-semibold">{props.selectedWord || "-"}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={props.onCheckWord}
          disabled={!props.selectedWord || props.finished}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Validar palabra
        </button>
        <button type="button" onClick={props.onClear} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
          Limpiar
        </button>
        <button type="button" onClick={props.onReset} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
          <RefreshCcw className="h-4 w-4" />
          Reiniciar
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {props.targets.map((word) => (
          <div key={word} className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${props.foundWords.includes(word) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {word}
          </div>
        ))}
      </div>

      {props.completed && props.earnedPoints > 0 ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-800">
          Desafío completado. Sumaste {props.earnedPoints} puntos.
        </div>
      ) : null}
      {props.finished && props.earnedPoints === 0 ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-7 text-rose-700">
          Se termino el tiempo. Puedes continuar sin puntos o reiniciar este desafio.
        </div>
      ) : null}
    </div>
  )
}

function MemoryPanel(props: {
  challengeNumber: number
  cards: MemoryCard[]
  variantLabel: string
  flippedCards: number[]
  matchedPairs: number
  totalPairs: number
  timeLeft: number
  completed: boolean
  finished: boolean
  earnedPoints: number
  onFlipCard: (index: number) => void
  onReset: () => void
}) {
  const usesLogoCards = props.cards.some((card) => Boolean(card.imageUrl))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Desafío {props.challengeNumber}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            Juego de memoria
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
          <Clock3 className="h-4 w-4 text-rose-500" />
          {props.timeLeft}s
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        Encuentra todas las parejas antes de que se acabe el tiempo.
      </p>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
        {usesLogoCards ? "Logos de esta ronda" : "Palabras de esta ronda"}: {props.variantLabel}
      </div>
      <div className="mt-6 grid max-w-[560px] grid-cols-3 gap-3 sm:grid-cols-4">
        {props.cards.map((card, index) => {
          const isVisible = card.matched || props.flippedCards.includes(index)
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => props.onFlipCard(index)}
              className={`aspect-[4/5] rounded-[24px] border text-sm font-semibold transition ${
                isVisible
                  ? "border-sky-300 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-400 hover:border-sky-300 hover:bg-sky-50"
              }`}
            >
              {isVisible ? (
                card.imageUrl ? (
                  <span className="flex h-full flex-col items-center justify-center gap-2 p-2">
                    <span className="flex h-16 w-full items-center justify-center overflow-hidden rounded-2xl bg-white sm:h-20">
                      <img
                        src={card.imageUrl}
                        alt={card.value}
                        className="h-full w-full object-contain"
                      />
                    </span>
                    <span className="line-clamp-2 px-1 text-center text-xs leading-4 text-slate-700">
                      {card.value}
                    </span>
                  </span>
                ) : (
                  card.value
                )
              ) : (
                "?"
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
          Parejas: {props.matchedPairs} / {props.totalPairs}
        </div>
        <button type="button" onClick={props.onReset} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
          <RefreshCcw className="h-4 w-4" />
          Reiniciar
        </button>
      </div>
      {props.completed && props.earnedPoints > 0 ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-800">
          Memoria completada. Sumaste {props.earnedPoints} puntos.
        </div>
      ) : null}
      {props.finished && props.earnedPoints === 0 ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-7 text-rose-700">
          Se termino el tiempo. Puedes continuar sin puntos o reiniciar este desafio.
        </div>
      ) : null}
    </div>
  )
}

function MoviePanel(props: {
  challengeNumber: number
  hint: string
  maskedWords: string[]
  guessedLetters: string[]
  wrongLetters: string[]
  completed: boolean
  failed: boolean
  earnedPoints: number
  movieRoundPoints: number
  movieRoundsCompleted: number
  maxMovieRounds: number
  canPlayAnotherMovie: boolean
  onGuessLetter: (letter: string) => void
  onReset: () => void
  onPlayAnotherMovie: () => void
  onFinish: () => void
}) {
  return (
    <div>
      <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
        Desafío {props.challengeNumber}
      </div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        Adivina la película
      </h2>
      <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
        Pista: {props.hint}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-x-7 gap-y-3 rounded-[28px] border border-slate-200 bg-slate-950 px-5 py-6 text-center text-2xl font-semibold text-white sm:gap-x-10 sm:text-3xl">
        {props.maskedWords.map((word, index) => (
          <span
            key={`${word}-${index}`}
            className="inline-block tracking-[0.2em]"
          >
            {word}
          </span>
        ))}
      </div>
      <div className="mt-5 rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
        Errores: {props.wrongLetters.length} / {MAX_MOVIE_ERRORS}
      </div>
      <div className="mt-6 grid grid-cols-6 gap-2 sm:grid-cols-7">
        {ALPHABET.map((letter) => {
          const used = props.guessedLetters.includes(letter) || props.wrongLetters.includes(letter)
          return (
            <button
              key={letter}
              type="button"
              onClick={() => props.onGuessLetter(letter)}
              disabled={used || props.completed || props.failed}
              className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                props.guessedLetters.includes(letter)
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : props.wrongLetters.includes(letter)
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              {letter}
            </button>
          )
        })}
      </div>
      <div className="mt-6">
        {!props.completed ? (
          <button type="button" onClick={props.onReset} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            <RefreshCcw className="h-4 w-4" />
            Cambiar película
          </button>
        ) : null}
      </div>
      {props.completed ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-800">
          Adivinanza resuelta. Sumaste {props.movieRoundPoints} puntos en esta película y llevas {props.earnedPoints} en total.
        </div>
      ) : null}
      {props.completed ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {props.canPlayAnotherMovie ? (
            <button
              type="button"
              onClick={props.onPlayAnotherMovie}
              className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
            >
              Seguir con otra película
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={props.onFinish}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
          >
            {props.movieRoundsCompleted >= props.maxMovieRounds ? "Terminar puntaje" : "Terminar"}
            <Trophy className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {props.failed ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-7 text-rose-700">
          Llegaste al limite de errores. Puedes continuar sin puntos o cambiar de pelicula para volver a intentarlo.
        </div>
      ) : null}
    </div>
  )
}

function PuzzlePanel(props: {
  challengeNumber: number
  variantName: string
  imageUrl: string
  difficulty: PuzzleDifficulty | null
  draggedIndex: number | null
  size: number
  tiles: number[]
  moves: number
  timeLeft: number
  completed: boolean
  finished: boolean
  earnedPoints: number
  onSelectDifficulty: (difficulty: PuzzleDifficulty) => void
  onDragStart: (index: number | null) => void
  onSwapTiles: (fromIndex: number, toIndex: number) => void
  onReset: () => void
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Desafio {props.challengeNumber}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            Puzzle
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
          <Clock3 className="h-4 w-4 text-rose-500" />
          {props.timeLeft}s
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600">
        Variante: {props.variantName}. Elige una dificultad y arrastra las piezas para reconstruir la imagen.
      </p>

      {!props.difficulty ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            { key: "facil" as const, label: "Facil", detail: "3 x 3 piezas" },
            { key: "dificil" as const, label: "Dificil", detail: "4 x 4 piezas" },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => props.onSelectDifficulty(option.key)}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-sky-300 hover:bg-sky-50"
            >
              <div className="text-base font-semibold text-slate-950">{option.label}</div>
              <div className="mt-1 text-sm text-slate-500">{option.detail}</div>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,420px)_180px]">
        <div
          className="grid w-full max-w-[420px] gap-1 rounded-2xl border border-slate-200 bg-slate-950 p-2"
          style={{ gridTemplateColumns: `repeat(${props.size}, minmax(0, 1fr))` }}
        >
          {props.tiles.map((tile, index) => {
            const tileRow = Math.floor(tile / props.size)
            const tileCol = tile % props.size
            const isDragging = props.draggedIndex === index

            return (
              <button
                key={`${tile}-${index}`}
                type="button"
                onClick={() => {
                  if (!props.difficulty || props.finished) return
                  if (props.draggedIndex === null) {
                    props.onDragStart(index)
                    return
                  }
                  props.onSwapTiles(props.draggedIndex, index)
                }}
                draggable={Boolean(props.difficulty) && !props.finished}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move"
                  props.onDragStart(index)
                }}
                onDragEnd={() => props.onDragStart(null)}
                onDragOver={(event) => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = "move"
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  if (props.draggedIndex !== null) {
                    props.onSwapTiles(props.draggedIndex, index)
                  }
                }}
                disabled={!props.difficulty || props.finished}
                aria-label={`Pieza ${tile + 1}`}
                className={`aspect-square rounded-lg border bg-white bg-cover transition ${
                  isDragging
                    ? "border-amber-300 opacity-70 ring-2 ring-amber-300"
                    : "border-white/70 opacity-100"
                } disabled:cursor-not-allowed`}
                style={{
                  backgroundImage: `url("${props.imageUrl}")`,
                  backgroundPosition: `${props.size === 1 ? 0 : (tileCol / (props.size - 1)) * 100}% ${
                    props.size === 1 ? 0 : (tileRow / (props.size - 1)) * 100
                  }%`,
                  backgroundSize: `${props.size * 100}% ${props.size * 100}%`,
                }}
              />
            )
          })}
        </div>

        <div className="max-w-[180px]">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Referencia
          </div>
          <img
            src={props.imageUrl}
            alt={`Referencia ${props.variantName}`}
            className="mt-3 aspect-square w-full rounded-2xl border border-slate-200 bg-white object-contain p-2"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
          Movimientos: {props.moves}
        </div>
        <button type="button" onClick={props.onReset} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
          <RefreshCcw className="h-4 w-4" />
          Reiniciar
        </button>
      </div>

      {props.completed && props.earnedPoints > 0 ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-800">
          Puzzle completado. Sumaste {props.earnedPoints} puntos.
        </div>
      ) : null}
      {props.finished && props.earnedPoints === 0 ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-7 text-rose-700">
          Se termino el tiempo. Puedes continuar sin puntos o reiniciar este desafio.
        </div>
      ) : null}
    </div>
  )
}

function MazePanel(props: {
  challengeNumber: number
  layout: string[]
  position: { row: number; col: number }
  moves: number
  timeLeft: number
  completed: boolean
  finished: boolean
  earnedPoints: number
  onMove: (rowStep: number, colStep: number) => void
  onReset: () => void
}) {
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleSwipeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current
    swipeStartRef.current = null

    if (!start || props.finished) return

    const deltaX = event.clientX - start.x
    const deltaY = event.clientY - start.y
    const minSwipeDistance = 24

    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < minSwipeDistance) return

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      props.onMove(0, deltaX > 0 ? 1 : -1)
      return
    }

    props.onMove(deltaY > 0 ? 1 : -1, 0)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Desafio {props.challengeNumber}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            Laberinto
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
          <Clock3 className="h-4 w-4 text-rose-500" />
          {props.timeLeft}s
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600">
        Ayuda al caballo a llegar desde Inicio hasta Meta. Desliza el dedo sobre el tablero o usa las flechas.
      </p>

      <div
        className="mt-6 grid w-full max-w-[420px] touch-none gap-2"
        onPointerDown={(event) => {
          if (props.finished) return
          swipeStartRef.current = { x: event.clientX, y: event.clientY }
        }}
        onPointerUp={handleSwipeEnd}
        onPointerCancel={() => {
          swipeStartRef.current = null
        }}
        style={{ gridTemplateColumns: `repeat(${props.layout[0].length}, minmax(0, 1fr))` }}
      >
        {props.layout.flatMap((row, rowIndex) =>
          row.split("").map((cell, colIndex) => {
            const isPlayer = props.position.row === rowIndex && props.position.col === colIndex
            const isWall = cell === "#"
            const isGoal = cell === "G"
            const isStart = cell === "S"

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`aspect-square rounded-xl border text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  isPlayer
                    ? "border-amber-400 bg-amber-100 text-2xl shadow-sm"
                    : isWall
                      ? "border-slate-800 bg-slate-950 text-slate-950"
                      : isGoal
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : isStart
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-white text-slate-400"
                } flex items-center justify-center`}
              >
                {isPlayer ? (
                  <span aria-label="Caballo" role="img">
                    🐴
                  </span>
                ) : isGoal ? (
                  "Meta"
                ) : isStart ? (
                  "Inicio"
                ) : (
                  ""
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
          Movimientos: {props.moves}
        </div>
        <button type="button" onClick={props.onReset} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
          <RefreshCcw className="h-4 w-4" />
          Reiniciar
        </button>
      </div>

      <div className="mt-6 grid w-full max-w-[220px] grid-cols-3 gap-2">
        <span />
        <button type="button" onClick={() => props.onMove(-1, 0)} disabled={props.finished} aria-label="Mover arriba" className="inline-flex aspect-square items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50">
          <ArrowUp className="h-5 w-5" />
        </button>
        <span />
        <button type="button" onClick={() => props.onMove(0, -1)} disabled={props.finished} aria-label="Mover izquierda" className="inline-flex aspect-square items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => props.onMove(1, 0)} disabled={props.finished} aria-label="Mover abajo" className="inline-flex aspect-square items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50">
          <ArrowDown className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => props.onMove(0, 1)} disabled={props.finished} aria-label="Mover derecha" className="inline-flex aspect-square items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50">
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>

      {props.completed && props.earnedPoints > 0 ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-800">
          Laberinto completado. Sumaste {props.earnedPoints} puntos.
        </div>
      ) : null}
      {props.finished && props.earnedPoints === 0 ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-7 text-rose-700">
          Se termino el tiempo. Puedes continuar sin puntos o reiniciar este desafio.
        </div>
      ) : null}
    </div>
  )
}

function EntryFormPanel(props: {
  totalPoints: number
  challengeCount: number
  participantName: string
  participantPhone: string
  submitError: string
  submitLoading: boolean
  onNameChange: (value: string) => void
  onPhoneChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
}) {
  return (
    <div>
      <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
        Participacion
      </div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        Ya estas listo para participar.
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ScoreCard label="Puntaje total" value={props.totalPoints} />
        <ScoreCard label="Desafíos" value={props.challengeCount} />
      </div>
      <form onSubmit={props.onSubmit} className="mt-8 space-y-4">
        <input value={props.participantName} onChange={(event) => props.onNameChange(event.target.value)} placeholder="Tu nombre" className="w-full rounded-2xl border border-slate-200 px-4 py-4 outline-none transition focus:border-sky-400" />
        <input value={props.participantPhone} onChange={(event) => props.onPhoneChange(event.target.value)} placeholder="Teléfono" className="w-full rounded-2xl border border-slate-200 px-4 py-4 outline-none transition focus:border-sky-400" />
        {props.submitError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-700">
            {props.submitError}
          </div>
        ) : null}
        <button type="submit" disabled={props.submitLoading || !props.participantName.trim() || !props.participantPhone.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">
          {props.submitLoading ? "Guardando participacion..." : "Confirmar participacion"}
          <Trophy className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}

function DonePanel(props: { participantName: string; participantPhone: string; totalPoints: number }) {
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
        Listo
      </div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        Gracias por participar.
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
        Completaste los desafios y ya tienes tu puntaje final. Esta pantalla despues puede convertirse en el cierre real para participar por premios en cada evento.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <ScoreCard label="Participante" value={props.participantName} />
        <ScoreCard label="Teléfono" value={props.participantPhone} />
        <ScoreCard label="Puntaje final" value={props.totalPoints} />
      </div>
      <div className="mt-8 rounded-[28px] border border-sky-100 bg-sky-50/80 p-6">
        <h3 className="text-xl font-semibold text-slate-950">
          Ahora te invitamos a conocer Hola Varela.
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          Descubre comercios, servicios, cursos, eventos y propuestas cerca tuyo en un solo lugar.
        </p>
        <div className="mt-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-sky-600"
          >
            Ir a conocer Hola Varela
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
