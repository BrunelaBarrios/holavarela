export function PremiumProfileLoading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)]">
      <div className="mx-auto max-w-[1520px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 h-12 w-48 animate-pulse rounded-full bg-white/90 shadow-sm" />

        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.2)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
            <div className="p-5 sm:p-7 lg:p-8">
              <div className="aspect-[4/3] w-full animate-pulse rounded-[30px] bg-slate-200" />
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-[4/3] animate-pulse rounded-[24px] bg-slate-100"
                  />
                ))}
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-8">
              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6">
                <div className="h-7 w-24 animate-pulse rounded-full bg-sky-100" />
                <div className="mt-4 h-12 w-3/4 animate-pulse rounded-2xl bg-slate-200" />
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-[68px] animate-pulse rounded-2xl bg-slate-100"
                    />
                  ))}
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-12 w-36 animate-pulse rounded-2xl bg-slate-100"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6 h-40 animate-pulse rounded-[24px] bg-slate-100" />
              <div className="mt-5 h-40 animate-pulse rounded-[24px] bg-sky-50" />
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.14)] sm:p-8">
          <div className="h-10 w-72 animate-pulse rounded-2xl bg-slate-200" />
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[28px] border border-slate-200"
              >
                <div className="h-48 animate-pulse bg-slate-100" />
                <div className="space-y-3 p-5">
                  <div className="h-6 w-2/3 animate-pulse rounded-xl bg-slate-200" />
                  <div className="h-4 w-1/2 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-20 animate-pulse rounded-2xl bg-slate-50" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
