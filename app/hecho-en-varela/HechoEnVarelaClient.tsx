'use client'

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, MessageCircle, Search, Sparkles, Store } from "lucide-react"
import { HECHO_EN_VARELA_CATEGORIES, formatPrice, whatsappUrl, type ProductoVarela } from "../lib/hechoEnVarela"

export function HechoEnVarelaClient({ products }: { products: ProductoVarela[] }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("Todos")
  const [ventureId, setVentureId] = useState("Todos")
  const ventures = useMemo(() => Array.from(new Map(products.flatMap(product => {
    const venture = product.emprendimientos_varela
    return venture ? [[venture.id, { id: venture.id, nombre: venture.nombre }]] as const : []
  })).values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")), [products])
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es")
    return products.filter((product) => {
      const venture = product.emprendimientos_varela?.nombre || ""
      const categories = product.categorias?.length ? product.categorias : [product.categoria]
      return (category === "Todos" || categories.includes(category)) && (ventureId === "Todos" || product.emprendimiento_id === ventureId) && (!term || `${product.nombre} ${venture} ${product.descripcion_breve || ""}`.toLocaleLowerCase("es").includes(term))
    })
  }, [products, query, category, ventureId])

  return <main className="min-h-screen bg-[#fbf7ef] text-stone-900">
    <section className="relative overflow-hidden border-b border-amber-900/10 bg-[#efe3cd]">
      <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-orange-300/20 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-900/10 bg-white/55 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-amber-900"><Sparkles className="h-4 w-4" /> Talento local</div>
        <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">Hecho en Varela</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-700">Descubrí productos creados por artesanos y emprendedores de nuestra ciudad.</p>
        <label className="mt-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-amber-900/15 bg-white px-4 py-3.5 shadow-sm focus-within:ring-2 focus-within:ring-amber-700/30">
          <Search className="h-5 w-5 text-amber-800" /><span className="sr-only">Buscar</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar productos o emprendimientos" className="w-full bg-transparent text-base outline-none placeholder:text-stone-500" />
        </label>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none]" aria-label="Categorías">
        {["Todos", ...HECHO_EN_VARELA_CATEGORIES].map(item => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${category === item ? "border-amber-800 bg-amber-800 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-amber-700"}`}>{item}</button>)}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:max-w-sm"><label htmlFor="venture-filter" className="text-sm font-bold text-stone-700">Filtrar por emprendimiento</label><div className="flex items-center gap-3 rounded-2xl border border-stone-300 bg-white px-4 shadow-sm focus-within:border-amber-700 focus-within:ring-2 focus-within:ring-amber-700/20"><Store className="h-5 w-5 shrink-0 text-amber-800" /><select id="venture-filter" value={ventureId} onChange={event => setVentureId(event.target.value)} className="min-h-12 w-full bg-transparent text-sm font-semibold outline-none"><option value="Todos">Todos los emprendimientos</option>{ventures.map(venture => <option key={venture.id} value={venture.id}>{venture.nombre}</option>)}</select></div></div>
      <div className="mb-6 mt-5 flex items-end justify-between"><div><p className="text-sm font-semibold text-amber-800">Catálogo local</p><h2 className="text-2xl font-black">Productos para descubrir</h2></div><span className="text-sm text-stone-500">{visible.length} {visible.length === 1 ? "producto" : "productos"}</span></div>

      {visible.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">{visible.map(product => {
        const venture = product.emprendimientos_varela
        return <article key={product.id} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
          <Link href={`/hecho-en-varela/producto/${product.slug}`} className="block aspect-[4/3] overflow-hidden bg-stone-100">
            {product.imagenes?.[0] ? <img src={product.imagenes[0]} alt={product.nombre} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-stone-400"><Store className="h-12 w-12" /></div>}
          </Link>
          <div className="p-3 sm:p-4"><div className="mb-2 flex items-start justify-between gap-2"><div className="flex flex-wrap gap-1">{(product.categorias?.length ? product.categorias : [product.categoria]).map(item => <span key={item} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 sm:text-xs">{item}</span>)}</div>{product.destacado && <span className="shrink-0 text-[10px] font-bold text-orange-600 sm:text-xs">Destacado</span>}</div>
            <Link href={`/hecho-en-varela/producto/${product.slug}`}><h3 className="text-sm font-black leading-tight group-hover:text-amber-800 sm:text-base">{product.nombre}</h3></Link>
            {venture && <Link href={`/hecho-en-varela/emprendimiento/${venture.slug}`} className="mt-1 block text-xs font-semibold text-stone-500 hover:text-amber-800 sm:text-sm">{venture.nombre}</Link>}
            <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-4 text-stone-600 sm:text-sm sm:leading-5">{product.descripcion_breve}</p>
            <p className="mt-3 text-sm font-black text-amber-900 sm:text-base">{formatPrice(product.precio, product.consultar_precio)}</p>
            <div className="mt-3 grid gap-2"><a href={whatsappUrl(venture?.whatsapp || "", product.nombre)} target="_blank" rel="noreferrer" className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-2 text-xs font-bold text-white hover:bg-[#20bd5a] sm:text-sm"><MessageCircle className="h-4 w-4" /><span className="sm:hidden">Consultar</span><span className="hidden sm:inline">Consultar por WhatsApp</span></a><Link href={`/hecho-en-varela/producto/${product.slug}`} className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-2 text-xs font-bold text-stone-700 hover:bg-stone-50 sm:text-sm">Ver producto <ArrowRight className="h-3.5 w-3.5" /></Link></div>
          </div>
        </article>})}</div> : <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"><Store className="mx-auto h-10 w-10 text-amber-700" /><h3 className="mt-4 text-xl font-black">No encontramos resultados</h3><p className="mt-2 text-stone-600">Probá con otra búsqueda, categoría o emprendimiento.</p></div>}
    </section>
  </main>
}
