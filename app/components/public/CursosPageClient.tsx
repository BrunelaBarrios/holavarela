'use client'

import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CalendarRange,
  Clock,
  Columns3,
  DollarSign,
  GraduationCap,
  LayoutList,
  MapPin,
  Phone,
  Search,
  Tags,
  UserRound,
} from "lucide-react"
import { ContactActionLink } from "../ContactActionLink"
import { ExternalLinksButtons } from "../ExternalLinksButtons"
import { PublicDetailModal } from "../PublicDetailModal"
import { PublicHeader } from "../PublicHeader"
import { ShareButton } from "../ShareButton"
import { OptimizedImage } from "../OptimizedImage"
import { PublicAddButton } from "./PublicAddButton"
import { recordContentVisit, recordSiteVisit } from "../../lib/contentVisits"
import { buildPublicNav } from "../../lib/publicNav"
import { recordViewMore } from "../../lib/viewMoreTracking"

export type Curso = {
  id: number
  nombre: string
  descripcion: string
  responsable: string
  contacto: string
  edad_destino?: string | null
  categoria?: string | null
  lugar?: string | null
  dias_semana?: string[] | null
  hora_inicio?: string | null
  hora_fin?: string | null
  horarios?: CursoHorario[] | null
  costo_tipo?: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen?: string | null
  premium_galeria?: string[] | null
  estado?: string | null
  usa_whatsapp?: boolean | null
  institucion_id?: number | null
  institucion_nombre?: string | null
}

type CursoHorario = {
  dia: string
  hora_inicio?: string | null
  hora_fin?: string | null
}

type ViewMode = "lista" | "dia" | "semana"
type TimeFilter = "todos" | "manana" | "tarde" | "noche"

const weekDayOptions = [
  { value: "lunes", label: "Lunes", short: "Lun" },
  { value: "martes", label: "Martes", short: "Mar" },
  { value: "miercoles", label: "Miércoles", short: "Mié" },
  { value: "jueves", label: "Jueves", short: "Jue" },
  { value: "viernes", label: "Viernes", short: "Vie" },
  { value: "sabado", label: "Sábado", short: "Sáb" },
  { value: "domingo", label: "Domingo", short: "Dom" },
]

const courseAgeOptions = [
  { value: "todas_las_edades", label: "Todas las edades" },
  { value: "ninos", label: "Niños" },
  { value: "adolescentes", label: "Adolescentes" },
  { value: "adultos", label: "Adultos" },
  { value: "adultos_mayores", label: "Adultos mayores" },
]

const ageFilterOptions = [{ value: "todos", label: "Todos" }, ...courseAgeOptions]

const timeFilterOptions: { value: TimeFilter; label: string }[] = [
  { value: "todos", label: "Todo el día" },
  { value: "manana", label: "Mañana" },
  { value: "tarde", label: "Tarde" },
  { value: "noche", label: "Noche" },
]

const viewOptions: {
  value: ViewMode
  label: string
  shortLabel: string
  icon: typeof LayoutList
}[] = [
  { value: "lista", label: "Lista", shortLabel: "Lista", icon: LayoutList },
  { value: "dia", label: "Por día", shortLabel: "Día", icon: CalendarDays },
  { value: "semana", label: "Agenda semanal", shortLabel: "Semana", icon: Columns3 },
]

const courseAgeLabel = (value?: string | null) =>
  courseAgeOptions.find((option) => option.value === value)?.label || "Todas las edades"

const parseCourseAgeGroups = (value?: string | null) => {
  const groups = (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => courseAgeOptions.some((option) => option.value === item))

  return groups.length ? groups : ["todas_las_edades"]
}

const courseAgeLabels = (value?: string | null) =>
  parseCourseAgeGroups(value).map(courseAgeLabel).join(", ")

const normalizeCourseName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

const courseMatchesAgeFilter = (curso: Curso, filter: string) => {
  if (filter === "todos") return true

  const groups = parseCourseAgeGroups(curso.edad_destino)
  return groups.includes("todas_las_edades") || groups.includes(filter)
}

const normalizeTime = (value?: string | null) => (value ? value.slice(0, 5) : "")

