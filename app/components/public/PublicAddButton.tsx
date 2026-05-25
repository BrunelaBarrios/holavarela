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
          ? "fixed bottom-6 right-6 z-[90] inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white shadow-2xl shadow-blue-950/30 transition hover:scale-105 hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          : "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-lg shadow-blue-950/20 transition hover:scale-105 hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
      }
    >
      <Plus className="h-6 w-6" />
    </Link>
  )
}
