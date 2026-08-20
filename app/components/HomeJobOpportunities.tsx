import Link from "next/link"
import { ArrowRight, BriefcaseBusiness, FileText } from "lucide-react"

export function HomeJobOpportunities() {
  return <section className="py-10 [content-visibility:auto] [contain-intrinsic-size:220px]">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid gap-6 overflow-hidden rounded-[30px] border border-sky-100 bg-[linear-gradient(135deg,#e0f2fe_0%,#f0f9ff_55%,#fff_100%)] p-7 shadow-[0_24px_60px_-40px_rgba(2,132,199,.55)] sm:grid-cols-[auto_1fr] sm:items-center lg:grid-cols-[auto_1fr_auto]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg"><BriefcaseBusiness className="h-8 w-8"/></div>
        <div><h2 className="text-3xl font-black tracking-tight text-slate-950">Oportunidades Laborales</h2><p className="mt-2 text-lg text-slate-600">Encontrá propuestas de trabajo, compartí tu búsqueda o creá un currículum profesional.</p></div>
        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row lg:col-span-1">
          <Link href="/oportunidades-laborales" className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-sky-700">Ver oportunidades<ArrowRight className="h-4 w-4"/></Link>
          <Link href="/armar-curriculum" className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-200 bg-white px-5 py-3 font-bold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"><FileText className="h-4 w-4"/>Crear mi currículum</Link>
        </div>
      </div>
    </div>
  </section>
}