const timeToMinutes = (value?: string | null) => {
  const time = normalizeTime(value)
  if (!time) return 24 * 60

  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

const getCourseSchedules = (curso: Curso): CursoHorario[] => {
  if (curso.horarios?.length) return curso.horarios

  return (curso.dias_semana || []).map((dia) => ({
    dia,
    hora_inicio: normalizeTime(curso.hora_inicio),
    hora_fin: normalizeTime(curso.hora_fin),
  }))
}

const getCourseScheduleForDay = (curso: Curso, day?: string) =>
  getCourseSchedules(curso).find((schedule) => !day || schedule.dia === day)

const courseHasDay = (curso: Curso, day: string) =>
  getCourseSchedules(curso).some((schedule) => schedule.dia === day)

const formatCourseSchedule = (curso: Curso, day?: string) => {
  const schedule = getCourseScheduleForDay(curso, day)
  const start = normalizeTime(schedule?.hora_inicio || curso.hora_inicio)
  const end = normalizeTime(schedule?.hora_fin || curso.hora_fin)

  if (start && end) return `${start} a ${end}`
  if (start) return start
  return "Horario a definir"
}

const formatAllCourseSchedules = (curso: Curso) => {
  const schedules = getCourseSchedules(curso)
  if (!schedules.length) return "Días y horarios a definir"

  return schedules
    .map((schedule) => {
      const day = weekDayOptions.find((option) => option.value === schedule.dia)?.short
      const start = normalizeTime(schedule.hora_inicio)
      const end = normalizeTime(schedule.hora_fin)
      const hours = start ? `${start}${end ? ` a ${end}` : ""}` : "Horario a confirmar"
      return `${day || schedule.dia} ${hours}`
    })
    .join(" · ")
}

const sortBySchedule = (courses: Curso[], day?: string) =>
  [...courses].sort(
    (a, b) =>
      timeToMinutes(getCourseScheduleForDay(a, day)?.hora_inicio || a.hora_inicio) -
      timeToMinutes(getCourseScheduleForDay(b, day)?.hora_inicio || b.hora_inicio)
  )

const courseMatchesTimeFilter = (curso: Curso, filter: TimeFilter, day?: string) => {
  if (filter === "todos") return true

  return getCourseSchedules(curso)
    .filter((schedule) => !day || schedule.dia === day)
    .some((schedule) => {
      const minutes = timeToMinutes(schedule.hora_inicio)
      if (minutes >= 24 * 60) return false
      if (filter === "manana") return minutes < 12 * 60
      if (filter === "tarde") return minutes >= 12 * 60 && minutes < 19 * 60
      return minutes >= 19 * 60
    })
}

const courseCostLabel = (value?: string | null) =>
  value === "con_costo" ? "Con costo" : "Gratis"

const getTodayValue = () => {
  const day = new Date().getDay()
  return weekDayOptions[(day + 6) % 7].value
}

function CursoAgendaCard({
  curso,
  day,
  compact = false,
  onOpen,
}: {
  curso: Curso
  day?: string
  compact?: boolean
  onOpen: (curso: Curso) => void
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Ver detalles de ${curso.nombre}`}
      onClick={() => onOpen(curso)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpen(curso)
        }
      }}
      className="group flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-blue-700">{formatCourseSchedule(curso, day)}</p>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {courseCostLabel(curso.costo_tipo)}
        </span>
      </div>
      <h3 className="mt-2 text-lg font-bold leading-tight text-slate-950">{curso.nombre}</h3>

      <div className="mt-3 space-y-1.5 text-xs font-medium text-slate-600">
        <span className="flex items-start gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {curso.lugar || "Lugar a confirmar"}
        </span>
        <span className="flex items-start gap-1.5">
          <Tags className="h-3.5 w-3.5" />
          {curso.categoria || "General"}
        </span>
        {!compact ? (
          <span className="flex items-start gap-1.5">
            <UserRound className="h-3.5 w-3.5" />
            {courseAgeLabels(curso.edad_destino)}
          </span>
        ) : null}
      </div>

      <span
        className="mt-4 inline-flex items-center gap-2 self-start text-sm font-semibold text-blue-700 transition group-hover:text-blue-500"
      >
        Ver más
        <ArrowRight className="h-4 w-4" />
      </span>
    </article>
  )
}

export function CursosPageClient({ initialCursos }: { initialCursos: Curso[] }) {
  const [cursos] = useState<Curso[]>(initialCursos)
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("semana")
  const [selectedDay, setSelectedDay] = useState<string>("todos")
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("todos")
  const [categoryFilter, setCategoryFilter] = useState("todos")
  const [ageFilter, setAgeFilter] = useState("todos")
  const [costFilter, setCostFilter] = useState("todos")
  const [selectedCursoId, setSelectedCursoId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("item")
  )

  const todayValue = useMemo(() => getTodayValue(), [])
  const visibleDay = selectedDay === "todos" ? todayValue : selectedDay

  const selectedCurso = useMemo(
    () => cursos.find((curso) => String(curso.id) === selectedCursoId) || null,
    [cursos, selectedCursoId]
  )
  const selectedCursoImage =
    selectedCurso?.imagen || selectedCurso?.premium_galeria?.[0] || null

  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(cursos.map((curso) => curso.categoria?.trim()).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b))

    return ["todos", ...categories]
  }, [cursos])

  useEffect(() => {
    void recordSiteVisit("cursos-page", "Listado de cursos y clases")
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (selectedCursoId) {
      url.searchParams.set("item", selectedCursoId)
    } else {
      url.searchParams.delete("item")
    }
    window.history.replaceState({}, "", url)
  }, [selectedCursoId])

  const whatsappLink = (telefono: string) => {
    const limpio = telefono.replace(/\D/g, "")
    const numero = limpio.startsWith("598")
      ? limpio
      : `598${limpio.replace(/^0+/, "")}`

    return `https://wa.me/${numero}`
  }

  const getContactHref = (contacto: string, usaWhatsapp?: boolean | null) =>
    usaWhatsapp === false ? `tel:${contacto}` : whatsappLink(contacto)

  const getShareUrl = (id: number) => {
    if (typeof window === "undefined") return `/cursos/${id}`
    return `${window.location.origin}/cursos/${id}`
  }

  const handleOpenCurso = (curso: Curso) => {
    void recordViewMore("cursos", String(curso.id), curso.nombre)
    void recordContentVisit("cursos", String(curso.id), curso.nombre)
    setSelectedCursoId(String(curso.id))
  }

  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    action: () => void
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      action()
    }
  }

  const filteredCursos = useMemo(() => {
    const term = normalizeCourseName(search)

    return sortBySchedule(
      cursos.filter((curso) => {
        const matchesSearch = !term || normalizeCourseName(curso.nombre).includes(term)
        const matchesDay =
          selectedDay === "todos" || courseHasDay(curso, selectedDay)
        const matchesCategory =
          categoryFilter === "todos" || curso.categoria === categoryFilter
        const matchesCost = costFilter === "todos" || (curso.costo_tipo || "gratis") === costFilter

        return (
          matchesSearch &&
          matchesDay &&
          courseMatchesTimeFilter(
            curso,
            timeFilter,
            selectedDay === "todos" ? undefined : selectedDay
          ) &&
          matchesCategory &&
          courseMatchesAgeFilter(curso, ageFilter) &&
          matchesCost
        )
      })
    )
  }, [ageFilter, categoryFilter, costFilter, cursos, search, selectedDay, timeFilter])

  const todayCourses = useMemo(
    () => sortBySchedule(cursos.filter((curso) => courseHasDay(curso, todayValue)), todayValue),
    [cursos, todayValue]
  )

  const coursesForDayView = useMemo(
    () =>
      sortBySchedule(
        filteredCursos.filter(
          (curso) =>
            courseHasDay(curso, visibleDay) &&
            courseMatchesTimeFilter(curso, timeFilter, visibleDay)
        ),
        visibleDay
      ),
    [filteredCursos, timeFilter, visibleDay]
  )

  const coursesByDay = useMemo(
    () =>
      new Map(
        weekDayOptions.map((day) => [
          day.value,
          sortBySchedule(
            filteredCursos.filter(
              (curso) =>
                courseHasDay(curso, day.value) &&
                courseMatchesTimeFilter(curso, timeFilter, day.value)
            ),
            day.value
          ),
        ])
      ),
    [filteredCursos, timeFilter]
  )

  const visibleWeekDays = useMemo(
    () => weekDayOptions.filter((day) => (coursesByDay.get(day.value) || []).length > 0),
    [coursesByDay]
  )

  const emptyMessage =
    cursos.length === 0
      ? "Todavía no hay cursos o clases cargados."
      : "No hay actividades cargadas para este día."

  return (
    <main className="min-h-screen bg-white">
      <PublicDetailModal
        open={Boolean(selectedCurso)}
        onClose={() => setSelectedCursoId(null)}
        title={selectedCurso?.nombre || ""}
        imageSrc={selectedCursoImage}
        imageAlt={selectedCurso?.nombre || "Curso"}
        badge={selectedCurso?.categoria || "Curso"}
        description={selectedCurso?.descripcion || null}
        extraContent={
          selectedCurso?.premium_galeria?.length ? (
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Galeria
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {selectedCurso.premium_galeria.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    <OptimizedImage
                      src={image}
                      alt={`${selectedCurso.nombre} ${index + 1}`}
                      sizes="(max-width: 768px) 50vw, 18vw"
                      className="object-contain p-2"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null
        }
        meta={[
          ...(selectedCurso
            ? [
                { icon: Clock, text: formatAllCourseSchedules(selectedCurso) },
                { icon: MapPin, text: selectedCurso.lugar || "Lugar a confirmar" },
                { icon: UserRound, text: courseAgeLabels(selectedCurso.edad_destino) },
                { icon: DollarSign, text: courseCostLabel(selectedCurso.costo_tipo) },
              ]
            : []),
          ...(selectedCurso?.responsable
            ? [{ icon: GraduationCap, text: selectedCurso.responsable }]
            : []),
          ...(selectedCurso?.institucion_nombre
            ? [{ icon: Building2, text: `Pertenece a: ${selectedCurso.institucion_nombre}` }]
            : []),
          ...(selectedCurso?.contacto
            ? [{ icon: Phone, text: selectedCurso.contacto }]
            : []),
        ]}
        actions={
          selectedCurso ? (
            <>
              {selectedCurso.contacto?.trim() ? (
                <ContactActionLink
                  href={getContactHref(
                    selectedCurso.contacto,
                    selectedCurso.usa_whatsapp
                  )}
                  mode={selectedCurso.usa_whatsapp === false ? "phone" : "whatsapp"}
                  section="cursos"
                  itemId={String(selectedCurso.id)}
                  itemTitle={selectedCurso.nombre}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                >
                  <Phone className="h-4 w-4" />
                  {selectedCurso.usa_whatsapp === false ? "Llamar" : "Contactar"}
                </ContactActionLink>
              ) : null}
              <ShareButton
                title={selectedCurso.nombre}
                text={selectedCurso.descripcion}
                url={getShareUrl(selectedCurso.id)}
                section="cursos"
                itemId={String(selectedCurso.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              />
              <ExternalLinksButtons
                webUrl={selectedCurso.web_url}
                instagramUrl={selectedCurso.instagram_url}
                facebookUrl={selectedCurso.facebook_url}
                section="cursos"
                itemId={String(selectedCurso.id)}
                itemTitle={selectedCurso.nombre}
              />
            </>
          ) : null
        }
      />

      <PublicHeader items={buildPublicNav("cursos")} />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              <CalendarRange className="h-4 w-4" />
              Agenda de actividades
            </p>
            <h1 className="mt-3 text-3xl font-bold text-gray-900">Cursos y Clases</h1>
            <p className="mt-2 max-w-2xl text-gray-600">
              Mirá qué hay cada día, filtrá por horario y encontrá rápido la propuesta que te sirve.
            </p>
          </div>

          <PublicAddButton href="/sumate/curso" label="Sumar mi curso" />
        </div>

        <section className="mt-8 rounded-lg border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Hoy en Varela</h2>
              <p className="mt-1 text-sm text-slate-600">
                {todayCourses.length
                  ? `${todayCourses.length} actividades para hoy`
                  : "No hay actividades cargadas para este día."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setViewMode("dia")
                setSelectedDay(todayValue)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Ver hoy
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {todayCourses.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {todayCourses.slice(0, 3).map((curso) => (
                <CursoAgendaCard
                  key={curso.id}
                  curso={curso}
                  day={todayValue}
                  compact
                  onOpen={handleOpenCurso}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar curso o clase por nombre"
                aria-label="Buscar curso o clase por nombre"
                className="w-full text-sm outline-none"
              />
            </div>

            <div className="grid grid-cols-3 rounded-lg border border-slate-200 bg-slate-50 p-1">
              {viewOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setViewMode(option.value)}
                    className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                      viewMode === option.value
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="sm:hidden">{option.shortLabel}</span>
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="todos">Todos los días</option>
              {weekDayOptions.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>

            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
            >
              {timeFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category === "todos" ? "Todas las categorías" : category}
                </option>
              ))}
            </select>

            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
            >
              {ageFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value === "todos" ? "Todo público" : option.label}
                </option>
              ))}
            </select>

            <select
              value={costFilter}
              onChange={(e) => setCostFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="todos">Gratis y con costo</option>
              <option value="gratis">Gratis</option>
              <option value="con_costo">Con costo</option>
            </select>
          </div>
        </section>

        {viewMode === "dia" ? (
          <section className="mt-8">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {weekDayOptions.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => setSelectedDay(day.value)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    visibleDay === day.value
                      ? "border-blue-600 bg-blue-600 text-white"
                      : day.value === todayValue
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700"
                  }`}
                >
                  {day.label}
                  {day.value === todayValue ? " · Hoy" : ""}
                </button>
              ))}
            </div>

            {coursesForDayView.length ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {coursesForDayView.map((curso) => (
                  <CursoAgendaCard
                    key={curso.id}
                    curso={curso}
                    day={visibleDay}
                    onOpen={handleOpenCurso}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
                {emptyMessage}
              </div>
            )}
          </section>
        ) : null}

        {viewMode === "semana" ? (
          <section className="mt-8">
            <div className="hidden gap-4 lg:grid lg:grid-cols-3 xl:grid-cols-5">
              {visibleWeekDays.map((day) => {
                const dayCourses = coursesByDay.get(day.value) || []
                return (
                  <div
                    key={day.value}
                    className={`min-w-0 rounded-xl border p-3 ${
                      day.value === todayValue
                        ? "border-blue-200 bg-blue-50/60"
                        : "border-slate-200 bg-slate-50/60"
                    }`}
                  >
                    <div className="mb-3">
                      <h2 className="text-sm font-bold text-slate-950">{day.label}</h2>
                      {day.value === todayValue ? (
                        <span className="mt-1 inline-flex rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                          Hoy
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      {dayCourses.length ? (
                        dayCourses.map((curso) => (
                          <CursoAgendaCard
                            key={`${day.value}-${curso.id}`}
                            curso={curso}
                            day={day.value}
                            compact
                            onOpen={handleOpenCurso}
                          />
                        ))
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

            {visibleWeekDays.length === 0 ? (
              <div className="hidden rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600 lg:block">
                No hay actividades que coincidan con estos filtros.
              </div>
            ) : null}

            <div className="space-y-5 lg:hidden">
              {weekDayOptions.map((day) => {
                const dayCourses = coursesByDay.get(day.value) || []
                return (
                  <div key={day.value}>
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-950">
                      {day.label}
                      {day.value === todayValue ? (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                          Hoy
                        </span>
                      ) : null}
                    </h2>

                    {dayCourses.length ? (
                      <div className="space-y-3">
                        {dayCourses.map((curso) => (
                          <CursoAgendaCard
                            key={`${day.value}-${curso.id}`}
                            curso={curso}
                            day={day.value}
                            onOpen={handleOpenCurso}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                        No hay actividades cargadas para este día.
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {viewMode === "lista" ? (
          <section className="mt-8">
            {filteredCursos.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                <p className="text-gray-600">{emptyMessage}</p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {filteredCursos.map((curso) => (
                  <div
                    key={curso.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Ver detalles de ${curso.nombre}`}
                    onClick={() => handleOpenCurso(curso)}
                    onKeyDown={(event) =>
                      handleCardKeyDown(event, () => handleOpenCurso(curso))
                    }
                    className="group flex min-h-72 cursor-pointer flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_16px_36px_rgba(15,23,42,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    <div className="border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ecfdf5_100%)] px-5 py-6">
                      <p className="mb-2 text-sm font-semibold text-blue-700">
                        {formatAllCourseSchedules(curso)}
                      </p>
                      <h2 className="text-2xl font-bold leading-tight tracking-tight text-slate-950">
                        {curso.nombre}
                      </h2>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <p className="line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {curso.descripcion}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          {curso.lugar || "Lugar a confirmar"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          {curso.categoria || "General"}
                        </span>
                      </div>

                      <div className="mt-auto pt-6">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <GraduationCap className="h-4 w-4 shrink-0" />
                          <span className="truncate">{curso.responsable}</span>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-blue-700">
                          <span>Ver mas</span>
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  )
}
