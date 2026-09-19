import Link from "next/link"
import { ArrowRight, Sparkles, Store } from "lucide-react"
import { supabaseServer } from "../lib/supabaseServer"
import { formatPrice, ventureOriginLabel, type VentureOrigin } from "../lib/hechoEnVarela"
import { OptimizedImage } from "./OptimizedImage"

type PreviewProduct = {
  id: string
  nombre: string
  slug: string
  precio: number | null
  consultar_precio: boolean
  imagenes: string[]
  emprendimientos_varela: { nombre: string; origen?: VentureOrigin }
}

export async function HomeHechoEnVarela() {
  let products: PreviewProduct[] = []
  try {
    const { data, error } = await supabaseServer.from("productos_varela")
      .select("id,nombre,slug,precio,consultar_precio,imagenes,emprendimientos_varela!inner(nombre,origen)")
      .eq("activo", true).eq("emprendimientos_varela.activo", true)
      .order("destacado", { ascending: false }).order("orden").order("creado_at", { ascending: false }).order("id")
      .limit(4).abortSignal(AbortSignal.timeout(8000))
    if (!error) products = (data || []) as unknown as PreviewProduct[]
  } catch {
    // Keep the catalog entrance available if product loading fails.
  }
  return <HechoEnVarelaSection products={products}/>
}

export function HechoEnVarelaSection({ products = [] }: { products?: PreviewProduct[] }) {
  return <section id="hecho-en-varela" aria-labelledby="home-catalog-title" className="py-8 sm:py-12">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-amber-900/10 bg-gradient-to-br from-[#efe3cd] via-[#fbf7ef] to-white p-4 shadow-[0_20px_60px_-40px_rgba(120,53,15,.35)] sm:p-8">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-900"><Sparkles className="h-4 w-4" aria-hidden="true"/>Talento de nuestra tierra</p>
          <h2 id="home-catalog-title" className="mt-3 text-3xl font-black tracking-tight text-stone-900 sm:text-4xl">Hecho en Varela y la región</h2>
          <p className="mt-3 text-base leading-7 text-stone-700">Descubrí productos de artesanos y emprendedores de acá. Conocé sus creaciones y contactalos directamente.</p>
        </div>
        {products.length > 0 && <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{products.map(product => <Link key={product.id} href={`/hecho-en-varela/producto/${product.slug}`} className="group min-w-0 overflow-hidden rounded-2xl border border-amber-900/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-800">
          <div className="relative aspect-square overflow-hidden bg-stone-100">{product.imagenes?.[0] ? <OptimizedImage src={product.imagenes[0]} alt={product.nombre} sizes="(min-width: 1280px) 280px, (min-width: 1024px) 23vw, 44vw" className="object-cover transition duration-300 group-hover:scale-105"/> : <div className="flex h-full items-center justify-center"><Store className="h-12 w-12 text-amber-700/40" aria-hidden="true"/></div>}</div>
          <div className="p-3 sm:p-4"><p className="text-[11px] font-bold text-amber-800 sm:text-xs">{ventureOriginLabel(product.emprendimientos_varela.origen)}</p><h3 className="mt-1 line-clamp-2 break-words text-sm font-black text-stone-900 sm:text-lg">{product.nombre}</h3><p className="mt-1 truncate text-xs text-stone-500 sm:text-sm">{product.emprendimientos_varela.nombre}</p><p className="mt-3 text-sm font-bold text-amber-900">{formatPrice(product.precio, product.consultar_precio)}</p></div>
        </Link>)}</div>}
        <div className="mt-6 sm:mt-8"><Link href="/hecho-en-varela" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-900 px-6 py-3 font-bold text-white transition hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-900 sm:w-auto">Explorar productos<ArrowRight className="h-5 w-5" aria-hidden="true"/></Link></div>
      </div>
    </div>
  </section>
}
