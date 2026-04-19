'use client'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gift,
  RefreshCcw,
  Star,
  Trophy,
} from "lucide-react"
import { supabase } from "../supabase"
import {
  getChallengeAssignment,
  getChallengeBrowserKey,
  isMissingChallengesSchemaError,
  resetChallengeAssignment,
} from "../lib/challengeGame"

type ChallengeKey = "sopa" | "memoria" | "pelicula"

type ChallengeMeta = {
  key: ChallengeKey
  title: string
  description: string
  points: number
}

type MemoryCard = {
  id: string
  value: string
  matched: boolean
}

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
    description: "Encuentra todas las palabras antes de que termine el tiempo y suma mas puntos.",
    points: 30,
  },
  {
    key: "memoria",
    title: "Juego de memoria",
    description: "Descubre todas las parejas antes de que se acabe el tiempo para sumar mas.",
    points: 30,
  },
  {
    key: "pelicula",
    title: "Adivina la pelicula",
    description: "Adivina el titulo con la menor cantidad posible de errores.",
    points: 40,
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
    name: "Descubre mas",
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
    title: "KUNGFUPANDA",
    hint: "Un panda torpe termina convertido en gran guerrero.",
  },
  {
    title: "TOY STORY",
    hint: "Juguetes que cobran vida cuando nadie los ve.",
  },
  {
    title: "BUSCANDOADORY",
    hint: "Una pez olvidadiza busca reencontrarse con su familia.",
  },
  {
    title: "ELREYLEON",
    hint: "Un cachorro debe crecer para ocupar su lugar en la sabana.",
  },
  {
    title: "MONSTERSINC",
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
    hint: "Un villano brillante termina convirtiendose en heroe.",
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
    title: "HOTELTRANSYLVANIA",
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
    hint: "Un joven heroe lanza telaranas y protege su ciudad.",
  },
  {
    title: "BATMAN",
    hint: "Un vigilante oscuro combate el crimen en Gotham.",
  },
  {
    title: "SUPERMAN",
    hint: "Un heroe venido de otro planeta protege la Tierra.",
  },
  {
    title: "JOKER",
    hint: "La historia de un personaje perturbador que cae en la locura.",
  },
  {
    title: "HARRYPOTTER",
    hint: "Un mago joven estudia en una escuela muy especial.",
  },
  {
    title: "ELHOBBIT",
    hint: "Una aventura fantastica con un anillo y criaturas sorprendentes.",
  },
  {
    title: "ELPADRINO",
    hint: "Un clasico sobre familia, poder y mafia.",
  },
  {
    title: "FORRESTGUMP",
    hint: "Un hombre vive momentos historicos con una mirada muy particular.",
  },
  {
    title: "JURASSICPARK",
    hint: "Un parque tematico revive dinosaurios.",
  },
  {
    title: "KINGKONG",
    hint: "Un enorme gorila se convierte en leyenda.",
  },
  {
    title: "GODZILLA",
    hint: "Un monstruo gigante emerge para sembrar caos.",
  },
  {
    title: "RAPIDOSYFURIOSOS",
    hint: "Velocidad, autos y carreras llenas de accion.",
  },
  {
    title: "MISIONIMPOSIBLE",
    hint: "Un agente arriesga todo en operaciones extremas.",
  },
  {
    title: "TOPGUN",
    hint: "Pilotos de combate entrenan al limite.",
  },
  {
    title: "CASAFANTASMAS",
    hint: "Un grupo atrapa seres sobrenaturales en la ciudad.",
  },
  {
    title: "VOLVERALFUTURO",
    hint: "Un auto especial lleva a sus protagonistas a otras epocas.",
  },
  {
    title: "INDIANAJONES",
    hint: "Un arqueologo vive aventuras buscando reliquias historicas.",
  },
  {
    title: "STARWARS",
    hint: "Una saga galactica con jedis, naves y una gran fuerza.",
  },
  {
    title: "ET",
    hint: "Un pequeno extraterrestre quiere volver a su casa.",
  },
  {
    title: "ELMASKARA",
    hint: "Una mascara transforma a un hombre comun en alguien disparatado.",
  },
  {
    title: "ACEVENTURA",
    hint: "Un detective muy excéntrico busca animales perdidos.",
  },
  {
    title: "MIPOBREANGELITO",
    hint: "Un nino queda solo en casa y enfrenta a dos ladrones.",
  },
  {
    title: "MATILDA",
    hint: "Una nina muy inteligente descubre poderes especiales.",
  },
  {
    title: "CHARLIEYLAFABRICA",
    hint: "Un nino entra en una fabrica de chocolate inolvidable.",
  },
  {
    title: "ELGRINCH",
    hint: "Un personaje verde intenta arruinar la Navidad.",
  },
  {
    title: "LAMASCARADEZORRO",
    hint: "Un heroe enmascarado deja su marca con la espada.",
  },
  {
    title: "NACHOLIBRE",
    hint: "Un cocinero sueña con ser luchador.",
  },
  {
    title: "ESCUELADEROCK",
    hint: "Un musico arma una banda con sus estudiantes.",
  },
  {
    title: "LEGALMENTERUBIA",
    hint: "Una joven demuestra que puede brillar en la facultad de derecho.",
  },
  {
    title: "DIABLOVISTEALAMODA",
    hint: "Una asistente entra al exigente mundo de la moda.",
  },
  {
    title: "HOMBRESDENEGRO",
    hint: "Agentes secretos controlan la presencia extraterrestre.",
  },
  {
    title: "BUSCANDONUNCAJAMAS",
    hint: "Un nino que no quiere crecer lidera una aventura fantastica.",
  },
  {
    title: "PETERPAN",
    hint: "Un chico vuela hacia un lugar donde nadie crece.",
  },
  {
    title: "LILOYSTITCH",
    hint: "Una nina hawaiana adopta una criatura muy traviesa.",
  },
  {
    title: "TARZAN",
    hint: "Un joven criado en la selva descubre su origen.",
  },
  {
    title: "HERCULES",
    hint: "Un heroe mitologico busca demostrar su verdadero valor.",
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
    title: "LABELLAYLABESTIA",
    hint: "Una historia romantica en un castillo encantado.",
  },
  {
    title: "BLANCANIEVES",
    hint: "Una princesa encuentra ayuda en siete companeros.",
  },
  {
    title: "LOSINCREIBLES",
    hint: "Una familia de superheroes intenta volver a la accion.",
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
    title: "ELGATOCONBOTAS",
    hint: "Un felino espadachin vive aventuras con mucho estilo.",
  },
  {
    title: "DRAGONBALLSUPER",
    hint: "Guerreros poderosos pelean por universos enteros.",
  },
  {
    title: "KARATEKID",
    hint: "Un joven aprende defensa y disciplina con un maestro especial.",
  },
  {
    title: "RAMBO",
    hint: "Un exsoldado sobrevive en situaciones extremas.",
  },
  {
    title: "TERMINATOR",
    hint: "Una maquina llega del futuro para cambiar la historia.",
  },
]

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const MAX_MOVIE_ERRORS = 6
const MAX_MOVIE_ROUNDS = 4

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

