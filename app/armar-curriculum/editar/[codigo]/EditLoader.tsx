"use client"
import { useEffect } from "react"

export default function EditLoader({ code }: { code: string }) {
  useEffect(() => {
    window.location.replace(`/armar-curriculum?codigo=${encodeURIComponent(code)}`)
  }, [code])
  return <main className="grid min-h-screen place-items-center bg-slate-50"><p className="font-semibold text-slate-600">Abriendo tu currículum…</p></main>
}
