import type { Metadata } from "next"
import { GestionClient } from "./GestionClient"
export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Gestión | Hecho en Varela y la región", robots: { index: false, follow: false } }
export default function Page() { return <GestionClient /> }
