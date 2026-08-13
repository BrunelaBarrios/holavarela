'use client'

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, MessageCircle, Search, Sparkles, Store } from "lucide-react"
import { HECHO_EN_VARELA_CATEGORIES, formatPrice, whatsappUrl, type ProductoVarela } from "../lib/hechoEnVarela"

export function HechoEnVarelaClient({ products }: { products: ProductoVarela[] }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("Todos")
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es")
    return products.filter((product) => {
      const venture = product.emprendimientos_varela?.nombre || ""
      return (category === "Todos" || product.categoria === category) && (!term || `${product.nombre} ${venture} ${product.descripcion_breve || ""}`.toLocaleLowerCase("es").includes(term))
    })
  }, [products, query, category])

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
      <div className="mb-6 mt-5 flex items-end justify-between"><div><p className="text-sm font-semibold text-amber-800">Catálogo local</p><h2 className="text-2xl font-black">Productos para descubrir</h2></div><span className="text-sm text-stone-500">{visible.length} {visible.length === 1 ? "producto" : "productos"}</span></div>

      {visible.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visible.map(product => {
        const venture = product.emprendimientos_varela
        return <article key={product.id} className="group overflow-hidden rounded-[1.4rem] border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
          <Link href={`/hecho-en-varela/producto/${product.slug}`} className="block aspect-[4/3] overflow-hidden bg-stone-100">
            {product.imagenes?.[0] ? <img src={product.imagenes[0]} alt={product.nombre} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-stone-400"><Store className="h-12 w-12" /></div>}
          </Link>
          <div className="p-5"><div className="mb-3 flex items-start justify-between gap-3"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900">{product.categoria}</span>{product.destacado && <span className="text-xs font-bold text-orange-600">Destacado</span>}</div>
            <Link href={`/hecho-en-varela/producto/${product.slug}`}><h3 className="text-xl font-black leading-tight group-hover:text-amber-800">{product.nombre}</h3></Link>
            {venture && <Link href={`/hecho-en-varela/emprendimiento/${venture.slug}`} className="mt-1 block text-sm font-semibold text-stone-500 hover:text-amber-800">{venture.nombre}</Link>}
            <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-stone-600">{product.descripcion_breve}</p>
            <p className="mt-4 text-lg font-black text-amber-900">{formatPrice(product.precio, product.consultar_precio)}</p>
            <div className="mt-4 grid gap-2"><a href={whatsappUrl(venture?.whatsapp || "", product.nombre)} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 font-bold text-white hover:bg-[#20bd5a]"><MessageCircle className="h-5 w-5" /> Consultar por WhatsApp</a><Link href={`/hecho-en-varela/producto/${product.slug}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 font-bold text-stone-700 hover:bg-stone-50">Ver producto <ArrowRight className="h-4 w-4" /></Link></div>
          </div>
        </article>})}</div> : <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"><Store className="mx-auto h-10 w-10 text-amber-700" /><h3 className="mt-4 text-xl font-black">No encontramos resultados</h3><p className="mt-2 text-stone-600">Probá con otra búsqueda o categoría.</p></div>}
    </section>
  </main>
}
