import type { Metadata } from "next"
import PaymentReturn from "./PaymentReturn"

export const metadata: Metadata = { title: "Verificando pago | Hola Varela", robots: { index: false, follow: false } }
export default async function PaymentReturnPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  return <PaymentReturn code={codigo}/>
}
