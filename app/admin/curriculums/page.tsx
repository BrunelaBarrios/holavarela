"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Download, ExternalLink, Eye, FileText, Mail, MapPin, MessageCircle, Phone, Search, Trash2, X } from "lucide-react"

type Candidate = {
  id:string; nombre_completo:string; puesto_buscado:string|null; presentacion:string
  experiencia:string; habilidades:string; disponibilidad:string|null; localidad:string
  telefono:string|null; email:string|null; cv_url:string|null; foto_url:string|null; autoriza_publicacion:boolean
  estado:"nuevo"|"contactado"|"entrevistado"|"archivado"; notas_internas:string|null; fecha_creacion:string
}
type GeneratedCv = {
  id:string; codigo:string; nombre:string; email:string; telefono:string; modelo:string
  estado_pago:"draft"|"pending"|"approved"|"rejected"; numero_operacion:string|null
  comprobante:string|null; creado_at:string; editable_hasta:string; codigo_promocional:string|null; monto_pago:number
}

const candidateStatuses = ["nuevo","contactado","entrevistado","archivado"] as const
const paymentLabels = { draft:"Sin iniciar", pending:"Pendiente", approved:"Pagado", rejected:"Pago rechazado" }
const cvExtension = (value:string) => value.startsWith("data:image/jpeg")?"jpg":value.startsWith("data:image/png")?"png":value.startsWith("data:image/webp")?"webp":"pdf"
const whatsappNumber = (value:string) => {
  const digits=value.replace(/\D/g,"").replace(/^00/,"")
  if(digits.startsWith("598"))return digits
  return digits.length===8&&digits.startsWith("9")?`598${digits}`:digits
}
const reminderUrl = (item:GeneratedCv) => {
  const number=whatsappNumber(item.telefono)
  if(!number)return ""
  const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||"https://www.holavarela.uy"
  const continueUrl=`${siteUrl.replace(/\/$/,"")}/armar-curriculum/editar/${encodeURIComponent(item.codigo)}`
  const firstName=item.nombre.trim().split(/\s+/)[0]||""
  const message=`Hola ${firstName}, ¿cómo estás? Vimos que empezaste a crear tu currículum en Hola Varela y todavía no terminaste el proceso. Podés continuarlo acá: ${continueUrl}\n\n¿Tuviste alguna dificultad o necesitás ayuda? Estamos a las órdenes.`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export default function AdminCurriculumsPage() {
  const [tab,setTab]=useState<"received"|"generated">("received")
  const [candidates,setCandidates]=useState<Candidate[]>([])
  const [generated,setGenerated]=useState<GeneratedCv[]>([])
  const [query,setQuery]=useState("")
  const [status,setStatus]=useState("")
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState("")
  const [selected,setSelected]=useState<Candidate|null>(null)

  const load=useCallback(async()=>{
    setLoading(true);setError("")
    const params=new URLSearchParams();if(query.trim())params.set("q",query.trim());if(status)params.set("estado",status)
    const endpoint=tab==="received"?"/api/admin/candidatos-laborales":"/api/admin/curriculums"
    const response=await fetch(`${endpoint}?${params}`,{cache:"no-store"})
    const result=await response.json()
    if(response.ok){if(tab==="received")setCandidates(result.items||[]);else setGenerated(result.items||[])}
    else setError(result.error||"No se pudo cargar la información.")
    setLoading(false)
  },[query,status,tab])
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),250);return()=>window.clearTimeout(timer)},[load])

  const changeTab=(next:"received"|"generated")=>{setTab(next);setQuery("");setStatus("");setError("")}
  const updateCandidate=async(item:Candidate,changes:Partial<Candidate>)=>{
    const response=await fetch("/api/admin/candidatos-laborales",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,...changes})})
    if(response.ok){setSelected(current=>current?.id===item.id?{...current,...changes}:current);void load()}
  }
  const removeCandidate=async(item:Candidate)=>{
    if(!window.confirm(`¿Eliminar definitivamente el currículum de ${item.nombre_completo}?`))return
    const response=await fetch(`/api/admin/candidatos-laborales?id=${item.id}`,{method:"DELETE"})
    if(response.ok){setSelected(null);void load()}
  }
  const visibleCount=tab==="received"?candidates.length:generated.length
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black">Currículums</h1><p className="mt-1 text-slate-500">Encontrá candidatos y administrá los CV creados en Hola Varela.</p></div><span className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm">{visibleCount} resultados</span></div>

    <div className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-200/70 p-1.5">
      <button onClick={()=>changeTab("received")} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${tab==="received"?"bg-white text-sky-700 shadow-sm":"text-slate-600"}`}>Recibidos por búsqueda laboral</button>
      <button onClick={()=>changeTab("generated")} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${tab==="generated"?"bg-white text-sky-700 shadow-sm":"text-slate-600"}`}>Creados en Hola Varela</button>
    </div>

    <div className="mt-5 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_220px]">
      <label className="flex items-center gap-3 rounded-xl border px-4"><Search className="h-5 w-5 text-slate-400"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={tab==="received"?"Nombre, puesto, habilidad, experiencia, localidad o contacto":"Nombre, correo o teléfono"} className="w-full py-3 outline-none"/></label>
      <select value={status} onChange={event=>setStatus(event.target.value)} className="rounded-xl border px-4 py-3">
        <option value="">Todos los estados</option>
        {tab==="received"?candidateStatuses.map(value=><option key={value} value={value}>{value}</option>):<><option value="pending">Pagos pendientes</option><option value="approved">Pagados</option><option value="rejected">Pagos rechazados</option><option value="draft">Sin iniciar pago</option></>}
      </select>
    </div>

    {error?<p className="mt-6 rounded-2xl bg-red-50 p-5 text-center font-semibold text-red-700">{error}</p>:loading?<p className="py-16 text-center text-slate-500">Buscando currículums…</p>:visibleCount===0?<div className="mt-6 rounded-2xl bg-white py-16 text-center"><FileText className="mx-auto h-12 w-12 text-slate-300"/><p className="mt-3 text-slate-500">No hay currículums que coincidan.</p></div>:tab==="received"?<ReceivedTable items={candidates} onSelect={setSelected} onDelete={removeCandidate}/>:<GeneratedTable items={generated}/>}

    {selected?<div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"><div className="mx-auto my-8 max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
      <button onClick={()=>setSelected(null)} className="float-right rounded-full p-2 hover:bg-slate-100" aria-label="Cerrar"><X/></button>
      <div className="grid gap-5 sm:grid-cols-[140px_1fr] sm:items-start">
        {selected.foto_url?<div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"><Image src={selected.foto_url} alt={`Foto de ${selected.nombre_completo}`} fill unoptimized className="object-cover"/></div>:<div className="flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center text-sm font-semibold text-slate-400">Sin foto</div>}
        <div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">{selected.autoriza_publicacion?"Autoriza publicación":"Perfil privado"}</p><h2 className="mt-2 pr-12 text-3xl font-black">{selected.nombre_completo}</h2><p className="mt-1 text-lg font-semibold text-slate-600">{selected.puesto_buscado||"Búsqueda laboral general"}</p><div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600"><span className="flex items-center gap-1"><MapPin className="h-4 w-4"/>{selected.localidad}</span>{selected.telefono?<a href={`tel:${selected.telefono}`} className="flex items-center gap-1"><Phone className="h-4 w-4"/>{selected.telefono}</a>:null}{selected.email?<a href={`mailto:${selected.email}`} className="flex items-center gap-1"><Mail className="h-4 w-4"/>{selected.email}</a>:null}</div></div>
      </div>
      <Info title="Presentación" text={selected.presentacion}/><Info title="Experiencia" text={selected.experiencia}/><Info title="Habilidades" text={selected.habilidades}/>{selected.disponibilidad?<Info title="Disponibilidad" text={selected.disponibilidad}/>:null}
      <label className="mt-6 block text-sm font-bold">Notas internas<textarea defaultValue={selected.notas_internas||""} onBlur={event=>void updateCandidate(selected,{notas_internas:event.target.value})} rows={4} className="mt-2 w-full rounded-xl border p-3 font-normal"/></label>
      <div className="mt-6 flex flex-wrap gap-3"><select value={selected.estado} onChange={event=>void updateCandidate(selected,{estado:event.target.value as Candidate["estado"]})} className="rounded-xl border px-4 py-3 font-semibold">{candidateStatuses.map(value=><option key={value}>{value}</option>)}</select>{selected.cv_url?<a href={selected.cv_url} download={`CV-${selected.nombre_completo}.${cvExtension(selected.cv_url)}`} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white"><Download className="h-4 w-4"/>Descargar CV</a>:null}<button onClick={()=>void removeCandidate(selected)} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-red-50 px-5 py-3 font-bold text-red-700"><Trash2 className="h-4 w-4"/>Eliminar</button></div>
    </div></div>:null}
  </div>
}

function ReceivedTable({items,onSelect,onDelete}:{items:Candidate[];onSelect:(item:Candidate)=>void;onDelete:(item:Candidate)=>Promise<void>}){return <div className="mt-6 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Persona</th><th className="p-4">Puesto buscado</th><th className="p-4">Habilidades</th><th className="p-4">Localidad</th><th className="p-4">Contacto</th><th className="p-4">Estado</th><th className="p-4">CV</th><th className="p-4 text-right">Acciones</th></tr></thead><tbody className="divide-y">{items.map(item=><tr key={item.id} onClick={()=>onSelect(item)} className="cursor-pointer hover:bg-sky-50/60"><td className="p-4"><div className="flex items-center gap-3">{item.foto_url?<div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><Image src={item.foto_url} alt="" fill unoptimized className="object-cover"/></div>:<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-bold uppercase text-slate-400">Sin foto</div>}<div><strong className="block text-slate-950">{item.nombre_completo}</strong><span className="text-xs text-slate-500">{new Date(item.fecha_creacion).toLocaleDateString("es-UY")}</span></div></div></td><td className="p-4">{item.puesto_buscado||"General"}</td><td className="max-w-xs p-4"><span className="line-clamp-2">{item.habilidades}</span></td><td className="p-4">{item.localidad}</td><td className="p-4">{item.telefono||item.email||"Sin dato"}</td><td className="p-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase">{item.estado}</span></td><td className="p-4">{item.cv_url?<a href={item.cv_url} download={`CV-${item.nombre_completo}.${cvExtension(item.cv_url)}`} onClick={event=>event.stopPropagation()} className="inline-flex items-center gap-1 font-bold text-sky-700"><Download className="h-4 w-4"/>Descargar</a>:<span className="text-slate-400">Sin archivo</span>}</td><td className="p-4 text-right"><button type="button" onClick={event=>{event.stopPropagation();void onDelete(item)}} aria-label={`Eliminar currículum de ${item.nombre_completo}`} title="Eliminar currículum" className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"><Trash2 className="h-4 w-4"/>Eliminar</button></td></tr>)}</tbody></table></div>}
function GeneratedTable({items}:{items:GeneratedCv[]}){return <div className="mt-6 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[1180px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Persona</th><th className="p-4">Modelo</th><th className="p-4">Importe</th><th className="p-4">Operación</th><th className="p-4">Pago</th><th className="p-4">Currículum</th><th className="p-4">Creado</th><th className="p-4">Acción</th></tr></thead><tbody className="divide-y">{items.map(item=>{const available=item.estado_pago==="approved",whatsappUrl=reminderUrl(item);return <tr key={item.id}><td className="p-4"><strong className="block">{item.nombre}</strong><span className="text-slate-500">{item.email} · {item.telefono}</span></td><td className="p-4 capitalize">{item.modelo}</td><td className="p-4"><strong>${item.monto_pago}</strong>{item.codigo_promocional?<span className="block text-xs text-cyan-700">{item.codigo_promocional}</span>:null}</td><td className="p-4">{item.numero_operacion||"—"}{item.comprobante?<a href={item.comprobante} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 font-bold text-cyan-700">Ver <ExternalLink className="h-3 w-3"/></a>:null}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${available?"bg-emerald-100 text-emerald-800":item.estado_pago==="pending"?"bg-amber-100 text-amber-800":item.estado_pago==="rejected"?"bg-red-50 text-red-700":"bg-slate-100 text-slate-700"}`}>{item.monto_pago===0&&available?"Bonificado":paymentLabels[item.estado_pago]}</span></td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${available?"bg-sky-100 text-sky-800":"bg-slate-100 text-slate-500"}`}>{available?"Disponible":"Aún no disponible"}</span></td><td className="p-4">{new Date(item.creado_at).toLocaleDateString("es-UY")}</td><td className="p-4">{available?<a href={`/armar-curriculum?codigo=${encodeURIComponent(item.codigo)}&descarga=1`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 font-bold text-white transition hover:bg-sky-700"><Eye className="h-4 w-4"/>Ver CV</a>:whatsappUrl?<a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 font-bold text-white transition hover:bg-[#20bd5a]"><MessageCircle className="h-4 w-4"/>Recordar por WhatsApp</a>:<span className="text-xs font-semibold text-slate-400">Sin teléfono para recordar</span>}</td></tr>})}</tbody></table></div>}
function Info({title,text}:{title:string;text:string}){return <section className="mt-6"><h3 className="font-bold text-slate-950">{title}</h3><p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">{text}</p></section>}
