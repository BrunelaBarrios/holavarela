"use client"
import { useEffect, useState } from "react"
import { Check, Clock, X } from "lucide-react"

export default function PaymentReturn({ code }: { code: string }) {
  const [status,setStatus]=useState<"checking"|"approved"|"pending"|"error">("checking")
  useEffect(()=>{
    const paymentId=new URLSearchParams(window.location.search).get("payment_id")||""
    void fetch(`/api/curriculums/payment-status?code=${encodeURIComponent(code)}&payment_id=${encodeURIComponent(paymentId)}`,{cache:"no-store"})
      .then(r=>r.json().then(j=>({r,j}))).then(({r,j})=>{if(!r.ok)throw new Error();setStatus(j.payment_status==="approved"?"approved":"pending")}).catch(()=>setStatus("error"))
  },[code])
  return <main className="grid min-h-screen place-items-center bg-slate-100 p-4"><section className="w-full max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl">
    {status==="checking"?<><Clock className="mx-auto h-14 w-14 animate-pulse text-cyan-600"/><h1 className="mt-5 text-3xl font-black">Verificando tu pago…</h1></>:null}
    {status==="approved"?<><Check className="mx-auto h-14 w-14 text-emerald-600"/><h1 className="mt-5 text-3xl font-black">¡Pago aprobado!</h1><p className="mt-3 text-slate-600">Tu currículum ya está habilitado para descargar.</p><a href={`/armar-curriculum?codigo=${code}&descarga=1`} className="btn-primary mt-7">Descargar mi currículum</a></>:null}
    {status==="pending"?<><Clock className="mx-auto h-14 w-14 text-amber-600"/><h1 className="mt-5 text-3xl font-black">Pago pendiente</h1><p className="mt-3 text-slate-600">Mercado Pago todavía está procesando el pago. Podés volver a consultar en unos minutos.</p><button onClick={()=>window.location.reload()} className="btn-primary mt-7">Consultar nuevamente</button></>:null}
    {status==="error"?<><X className="mx-auto h-14 w-14 text-red-600"/><h1 className="mt-5 text-3xl font-black">No pudimos verificar el pago</h1><p className="mt-3 text-slate-600">Tu currículum sigue guardado. Intentá nuevamente en unos minutos.</p><a href={`/armar-curriculum?codigo=${code}`} className="btn-secondary mt-7">Volver a mi currículum</a></>:null}
  </section></main>
}