function createMemoryDeck(values: string[]) {
  return shuffleArray(
    values.flatMap((value, index) => [
      { id: `${value}-${index}-a`, value, matched: false },
      { id: `${value}-${index}-b`, value, matched: false },
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

export function JugaYGanaExperience() {
  const initialAssignment = getChallengeAssignment({
    wordSearchVariantsCount: WORD_SEARCH_VARIANTS.length,
    memoryVariantsCount: MEMORY_VARIANTS.length,
    movieChallengesCount: MOVIE_CHALLENGES.length,
  })

  const [stage, setStage] = useState<"intro" | "play" | "form" | "done">("intro")
  const [activeChallengeIndex, setActiveChallengeIndex] = useState(0)
  const [completedChallenges, setCompletedChallenges] = useState<Record<ChallengeKey, boolean>>({
    sopa: false,
    memoria: false,
    pelicula: false,
  })
  const [earnedPoints, setEarnedPoints] = useState<Record<ChallengeKey, number>>({
    sopa: 0,
    memoria: 0,
    pelicula: 0,
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
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>(() =>
    createMemoryDeck(MEMORY_VARIANTS[initialAssignment.memoryVariantIndex])
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

  const [participantName, setParticipantName] = useState("")
  const [participantPhone, setParticipantPhone] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [submitLoading, setSubmitLoading] = useState(false)

  const activeChallenge = CHALLENGES[activeChallengeIndex]
  const activeWordSearch = WORD_SEARCH_VARIANTS[wordSearchVariantIndex]
  const activeWordSearchGrid = useMemo(
    () => buildWordSearchGrid(activeWordSearch),
    [activeWordSearch]
  )
  const activeMemoryValues = MEMORY_VARIANTS[memoryVariantIndex]
  const movieChallenge = MOVIE_CHALLENGES[movieChallengeIndex]

  const assignNextChallengeSet = () => {
    resetChallengeAssignment({
      wordSearchVariantsCount: WORD_SEARCH_VARIANTS.length,
      memoryVariantsCount: MEMORY_VARIANTS.length,
      movieChallengesCount: MOVIE_CHALLENGES.length,
    })

    const nextAssignment = getChallengeAssignment({
      wordSearchVariantsCount: WORD_SEARCH_VARIANTS.length,
      memoryVariantsCount: MEMORY_VARIANTS.length,
      movieChallengesCount: MOVIE_CHALLENGES.length,
    })

    setWordSearchVariantIndex(nextAssignment.wordSearchVariantIndex)
    setMemoryVariantIndex(nextAssignment.memoryVariantIndex)
    setMemoryCards(createMemoryDeck(MEMORY_VARIANTS[nextAssignment.memoryVariantIndex]))
    setMovieChallengeIndex(nextAssignment.movieChallengeIndex)
    setGuessedLetters([])
    setWrongLetters([])
    setMovieRoundCompleted(false)
    setMovieRoundPoints(0)
    setMovieRoundsCompleted(0)
    setMovieTitlesCompleted([])
  }

  const selectedWord = wordSelection
    .map((cellIndex) => {
      const row = Math.floor(cellIndex / activeWordSearchGrid[0].length)
      const col = cellIndex % activeWordSearchGrid[0].length
      return activeWordSearchGrid[row][col]
    })
    .join("")

  const maskedMovieTitle = movieChallenge.title
    .split("")
    .map((character) => {
      if (character === " ") return " "
      return guessedLetters.includes(character) ? character : "_"
    })
    .join(" ")

  const totalPoints = useMemo(
    () => Object.values(earnedPoints).reduce((sum, value) => sum + value, 0),
    [earnedPoints]
  )

  const allChallengesCompleted = useMemo(
    () => Object.values(completedChallenges).every(Boolean),
    [completedChallenges]
  )

  const matchedCardsCount = memoryCards.filter((card) => card.matched).length
  const matchedPairs = matchedCardsCount / 2
  const wordSearchFinished = completedChallenges.sopa
  const wordSearchTimedOut = wordTimeLeft === 0
  const memoryFinished = completedChallenges.memoria || memoryTimeLeft === 0
  const movieFailed = !movieRoundCompleted && wrongLetters.length >= MAX_MOVIE_ERRORS
  const canPlayAnotherMovie = movieRoundCompleted && movieRoundsCompleted < MAX_MOVIE_ROUNDS

  useEffect(() => {
    if (stage !== "play" || activeChallenge?.key !== "sopa") return
    if (wordSearchTimedOut) return

    const intervalId = window.setInterval(() => {
      setWordTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
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
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [activeChallenge?.key, memoryFinished, stage])

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

      if (current.includes(cellIndex)) {
        return current
      }

      const columnCount = activeWordSearchGrid[0].length
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
    })
  }

  const handleCheckWord = () => {
    if (!selectedWord) return

    const normalizedWord = selectedWord.toUpperCase()
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

    if (firstCard.value === secondCard.value) {
      const nextCards = memoryCards.map((card, cardIndex) =>
        cardIndex === firstIndex || cardIndex === index
          ? { ...card, matched: true }
          : card
      )

      setMemoryCards(nextCards)
      setFlippedCards([])

      if (nextCards.every((card) => card.matched)) {
        const memoryPoints =
          CHALLENGES[1].points + memoryTimeLeft + activeMemoryValues.join("").length

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
    setMemoryCards(createMemoryDeck(activeMemoryValues))
    setFlippedCards([])
    setMemoryLocked(false)
    setMemoryTimeLeft(MEMORY_TIME)
    setCompletedChallenges((prev) => ({ ...prev, memoria: false }))
    setEarnedPoints((prev) => ({ ...prev, memoria: 0 }))
  }

  const handleGuessLetter = (letter: string) => {
    if (movieRoundCompleted || movieFailed) return
    if (guessedLetters.includes(letter) || wrongLetters.includes(letter)) return

    if (movieChallenge.title.includes(letter)) {
      const nextGuessedLetters = [...guessedLetters, letter]
      setGuessedLetters(nextGuessedLetters)

      const solved = movieChallenge.title
        .replace(/ /g, "")
        .split("")
        .every((character) => nextGuessedLetters.includes(character))

      if (solved) {
        const moviePoints =
          CHALLENGES[2].points +
          Math.max(0, MAX_MOVIE_ERRORS - wrongLetters.length) * 4 +
          movieChallenge.title.replace(/ /g, "").length

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

    setWrongLetters((current) => [...current, letter])
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

  const handleContinue = () => {
    if (activeChallengeIndex < CHALLENGES.length - 1) {
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
        nombre: participantName.trim(),
        telefono: participantPhone.trim(),
        puntaje_total: totalPoints,
        puntos_sopa: earnedPoints.sopa,
        puntos_memoria: earnedPoints.memoria,
        puntos_pelicula: earnedPoints.pelicula,
        sopa_nombre: activeWordSearch.name,
        memoria_nombre: `Memoria ${memoryVariantIndex + 1}`,
        pelicula_nombre: movieTitlesCompleted.join(" | "),
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff2d9_0%,#fffdf8_28%,#e9f7ff_64%,#f9fcff_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700">
            <ArrowLeft className="h-4 w-4" />
            Volver a Hola Varela
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm">
            <Gift className="h-4 w-4" />
            Propuesta interna - aun no publicada
          </div>
        </div>

        <section className="overflow-hidden rounded-[34px] border border-white/80 bg-white/85 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.32)] backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="bg-[linear-gradient(160deg,#0f172a_0%,#0b4ea2_45%,#0ea5e9_100%)] p-6 text-white sm:p-8 lg:p-10">
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">
                Hola Varela en eventos
              </div>
              <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Desafios cortos, juga y gana.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-sky-50/90 sm:text-lg">
                Acumula puntos y participa de ganar premios.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {CHALLENGES.map((challenge, index) => (
                  <div key={challenge.key} className={`rounded-[24px] border px-4 py-4 ${completedChallenges[challenge.key] ? "border-emerald-300/40 bg-emerald-400/15" : activeChallengeIndex === index && stage === "play" ? "border-white/30 bg-white/10" : "border-white/10 bg-black/10"}`}>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100/80">
                      Desafio {index + 1}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
                      {completedChallenges[challenge.key] ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : null}
                      <span>{challenge.title}</span>
                    </div>
                    <div className="mt-2 text-sm text-sky-50/80">{challenge.points} pts base</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              {stage === "intro" ? <IntroPanel onStart={() => setStage("play")} /> : null}
              {stage === "play" && activeChallenge?.key === "sopa" ? (
                <WordSearchPanel
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
                  onCheckWord={handleCheckWord}
                  onClear={() => setWordSelection([])}
                  onReset={resetWordSearch}
                  earnedPoints={earnedPoints.sopa}
                />
              ) : null}
              {stage === "play" && activeChallenge?.key === "memoria" ? (
                <MemoryPanel
                  cards={memoryCards}
                  variantLabel={activeMemoryValues.join(" • ")}
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
                  hint={movieChallenge.hint}
                  maskedTitle={maskedMovieTitle}
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
              {stage === "form" ? (
                <EntryFormPanel
                  totalPoints={totalPoints}
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
                      disabled={!completedChallenges[activeChallenge.key]}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {activeChallengeIndex === CHALLENGES.length - 1 ? "Terminar" : "Continuar"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function IntroPanel({ onStart }: { onStart: () => void }) {
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
            "Juegas 3 desafios cortos desde tu celular",
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
  onCheckWord: () => void
  onClear: () => void
  onReset: () => void
  earnedPoints: number
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Desafio 1
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
        className="mt-6 grid w-full max-w-[480px] gap-2"
        style={{ gridTemplateColumns: `repeat(${props.grid[0].length}, minmax(0, 1fr))` }}
      >
        {props.grid.flat().map((letter, index) => (
          <button
            key={`${letter}-${index}`}
            type="button"
            onClick={() => props.onToggleCell(index)}
            className={`aspect-square rounded-2xl border text-lg font-semibold transition ${
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

      {props.completed ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-800">
          Desafio completado. Sumaste {props.earnedPoints} puntos.
        </div>
      ) : null}
      {props.finished && !props.completed ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-7 text-rose-700">
          Se termino el tiempo. Puedes reiniciar este desafio.
        </div>
      ) : null}
    </div>
  )
}

function MemoryPanel(props: {
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
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Desafio 2
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
        Palabras de esta ronda: {props.variantLabel}
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
              {isVisible ? card.value : "?"}
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
      {props.completed ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-800">
          Memoria completada. Sumaste {props.earnedPoints} puntos.
        </div>
      ) : null}
      {props.finished && !props.completed ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-7 text-rose-700">
          Se termino el tiempo. Debes reiniciar este desafio para volver a intentarlo.
        </div>
      ) : null}
    </div>
  )
}

function MoviePanel(props: {
  hint: string
  maskedTitle: string
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
        Desafio 3
      </div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        Adivina la pelicula
      </h2>
      <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
        Pista: {props.hint}
      </p>
      <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-950 px-5 py-6 text-center text-2xl font-semibold tracking-[0.28em] text-white sm:text-3xl">
        {props.maskedTitle}
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
            Cambiar pelicula
          </button>
        ) : null}
      </div>
      {props.completed ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-800">
          Adivinanza resuelta. Sumaste {props.movieRoundPoints} puntos en esta pelicula y llevas {props.earnedPoints} en total.
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
              Seguir con otra pelicula
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
          Llegaste al limite de errores. Reinicia este desafio para volver a intentarlo y seguir sumando puntos.
        </div>
      ) : null}
    </div>
  )
}

function EntryFormPanel(props: {
  totalPoints: number
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
        <ScoreCard label="Desafios" value={3} />
      </div>
      <form onSubmit={props.onSubmit} className="mt-8 space-y-4">
        <input value={props.participantName} onChange={(event) => props.onNameChange(event.target.value)} placeholder="Tu nombre" className="w-full rounded-2xl border border-slate-200 px-4 py-4 outline-none transition focus:border-sky-400" />
        <input value={props.participantPhone} onChange={(event) => props.onPhoneChange(event.target.value)} placeholder="Telefono" className="w-full rounded-2xl border border-slate-200 px-4 py-4 outline-none transition focus:border-sky-400" />
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
        <ScoreCard label="Telefono" value={props.participantPhone} />
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
