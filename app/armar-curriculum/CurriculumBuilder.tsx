"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Check, Download, FileText, Image as ImageIcon, Plus, Trash2, Upload } from "lucide-react"

type Entry = { company: string; role: string; start: string; end: string; current?: boolean; description: string }
type Study = { institution: string; title: string; start: string; end: string; status: string }
type Course = { name: string; institution: string; year: string; duration: string }
type Language = { language: string; level: string }
type Reference = { name: string; relation: string; phone: string; role: string }
type CvData = {
  name: string; phone: string; email: string; city: string; address: string; birth: string; document: string; photo: string
  profile: string; experiences: Entry[]; studies: Study[]; courses: Course[]; skills: string[]; languages: Language[]
  references: Reference[]; additional: string
}

const emptyEntry = (): Entry => ({ company: "", role: "", start: "", end: "", description: "" })
const emptyStudy = (): Study => ({ institution: "", title: "", start: "", end: "", status: "En curso" })
const emptyCourse = (): Course => ({ name: "", institution: "", year: "", duration: "" })
const emptyLanguage = (): Language => ({ language: "", level: "Básico" })
const emptyReference = (): Reference => ({ name: "", relation: "", phone: "", role: "" })
const initialData: CvData = {
  name: "", phone: "", email: "", city: "", address: "", birth: "", document: "", photo: "", profile: "",
  experiences: [emptyEntry()], studies: [emptyStudy()], courses: [], skills: [], languages: [], references: [], additional: "",
}
const suggestedSkills = ["Atención al público", "Ventas", "Manejo de caja", "Informática", "Word", "Excel", "Redes sociales", "Organización", "Trabajo en equipo", "Comunicación", "Vehículo propio", "Libreta de conducir"]
const steps = ["Tus datos", "Elegí el diseño", "Vista previa", "Pago", "Descarga"]

