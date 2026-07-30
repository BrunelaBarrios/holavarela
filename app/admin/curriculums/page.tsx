"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, ExternalLink, FileText, Search, X } from "lucide-react"

type Curriculum = {
  id:string; codigo:string; nombre:string; email:string; telefono:string; modelo:string
  estado_pago:"draft"|"pending"|"approved"|"rejected"; numero_operacion:string|null
  comprobante:string|null; creado_at:string; editable_hasta:string; codigo_promocional:string|null; monto_pago:number
}

const labels = { draft:"Borrador", pending:"Pago pendiente", approved:"Aprobado", rejected:"Rechazado" }

export default function AdminCurriculumsPage() {
  const [items,setItems]=useState<Curriculum[]>([])
  const [query,setQuery]=useState("")
  const [status,setStatus]=useState("")
  const [loading,setLoading]=useState(true)
  const load=useCallback(async()=>{setLoading(true);const p=new URLSearchParams();if(query)p.set("q",query);if(status)p.set("estado",status);const r=await fetch(`/api/admin/curriculums?${p}`,{cache:"no-store"});const j=await r.json();if(r.ok)setItems(j.items||[]);setLoading(false)},[query,status])
  useEffect(()=>{const timer=setTimeout(()=>void load(),250);return()=>clearTimeout(timer)},[load])
  const update=async(item:Curriculum,estado_pago:Curriculum["estado_pago"])=>{await fetch("/api/admin/curriculums",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,estado_pago})});void load()}
  return <div>
    <div><h1 className="text-3xl font-black">Currículums creados</h1><p className="mt-1 text-slate-500">Revisá pagos y habilitá las descargas.</p></div>
    <div className="mt-6 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_220px]"><label className="flex items-center gap-3 rounded-xl border px-4"><Search className="h-5 w-5 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre, correo o teléfono" className="w-full py-3 outline-none"/></label><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border px-4"><option value="">Todos los estados</option><option value="pending">Pagos pendientes</option><option value="approved">Aprobados</option><option value="rejected">Rechazados</option><option value="draft">Borradores</option></select></div>
    {loading?<p className="py-16 text-center text-slate-500">Cargando…</p>:items.length===0?<div className="mt-6 rounded-2xl bg-white py-16 text-center"><FileText className="mx-auto h-12 w-12 text-slate-300"/><p className="mt-3 text-slate-500">No hay currículums que coincidan.</p></div>:<div className="mt-6 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Persona</th><th className="p-4">Modelo</th><th className="p-4">Pago</th><th className="p-4">Operación</th><th className="p-4">Estado</th><th className="p-4">Creado</th><th className="p-4">Acciones</th></tr></thead><tbody className="divide-y">{items.map(item=><tr key={item.id}><td className="p-4"><strong className="block">{item.nombre}</strong><span className="text-slate-500">{item.email} · {item.telefono}</span></td><td className="p-4 capitalize">{item.modelo}</td><td className="p-4"><strong>${item.monto_pago}</strong>{item.codigo_promocional?<span className="block text-xs text-cyan-700">{item.codigo_promocional}</span>:null}</td><td className="p-4">{item.numero_operacion||"—"}{item.comprobante?<a href={item.comprobante} target="_blank" className="ml-2 inline-flex items-center gap-1 font-bold text-cyan-700">Ver <ExternalLink className="h-3 w-3"/></a>:null}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.estado_pago==="approved"?"bg-emerald-100 text-emerald-800":item.estado_pago==="pending"?"bg-amber-100 text-amber-800":"bg-slate-100"}`}>{labels[item.estado_pago]}</span></td><td className="p-4">{new Date(item.creado_at).toLocaleDateString("es-UY")}</td><td className="p-4"><div className="flex gap-2"><button onClick={()=>update(item,"approved")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white"><Check className="h-4 w-4"/>Aprobar</button><button onClick={()=>update(item,"rejected")} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 font-bold text-red-700"><X className="h-4 w-4"/>Rechazar</button></div></td></tr>)}</tbody></table></div>}
  </div>
}
