import Link from "next/link"
import { Plus } from "lucide-react"

type PublicAddButtonProps = {
  href: string
  label: string
  variant?: "inline" | "floating"
}

export function PublicAddButton({ href, label, variant = "inline" }: PublicAddButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={
        variant === "floating"
          ? "fixed bottom-5 right-5 z-[90] inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/85 text-slate-500 shadow-md shadow-slate-950/10 backdrop-blur transition hover:border-blue-200 hover:bg-white hover:text-blue-600 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
          : "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
      }
    >
      <Plus className={variant === "floating" ? "h-5 w-5" : "h-4 w-4"} />
    </Link>
  )
}
