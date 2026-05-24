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
          ? "fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          : "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
      }
    >
      <Plus className="h-6 w-6" />
    </Link>
  )
}
