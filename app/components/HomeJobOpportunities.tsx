import Link from "next/link"
import { ArrowRight, BriefcaseBusiness } from "lucide-react"

export function HomeJobOpportunities() {
  return <section className="py-10 [content-visibility:auto] [contain-intrinsic-size:220px]">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <Link href="/oportunidades-laborales" className="group grid gap-6 overflow-hidden rounded-[30px] border border-sky-100 bg-[linear-gradient(135deg,#e0f2fe_0%,#f0f9ff_55%,#fff_100%)] p-7 shadow-[0_24px_60px_-40px_rgba(2,132,199,.55)] sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg"><BriefcaseBusiness className="h-8 w-8"/></div><div><h2 className="text-3xl font-black tracking-tight text-slate-950">Oportunidades Laborales</h2><p className="mt-2 text-lg text-slate-600">Encontrá propuestas de trabajo o compartí tu búsqueda laboral.</p></div><span className="inline-flex items-center gap-2 self-start rounded-full bg-slate-950 px-5 py-3 font-bold text-white transition group-hover:bg-sky-700 sm:self-auto">Ver oportunidades<ArrowRight className="h-4 w-4"/></span>
      </Link>
    </div>
  </section>
}
