import Link from "next/link"
import { Plus } from "lucide-react"

type PublicAddButtonProps = {
  href: string
  label: string
}

export function PublicAddButton({ href, label }: PublicAddButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
    >
      <Plus className="h-6 w-6" />
    </Link>
  )
}
