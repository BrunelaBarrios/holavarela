'use client'

import type { LucideIcon } from "lucide-react"
import { Search } from "lucide-react"
import type { ReactNode } from "react"

type AdminPageHeaderProps = {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
}

export function AdminPageHeader({
  title,
  description,
  eyebrow,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold text-slate-950 md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}

type AdminNoticeProps = {
  children: ReactNode
  tone?: "neutral" | "danger" | "success" | "warning"
  className?: string
}

export function AdminNotice({
  children,
  tone = "neutral",
  className = "",
}: AdminNoticeProps) {
  const toneClasses = {
    neutral: "border-slate-200 bg-white text-slate-600",
    danger: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  }

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${toneClasses[tone]} ${className}`}
    >
      {children}
    </div>
  )
}

export function AdminLoadingPanel({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-600" />
        {label}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  )
}

type AdminEmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: AdminEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      {Icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

type AdminMetricPillProps = {
  label: string
  value: number | string
  tone?: "slate" | "amber" | "emerald" | "sky" | "rose" | "blue"
}

export function AdminMetricPill({
  label,
  value,
  tone = "slate",
}: AdminMetricPillProps) {
  const toneClasses = {
    slate: "bg-slate-50 text-slate-600",
    amber: "bg-amber-50 text-amber-800",
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    rose: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
  }

  return (
    <div className={`rounded-xl px-4 py-3 text-sm ${toneClasses[tone]}`}>
      {label}: <span className="font-semibold">{value}</span>
    </div>
  )
}

type AdminActionCardProps = {
  title: string
  description?: string
  value?: number | string
  icon: LucideIcon
  tone?: "blue" | "emerald" | "slate" | "amber" | "rose" | "violet" | "cyan" | "sky"
  onClick: () => void
}

export function AdminActionCard({
  title,
  description,
  value,
  icon: Icon,
  tone = "slate",
  onClick,
}: AdminActionCardProps) {
  const toneClasses = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    slate: "bg-slate-800",
    amber: "bg-amber-600",
    rose: "bg-rose-600",
    violet: "bg-violet-600",
    cyan: "bg-cyan-600",
    sky: "bg-sky-600",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className={`${toneClasses[tone]} rounded-xl p-2.5 text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        {value !== undefined ? (
          <span className="text-2xl font-semibold text-slate-950">{value}</span>
        ) : null}
      </div>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
    </button>
  )
}

type AdminSectionProps = {
  title: string
  description?: string
  children: ReactNode
}

export function AdminSection({ title, description, children }: AdminSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

type AdminSearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
  className = "",
}: AdminSearchInputProps) {
  return (
    <label
      className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus-within:border-blue-300 ${className}`}
    >
      <Search className="h-4 w-4 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
      />
    </label>
  )
}

type SegmentedOption<T extends string> = {
  label: string
  value: T
  tone?: "slate" | "emerald" | "sky"
}

type AdminSegmentedControlProps<T extends string> = {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
}

export function AdminSegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: AdminSegmentedControlProps<T>) {
  const activeClasses = {
    slate: "bg-slate-950 text-white",
    emerald: "bg-emerald-600 text-white",
    sky: "bg-sky-600 text-white",
  }
  const inactiveClasses = {
    slate: "bg-slate-100 text-slate-600 hover:bg-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    sky: "bg-sky-50 text-sky-700 hover:bg-sky-100",
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const tone = option.tone || "slate"
        const isActive = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive ? activeClasses[tone] : inactiveClasses[tone]
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