export default function CurriculumBuilder() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<CvData>(initialData)
  const [template, setTemplate] = useState<"classic" | "modern" | "simple">("modern")
  const [code, setCode] = useState("")
  const [paymentStatus, setPaymentStatus] = useState<"draft" | "pending" | "approved">("draft")
  const [operation, setOperation] = useState("")
  const [receipt, setReceipt] = useState("")
  const [promoCode, setPromoCode] = useState("")
  const [appliedPromo, setAppliedPromo] = useState<"" | "free" | "half">("")
  const [privateLink, setPrivateLink] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const previewRef = useRef<HTMLDivElement>(null)
  const paymentLink = process.env.NEXT_PUBLIC_CV_PAYMENT_LINK || "https://mpago.la/23mdEbz"
  const halfPaymentLink = process.env.NEXT_PUBLIC_CV_HALF_PAYMENT_LINK || "https://mpago.la/24GLX6R"

  useEffect(() => {
    const requestedCode = new URLSearchParams(window.location.search).get("codigo")
    const openDownloads = new URLSearchParams(window.location.search).get("descarga") === "1"
    if (!requestedCode) return
    void fetch(`/api/curriculums?code=${encodeURIComponent(requestedCode)}`, { cache: "no-store" })
      .then(response => response.json().then(result => ({ response, result })))
      .then(({ response, result }) => {
        if (!response.ok) throw new Error(result.error)
        setCode(requestedCode); setData(result.data); setTemplate(result.template); setPaymentStatus(result.payment_status)
        if (openDownloads && result.payment_status === "approved") setStep(4)
        setNotice("Recuperamos tu currículum. Podés seguir editándolo.")
      })
      .catch(() => setNotice("No pudimos recuperar ese currículum. Revisá el código privado."))
  }, [])

  useEffect(() => {
    if (code) setPrivateLink(`${window.location.origin}/armar-curriculum/editar/${code}`)
  }, [code])

  const copyPrivateLink = async () => {
    if (!privateLink) return
    await navigator.clipboard.writeText(privateLink)
    setNotice("Enlace privado copiado.")
  }

  const update = <K extends keyof CvData>(key: K, value: CvData[K]) => setData(current => ({ ...current, [key]: value }))
  const updateList = <K extends "experiences" | "studies" | "courses" | "languages" | "references">(key: K, index: number, field: string, value: string | boolean) => {
    update(key, data[key].map((item, i) => i === index ? { ...item, [field]: value } : item) as CvData[K])
  }
  const removeList = <K extends "experiences" | "studies" | "courses" | "languages" | "references">(key: K, index: number) =>
    update(key, data[key].filter((_, i) => i !== index) as CvData[K])

  const save = async (nextStep = step) => {
    if (!data.name.trim() || !data.email.trim() || !data.phone.trim() || !data.city.trim()) {
      setNotice("Completá nombre, teléfono, correo y ciudad para continuar.")
      return false
    }
    setBusy(true); setNotice("")
    try {
      const response = await fetch("/api/curriculums", {
        method: code ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, data, template }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "No pudimos guardar el currículum.")
      if (result.code) setCode(result.code)
      setStep(nextStep)
      return true
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ocurrió un error.")
      return false
    } finally { setBusy(false) }
  }

  const submitPayment = async () => {
    if (!operation.trim()) { setNotice("Ingresá el número de operación."); return }
    setBusy(true)
    const response = await fetch("/api/curriculums/payment", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, operation, receipt }),
    })
    const result = await response.json()
    setBusy(false)
    if (!response.ok) { setNotice(result.error || "No pudimos registrar el pago."); return }
    setPaymentStatus("pending"); setNotice("Recibimos tus datos. Te avisaremos cuando el pago esté confirmado.")
  }

  const startCheckout = async () => {
    setBusy(true); setNotice("")
    try {
      const response = await fetch("/api/curriculums/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "No pudimos iniciar el pago.")
      if (result.approved) { setPaymentStatus("approved"); setStep(4); return }
      window.location.href = result.url
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No pudimos iniciar el pago.")
      setBusy(false)
    }
  }

  const applyPromo = async () => {
    if (!promoCode.trim()) { setNotice("Ingresá un código de descuento."); return }
    setBusy(true); setNotice("")
    const response = await fetch("/api/curriculums/promo", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, promo: promoCode }),
    })
    const result = await response.json()
    setBusy(false)
    if (!response.ok) { setNotice(result.error || "El código no es válido."); return }
    setAppliedPromo(result.promo)
    if (result.promo === "free") {
      setPaymentStatus("approved")
      setNotice("¡Código gratuito aplicado! Ya podés acceder a las descargas.")
    } else setNotice("Código aplicado: ahora pagás $100.")
  }

  const refreshStatus = async () => {
    const response = await fetch(`/api/curriculums?code=${encodeURIComponent(code)}`, { cache: "no-store" })
    const result = await response.json()
    if (response.ok) {
      setPaymentStatus(result.payment_status)
      setNotice(result.payment_status === "approved" ? "¡Pago aprobado! Ya podés descargar tu currículum." : "El pago todavía está pendiente de confirmación.")
    }
  }

  const download = async (format: "pdf" | "image") => {
    if (paymentStatus !== "approved" || !previewRef.current) return
    const node = previewRef.current
    setBusy(true); setNotice("Preparando tu archivo…")
    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: 794,
      })
      if (format === "image") {
        const link = document.createElement("a")
        link.download = `CV-${data.name || "curriculum"}.png`
        link.href = canvas.toDataURL("image/png", 1)
        link.click()
      } else {
        const { jsPDF } = await import("jspdf")
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true })
        const pageWidth = 210
        const pageHeight = 297
        const renderedHeight = canvas.height * pageWidth / canvas.width
        const imageData = canvas.toDataURL("image/jpeg", .97)
        let offset = 0
        while (offset < renderedHeight) {
          if (offset > 0) pdf.addPage()
          pdf.addImage(imageData, "JPEG", 0, -offset, pageWidth, renderedHeight, undefined, "FAST")
          offset += pageHeight
        }
        pdf.save(`CV-${data.name || "curriculum"}.pdf`)
      }
      setNotice("Archivo generado correctamente.")
    } catch {
      setNotice("No pudimos generar el archivo. Probá nuevamente desde Chrome o Edge.")
    } finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-[#f5f7f8] text-slate-900">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
      <a href="/" className="text-lg font-black tracking-tight">HOLA <span className="text-cyan-600">VARELA</span></a>
      <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">Costo único: $200</span>
    </div></header>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      {step === 0 ? <section className="mb-10 grid items-center gap-8 rounded-[2rem] bg-[#082f49] px-6 py-10 text-white shadow-xl sm:px-10 lg:grid-cols-[1fr_380px] lg:px-14">
        <div><p className="mb-4 text-sm font-bold uppercase tracking-[.2em] text-cyan-300">Currículum profesional</p><h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-5xl">Armá un currículum que te represente.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-200">Completá tus datos, elegí el diseño que más te guste y mirá cómo queda antes de pagar.</p></div>
        <div className="rounded-3xl bg-white p-6 text-slate-900"><p className="text-sm font-bold text-slate-500">UN SOLO PAGO</p><p className="mt-1 text-5xl font-black">$200</p><p className="mt-3 leading-6 text-slate-600">Incluye PDF, imagen y 30 días para editar y volver a descargar.</p><button onClick={() => document.getElementById("builder")?.scrollIntoView({ behavior: "smooth" })} className="mt-6 w-full rounded-xl bg-cyan-500 px-5 py-4 font-black text-slate-950">Comenzar mi currículum</button></div>
      </section> : null}

      <nav aria-label="Progreso" className="mb-7 overflow-x-auto"><ol className="flex min-w-[680px] items-center justify-between">{steps.map((label, index) => <li key={label} className="flex flex-1 items-center last:flex-none">
        <button onClick={() => index <= step && setStep(index)} disabled={index > step} className="flex items-center gap-2 text-left disabled:cursor-default"><span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-black ${index <= step ? "bg-cyan-600 text-white" : "bg-slate-200 text-slate-500"}`}>{index < step ? <Check className="h-4 w-4"/> : index + 1}</span><span className={`text-sm font-bold ${index <= step ? "text-slate-900" : "text-slate-400"}`}>{label}</span></button>{index < 4 ? <span className="mx-3 h-px flex-1 bg-slate-300"/> : null}
      </li>)}</ol></nav>

      <section id="builder" className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        {step === 0 ? <DataForm data={data} update={update} updateList={updateList} removeList={removeList}/> : null}
        {step === 1 ? <TemplatePicker value={template} onChange={setTemplate} data={data}/> : null}
        {step === 2 ? <div><SectionHeading eyebrow="Paso 3" title="Revisá cómo quedó" text="Podés volver a editar tus datos o cambiar el diseño antes de continuar."/><div className="mt-8 overflow-auto rounded-2xl bg-slate-100 p-3 sm:p-8"><CvPreview ref={previewRef} data={data} template={template} watermark/></div></div> : null}
        {step === 3 ? <PaymentStep price={appliedPromo==="half"?100:200} status={paymentStatus} busy={busy} checkout={startCheckout} promoCode={promoCode} setPromoCode={setPromoCode} applyPromo={applyPromo} appliedPromo={appliedPromo}/> : null}
        {step === 4 ? <div className="py-8 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-8 w-8"/></div><h2 className="mt-5 text-3xl font-black">¡Tu currículum está pronto!</h2><p className="mx-auto mt-3 max-w-xl text-slate-600">Ya podés descargarlo y comenzar a enviarlo a las oportunidades laborales que te interesen.</p><div className="mx-auto mt-8 max-w-[820px] overflow-auto rounded-2xl bg-slate-100 p-3"><CvPreview ref={previewRef} data={data} template={template}/></div><div className="mt-7 flex flex-wrap justify-center gap-3"><button onClick={() => download("pdf")} className="btn-primary"><Download/>Descargar en PDF</button><button onClick={() => download("image")} className="btn-secondary"><ImageIcon/>Descargar como imagen</button><button onClick={() => setStep(0)} className="btn-secondary">Editar mi currículum</button></div></div> : null}
        {notice ? <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{notice}</p> : null}
        {step < 3 ? <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-6">{step > 0 ? <button onClick={() => setStep(step - 1)} className="btn-secondary"><ArrowLeft/>Volver</button> : <span/>}<button disabled={busy} onClick={() => void save(step + 1)} className="btn-primary">{busy ? "Guardando..." : step === 2 ? "Continuar para descargar" : "Continuar"}<ArrowRight/></button></div> : null}
        {step === 3 && paymentStatus === "approved" ? <div className="mt-6 flex justify-end"><button onClick={() => setStep(4)} className="btn-primary">Ir a descargas<ArrowRight/></button></div> : null}
      </section>
      {code ? <section className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-200 font-black text-amber-900">!</div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-amber-950">Guardá este enlace privado</h2>
            <p className="mt-1 text-sm leading-6 text-amber-900">Lo vas a necesitar si querés cambiar cualquier dato, elegir otro diseño o volver a descargar tu currículum durante los próximos 30 días.</p>
            <div className="mt-4 rounded-xl bg-amber-100 p-4 text-sm leading-6 text-amber-950"><strong className="block">Este enlace no es tu currículum.</strong>No lo uses para postularte ni lo envíes a empresas. Para buscar trabajo, enviá el archivo PDF o la imagen que descargaste.</div>
            <div className="mt-4 break-all rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{privateLink}</div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => void copyPrivateLink()} className="btn-primary">Copiar enlace</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Mi enlace privado para editar el currículum: ${privateLink}`)}`} target="_blank" rel="noreferrer" className="btn-secondary">Enviármelo por WhatsApp</a>
              <a href={privateLink} className="btn-secondary">Editar mi currículum</a>
            </div>
            <p className="mt-4 text-xs font-bold text-amber-900">Este enlace sirve solamente para editar. No lo compartas públicamente: cualquier persona que lo tenga podrá cambiar tu información.</p>
          </div>
        </div>
      </section> : null}
    </div>
  </main>
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div><p className="text-sm font-black uppercase tracking-[.18em] text-cyan-700">{eyebrow}</p><h2 className="mt-2 text-3xl font-black">{title}</h2><p className="mt-2 text-slate-600">{text}</p></div>
}
function Field({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (v:string)=>void; type?: string; required?: boolean; placeholder?: string }) {
  return <label className="block text-sm font-bold text-slate-700">{label}{required ? " *" : ""}<input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"/></label>
}
function DataForm({ data, update, updateList, removeList }: any) {
  const readPhoto = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => update("photo", String(reader.result)); reader.readAsDataURL(file) }
  return <div><SectionHeading eyebrow="Paso 1" title="Contanos sobre vos" text="Solo los campos marcados con * son obligatorios. Podés editar todo más adelante."/>
    <FormSection title="Datos personales"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre y apellido" value={data.name} onChange={(v:string)=>update("name",v)} required/><Field label="Teléfono" value={data.phone} onChange={(v:string)=>update("phone",v)} required/><Field label="Correo electrónico" value={data.email} type="email" onChange={(v:string)=>update("email",v)} required/><Field label="Ciudad y departamento" value={data.city} onChange={(v:string)=>update("city",v)} required/><Field label="Dirección" value={data.address} onChange={(v:string)=>update("address",v)}/><Field label="Fecha de nacimiento" value={data.birth} type="date" onChange={(v:string)=>update("birth",v)}/><Field label="Documento de identidad" value={data.document} onChange={(v:string)=>update("document",v)}/><label className="block text-sm font-bold">Fotografía (opcional)<span className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 font-normal"><Upload className="h-4 w-4"/>Elegir imagen<input type="file" accept="image/*" className="hidden" onChange={e=>readPhoto(e.target.files?.[0])}/></span></label></div></FormSection>
    <FormSection title="Perfil personal o profesional"><textarea rows={5} value={data.profile} onChange={e=>update("profile",e.target.value)} placeholder="Soy una persona responsable, puntual y con ganas de aprender..." className="w-full rounded-xl border border-slate-300 p-4 outline-none focus:border-cyan-600"/></FormSection>
    <RepeatSection title="Experiencia laboral" items={data.experiences} add={()=>update("experiences",[...data.experiences,emptyEntry()])} addLabel="Agregar otra experiencia">{data.experiences.map((x:Entry,i:number)=><Card key={i} remove={()=>removeList("experiences",i)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Empresa o comercio" value={x.company} onChange={v=>updateList("experiences",i,"company",v)}/><Field label="Cargo o tarea" value={x.role} onChange={v=>updateList("experiences",i,"role",v)}/><Field label="Fecha de inicio" type="month" value={x.start} onChange={v=>updateList("experiences",i,"start",v)}/><Field label="Fecha de finalización" type="month" value={x.end} onChange={v=>updateList("experiences",i,"end",v)}/></div><label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={x.current||false} onChange={e=>updateList("experiences",i,"current",e.target.checked)}/>Actualmente trabajo aquí</label><textarea value={x.description} onChange={e=>updateList("experiences",i,"description",e.target.value)} placeholder="Tareas realizadas" rows={3} className="mt-4 w-full rounded-xl border p-3"/></Card>)}</RepeatSection>
    <RepeatSection title="Formación académica" items={data.studies} add={()=>update("studies",[...data.studies,emptyStudy()])} addLabel="Agregar otra formación">{data.studies.map((x:Study,i:number)=><Card key={i} remove={()=>removeList("studies",i)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Institución" value={x.institution} onChange={v=>updateList("studies",i,"institution",v)}/><Field label="Curso, carrera o nivel" value={x.title} onChange={v=>updateList("studies",i,"title",v)}/><Field label="Inicio" type="month" value={x.start} onChange={v=>updateList("studies",i,"start",v)}/><Field label="Finalización" type="month" value={x.end} onChange={v=>updateList("studies",i,"end",v)}/></div><select value={x.status} onChange={e=>updateList("studies",i,"status",e.target.value)} className="mt-4 rounded-xl border px-4 py-3"><option>Completo</option><option>Incompleto</option><option>En curso</option></select></Card>)}</RepeatSection>
    <RepeatSection title="Cursos y capacitaciones" items={data.courses} add={()=>update("courses",[...data.courses,emptyCourse()])} addLabel="Agregar curso">{data.courses.map((x:Course,i:number)=><Card key={i} remove={()=>removeList("courses",i)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre del curso" value={x.name} onChange={v=>updateList("courses",i,"name",v)}/><Field label="Institución" value={x.institution} onChange={v=>updateList("courses",i,"institution",v)}/><Field label="Año" value={x.year} onChange={v=>updateList("courses",i,"year",v)}/><Field label="Duración" value={x.duration} onChange={v=>updateList("courses",i,"duration",v)}/></div></Card>)}</RepeatSection>
    <FormSection title="Habilidades"><div className="flex flex-wrap gap-2">{suggestedSkills.map(skill=><button type="button" key={skill} onClick={()=>update("skills",data.skills.includes(skill)?data.skills.filter((x:string)=>x!==skill):[...data.skills,skill])} className={`rounded-full border px-4 py-2 text-sm font-semibold ${data.skills.includes(skill)?"border-cyan-600 bg-cyan-50 text-cyan-800":"border-slate-300"}`}>{data.skills.includes(skill)?"✓ ":""}{skill}</button>)}</div></FormSection>
    <RepeatSection title="Idiomas" items={data.languages} add={()=>update("languages",[...data.languages,emptyLanguage()])} addLabel="Agregar idioma">{data.languages.map((x:Language,i:number)=><Card key={i} remove={()=>removeList("languages",i)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Idioma" value={x.language} onChange={v=>updateList("languages",i,"language",v)}/><label className="text-sm font-bold">Nivel<select value={x.level} onChange={e=>updateList("languages",i,"level",e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal"><option>Básico</option><option>Intermedio</option><option>Avanzado</option></select></label></div></Card>)}</RepeatSection>
    <RepeatSection title="Referencias laborales (opcional)" items={data.references} add={()=>update("references",[...data.references,emptyReference()])} addLabel="Agregar referencia">{data.references.map((x:Reference,i:number)=><Card key={i} remove={()=>removeList("references",i)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre" value={x.name} onChange={v=>updateList("references",i,"name",v)}/><Field label="Empresa o vínculo" value={x.relation} onChange={v=>updateList("references",i,"relation",v)}/><Field label="Teléfono" value={x.phone} onChange={v=>updateList("references",i,"phone",v)}/><Field label="Cargo" value={x.role} onChange={v=>updateList("references",i,"role",v)}/></div></Card>)}</RepeatSection>
    <FormSection title="Información adicional"><textarea rows={4} value={data.additional} onChange={e=>update("additional",e.target.value)} placeholder="Disponibilidad horaria, posibilidad de viajar, carné de salud u otras observaciones." className="w-full rounded-xl border p-4"/></FormSection>
  </div>
}
function FormSection({title,children}:{title:string;children:React.ReactNode}) { return <section className="mt-9 border-t border-slate-200 pt-7"><h3 className="mb-5 text-xl font-black">{title}</h3>{children}</section> }
function RepeatSection({title,children,add,addLabel}:{title:string;items:any[];children:React.ReactNode;add:()=>void;addLabel:string}) { return <FormSection title={title}>{children}<button type="button" onClick={add} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-600 px-4 py-3 text-sm font-bold text-cyan-800"><Plus className="h-4 w-4"/>{addLabel}</button></FormSection> }
function Card({children,remove}:{children:React.ReactNode;remove:()=>void}) { return <div className="relative mb-4 rounded-2xl bg-slate-50 p-4 sm:p-5"><button onClick={remove} type="button" aria-label="Eliminar" className="absolute right-3 top-3 rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4"/></button><div className="pr-9">{children}</div></div> }
function TemplatePicker({value,onChange,data}:{value:string;onChange:(v:any)=>void;data:CvData}) { const options=[["classic","Clásico","Formal, neutro y en una columna."],["modern","Moderno","Dos columnas y espacio para fotografía."],["simple","Simple","Minimalista, claro y sin fotografía."]]; return <div><SectionHeading eyebrow="Paso 2" title="Elegí el diseño" text="La información es la misma: elegí la presentación que mejor se adapte a vos."/><div className="mt-8 grid gap-5 lg:grid-cols-3">{options.map(([id,title,text])=><button key={id} onClick={()=>onChange(id)} className={`rounded-2xl border-2 p-3 text-left ${value===id?"border-cyan-600 bg-cyan-50":"border-slate-200"}`}><div className="h-72 overflow-hidden rounded-xl bg-slate-100 p-3"><div className="origin-top scale-[.34]"><CvPreview data={data} template={id as any}/></div></div><div className="p-3"><span className="flex items-center justify-between text-lg font-black">{title}{value===id?<Check className="text-cyan-700"/>:null}</span><p className="mt-1 text-sm text-slate-600">{text}</p></div></button>)}</div></div> }
const CvPreview = ({data,template,watermark=false,ref}:{data:CvData;template:"classic"|"modern"|"simple";watermark?:boolean;ref?:React.Ref<HTMLDivElement>}) => {
  const filtered = useMemo(()=>({experiences:data.experiences.filter(x=>x.company||x.role),studies:data.studies.filter(x=>x.institution||x.title),courses:data.courses.filter(x=>x.name),languages:data.languages.filter(x=>x.language),references:data.references.filter(x=>x.name)}),[data])
  return <div ref={ref} className={`relative mx-auto min-h-[1123px] w-[794px] overflow-hidden bg-white text-slate-800 shadow-lg cv-${template}`}>
    {watermark?<div className="pointer-events-none absolute inset-0 z-20 grid place-items-center text-7xl font-black tracking-widest text-slate-900/10 -rotate-45">VISTA PREVIA</div>:null}
    {template==="modern"?<div className="grid min-h-[1123px] grid-cols-[245px_1fr]"><aside className="bg-[#0e3a4c] p-8 text-white">{data.photo?<img src={data.photo} alt="" className="mb-7 h-40 w-40 rounded-full object-cover"/>:null}<h1 className="text-3xl font-black leading-tight">{data.name||"Tu nombre"}</h1><CvAside data={data}/></aside><div className="p-10"><CvMain data={data} filtered={filtered}/></div></div>:<div className={`p-12 ${template==="simple"?"font-[Arial]":""}`}><header className={`border-b pb-7 ${template==="classic"?"border-slate-900":"border-slate-300 text-center"}`}><div className="flex items-center gap-6">{template==="classic"&&data.photo?<img src={data.photo} alt="" className="h-28 w-28 rounded-lg object-cover"/>:null}<div className={template==="simple"?"w-full":""}><h1 className="text-4xl font-black uppercase tracking-wide">{data.name||"Tu nombre"}</h1><p className="mt-3 text-sm">{[data.phone,data.email,data.city].filter(Boolean).join("  ·  ")}</p></div></div></header><CvMain data={data} filtered={filtered}/></div>}
  </div>
}
function CvAside({data}:{data:CvData}) { return <div className="mt-8 space-y-7 text-sm"><CvBlock title="Contacto"><p>{data.phone}</p><p className="break-all">{data.email}</p><p>{data.city}</p><p>{data.address}</p></CvBlock>{data.skills.length?<CvBlock title="Habilidades"><ul className="space-y-2">{data.skills.map(x=><li key={x}>• {x}</li>)}</ul></CvBlock>:null}{data.languages.length?<CvBlock title="Idiomas">{data.languages.filter(x=>x.language).map((x,i)=><p key={i}>{x.language} · {x.level}</p>)}</CvBlock>:null}</div> }
function CvMain({data,filtered}:{data:CvData;filtered:any}) { return <div className="mt-8 space-y-7">{data.profile?<CvBlock title="Perfil"><p className="leading-6">{data.profile}</p></CvBlock>:null}{filtered.experiences.length?<CvBlock title="Experiencia laboral">{filtered.experiences.map((x:Entry,i:number)=><CvItem key={i} title={x.role||x.company} meta={`${x.company}${x.start?` · ${x.start} — ${x.current?"Actualidad":x.end}`:""}`} text={x.description}/>)}</CvBlock>:null}{filtered.studies.length?<CvBlock title="Formación">{filtered.studies.map((x:Study,i:number)=><CvItem key={i} title={x.title||x.institution} meta={`${x.institution} · ${x.status}`} text={[x.start,x.end].filter(Boolean).join(" — ")}/>)}</CvBlock>:null}{filtered.courses.length?<CvBlock title="Cursos y capacitaciones">{filtered.courses.map((x:Course,i:number)=><CvItem key={i} title={x.name} meta={[x.institution,x.year,x.duration].filter(Boolean).join(" · ")}/>)}</CvBlock>:null}{data.skills.length?<CvBlock title="Habilidades"><p>{data.skills.join(" · ")}</p></CvBlock>:null}{filtered.references.length?<CvBlock title="Referencias">{filtered.references.map((x:Reference,i:number)=><CvItem key={i} title={x.name} meta={[x.relation,x.role,x.phone].filter(Boolean).join(" · ")}/>)}</CvBlock>:null}{data.additional?<CvBlock title="Información adicional"><p className="whitespace-pre-wrap">{data.additional}</p></CvBlock>:null}</div> }
function CvBlock({title,children}:{title:string;children:React.ReactNode}) { return <section><h2 className="mb-3 border-b border-current pb-2 text-sm font-black uppercase tracking-[.16em]">{title}</h2>{children}</section> }
function CvItem({title,meta,text}:{title:string;meta?:string;text?:string}) { return <div className="mb-4"><h3 className="font-black">{title}</h3>{meta?<p className="mt-1 text-sm font-semibold opacity-70">{meta}</p>:null}{text?<p className="mt-2 whitespace-pre-wrap text-sm leading-6">{text}</p>:null}</div> }
function PaymentStep({price,status,busy,checkout,promoCode,setPromoCode,applyPromo,appliedPromo}:any) { return <div className="mx-auto max-w-2xl py-4"><SectionHeading eyebrow="Paso 4" title="Tu currículum está pronto" text="Para descargarlo en formato PDF e imagen, realizá un único pago de:"/><div className="my-7 rounded-3xl bg-[#082f49] p-7 text-center text-white"><p className="text-sm font-bold uppercase tracking-widest text-cyan-300">Total</p><p className="mt-2 text-6xl font-black">{status==="approved"?"$0":`$${price}`}</p>{appliedPromo?<p className="mt-2 font-bold text-emerald-300">{appliedPromo==="free"?"Código gratuito aplicado":"50% de descuento aplicado"}</p>:null}<ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-slate-200"><li>✓ Descarga en PDF y como imagen</li><li>✓ Una o varias páginas</li><li>✓ 30 días para editar y volver a descargar</li></ul>{status!=="approved"?<button onClick={checkout} disabled={busy} className="mt-7 w-full rounded-xl bg-cyan-400 px-5 py-4 font-black text-slate-950 disabled:opacity-60">{busy?"Abriendo Mercado Pago…":`Pagar $${price} con Mercado Pago`}</button>:null}</div><div className="mb-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-5"><h3 className="font-black">¿Tenés un código?</h3><div className="mt-3 flex gap-2"><input value={promoCode} onChange={e=>setPromoCode(e.target.value.toUpperCase())} disabled={!!appliedPromo} placeholder="Ingresá tu código" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold uppercase"/><button onClick={applyPromo} disabled={busy||!!appliedPromo} className="btn-secondary">Aplicar</button></div></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900"><strong className="block">Confirmación automática</strong>Cuando completes el pago, Mercado Pago te traerá nuevamente a Hola Varela y habilitará la descarga. No necesitás ingresar números de operación ni enviar comprobantes.</div></div> }
