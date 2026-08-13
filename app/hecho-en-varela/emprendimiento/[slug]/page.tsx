import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Instagram, MessageCircle, PackageCheck, Store } from "lucide-react"
import { PublicHeader } from "../../../components/PublicHeader"
import { formatPrice, type EmprendimientoVarela, type ProductoVarela } from "../../../lib/hechoEnVarela"
import { supabaseServer } from "../../../lib/supabaseServer"

export const revalidate = 300

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = await supabaseServer.from("emprendimientos_varela").select("*").eq("slug", slug).eq("activo", true).maybeSingle()
  if (!data) notFound()
  const venture = data as EmprendimientoVarela
  const { data: rows } = await supabaseServer.from("productos_varela").select("*").eq("emprendimiento_id", venture.id).eq("activo", true).order("orden")
  const products = (rows || []) as ProductoVarela[]

  return <><PublicHeader items={[]} /><main className="min-h-screen bg-[#fbf7ef]"><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><Link href="/hecho-en-varela" className="inline-flex items-center gap-1 text-sm font-bold text-stone-600"><ChevronLeft className="h-4 w-4" /> Volver al catálogo</Link>
    <header className="mt-6 rounded-3xl bg-[#efe3cd] p-6 sm:p-9"><div className="flex flex-col gap-5 sm:flex-row sm:items-center">{venture.logo_url ? <img src={venture.logo_url} alt={venture.nombre} className="h-24 w-24 rounded-3xl object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white"><Store className="h-10 w-10 text-amber-800" /></div>}<div><p className="text-sm font-bold uppercase tracking-widest text-amber-800">Emprendimiento local</p><h1 className="mt-1 text-4xl font-black">{venture.nombre}</h1><p className="mt-3 max-w-2xl leading-7 text-stone-700">{venture.descripcion}</p></div></div>
      <div className="mt-6 flex flex-wrap gap-3"><a href={`https://wa.me/${venture.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 font-bold text-white"><MessageCircle className="h-5 w-5" /> WhatsApp</a>{venture.instagram_url && <a href={venture.instagram_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-bold"><Instagram className="h-5 w-5" /> Instagram</a>}{venture.redes_url && <a href={venture.redes_url} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-4 py-3 font-bold">Otra red social</a>}</div>{venture.modalidad_entrega && <p className="mt-5 flex items-start gap-2 text-sm text-stone-700"><PackageCheck className="mt-0.5 h-5 w-5 shrink-0" /> {venture.modalidad_entrega}</p>}</header>
    <h2 className="mb-5 mt-10 text-2xl font-black">Productos publicados</h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map(product => <Link key={product.id} href={`/hecho-en-varela/producto/${product.slug}`} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="aspect-[4/3] bg-stone-100">{product.imagenes?.[0] && <img src={product.imagenes[0]} alt={product.nombre} className="h-full w-full object-cover" />}</div><div className="p-4"><p className="text-xs font-bold text-amber-800">{product.categoria}</p><h3 className="mt-1 text-lg font-black">{product.nombre}</h3><p className="mt-2 font-bold text-amber-900">{formatPrice(product.precio, product.consultar_precio)}</p></div></Link>)}</div>
  </div></main></>
}
