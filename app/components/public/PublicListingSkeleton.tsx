import { PublicHeader } from "../PublicHeader"
import { buildPublicNav } from "../../lib/publicNav"

type PublicListingSkeletonProps = {
  active: "eventos" | "comercios" | "cursos" | "instituciones" | "servicios"
  title: string
}

export function PublicListingSkeleton({ active, title }: PublicListingSkeletonProps) {
  return (
    <main className="min-h-screen bg-white">
      <PublicHeader items={buildPublicNav(active)} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="h-9 w-56 animate-pulse rounded-xl bg-slate-200" />
            <div className="mt-3 h-5 w-72 max-w-full animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="h-14 w-full max-w-xs animate-pulse rounded-2xl bg-blue-100" />
        </div>

        <div className="mt-8 h-12 max-w-xl animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-6 flex flex-wrap gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-10 w-24 animate-pulse rounded-full bg-slate-100"
            />
          ))}
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="aspect-[4/3] animate-pulse bg-slate-100" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-4/5 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100" />
              </div>
            </div>
          ))}
        </div>

        <span className="sr-only">Cargando {title}</span>
      </div>
    </main>
  )
}
