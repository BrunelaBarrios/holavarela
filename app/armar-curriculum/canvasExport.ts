import type { CvData } from "./CurriculumBuilder"

const W = 1240
const H = 1754
const M = 86
const BOTTOM = H - 88
const FONT = "Arial, Helvetica, sans-serif"

type Template = "classic" | "modern" | "simple"
type Page = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; y: number; contentX: number; contentW: number }

const clean = (value: unknown) => typeof value === "string" ? value.trim() : ""
const month = (value: string) => value ? value.split("-").reverse().join("/") : ""

function makePage(template: Template, pageNumber: number): Page {
  const canvas = document.createElement("canvas")
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas no disponible")
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,W,H)
  if (template === "modern") {
    ctx.fillStyle = "#0e3a4c"; ctx.fillRect(0,0,355,H)
    return { canvas, ctx, y: pageNumber === 0 ? 92 : 100, contentX: 415, contentW: W-415-M }
  }
  return { canvas, ctx, y: pageNumber === 0 ? 92 : 100, contentX: M, contentW: W-M*2 }
}

function lines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const result: string[] = []
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (!words.length) continue
    let line = words[0]
    for (let i=1;i<words.length;i++) {
      const next = `${line} ${words[i]}`
      if (ctx.measureText(next).width <= maxWidth) line = next
      else { result.push(line); line = words[i] }
    }
    result.push(line)
  }
  return result
}

function write(page: Page, text: string, options?: { size?:number; weight?:number; color?:string; lineHeight?:number; x?:number; width?:number; align?:CanvasTextAlign }) {
  const size=options?.size||25, weight=options?.weight||400, lineHeight=options?.lineHeight||Math.round(size*1.45)
  const x=options?.x??page.contentX, width=options?.width??page.contentW
  page.ctx.font=`${weight} ${size}px ${FONT}`;page.ctx.fillStyle=options?.color||"#334155";page.ctx.textAlign=options?.align||"left";page.ctx.textBaseline="alphabetic"
  const wrapped=lines(page.ctx,text,width)
  wrapped.forEach(line=>{page.ctx.fillText(line,x,page.y,width);page.y+=lineHeight})
}

function sectionTitle(page: Page, title: string, color: string) {
  page.y += 22
  page.ctx.font=`700 21px ${FONT}`;page.ctx.fillStyle=color;page.ctx.textAlign="left"
  page.ctx.fillText(title.toUpperCase(),page.contentX,page.y)
  page.y += 13;page.ctx.fillRect(page.contentX,page.y,page.contentW,2);page.y += 28
}

async function loadPhoto(src: string) {
  if (!src) return null
  return new Promise<HTMLImageElement|null>(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=src})
}

function drawCover(page: Page, data: CvData, template: Template, photo: HTMLImageElement|null) {
  const ctx=page.ctx
  if (template==="modern") {
    if(photo){ctx.save();ctx.beginPath();ctx.arc(177,170,94,0,Math.PI*2);ctx.clip();ctx.drawImage(photo,83,76,188,188);ctx.restore();page.y=300}
    ctx.fillStyle="#ffffff";ctx.font=`800 42px ${FONT}`;ctx.textAlign="left"
    const nameLines=lines(ctx,data.name||"Tu nombre",270);nameLines.forEach(line=>{ctx.fillText(line,48,page.y,270);page.y+=52})
    page.y+=25
    const side=(title:string,values:string[])=>{ctx.font=`700 19px ${FONT}`;ctx.fillStyle="#67e8f9";ctx.fillText(title.toUpperCase(),48,page.y);page.y+=30;ctx.font=`400 19px ${FONT}`;ctx.fillStyle="#ffffff";values.filter(Boolean).forEach(value=>{lines(ctx,value,260).forEach(line=>{ctx.fillText(line,48,page.y,260);page.y+=28})});page.y+=28}
    side("Contacto",[data.phone,data.email,data.city,data.address])
    if(data.skills.length)side("Habilidades",data.skills.map(value=>`• ${value}`))
    if(data.languages.some(x=>x.language))side("Idiomas",data.languages.filter(x=>x.language).map(x=>`${x.language} · ${x.level}`))
    page.y=95
    return
  }
  if(template==="classic"&&photo){ctx.drawImage(photo,M,84,150,150)}
  const center=template==="simple", x=template==="classic"&&photo?M+185:M
  ctx.fillStyle="#0f172a";ctx.font=`800 52px ${FONT}`;ctx.textAlign=center?"center":"left"
  ctx.fillText((data.name||"Tu nombre").toUpperCase(),center?W/2:x,140,W-M*2)
  ctx.font=`400 20px ${FONT}`;ctx.fillStyle="#475569"
  ctx.fillText([data.phone,data.email,data.city].filter(Boolean).join("  ·  "),center?W/2:x,190,W-M*2)
  ctx.fillStyle=template==="classic"?"#0f172a":"#cbd5e1";ctx.fillRect(M,235,W-M*2,3);page.y=285;ctx.textAlign="left"
}

export async function renderCvCanvases(data: CvData, template: Template) {
  const pages: Page[]=[]
  const photo=await loadPhoto(data.photo)
  let page=makePage(template,0);pages.push(page);drawCover(page,data,template,photo)
  const accent=template==="modern"?"#0e7490":"#0f172a"
  const nextPage=()=>{page=makePage(template,pages.length);pages.push(page);return page}
  const ensure=(height=130)=>{if(page.y+height>BOTTOM)nextPage()}
  const section=(title:string, entries:Array<{title?:string;meta?:string;text?:string}>)=>{
    if(!entries.length)return
    ensure(100);sectionTitle(page,title,accent)
    for(const entry of entries){
      const combined=[entry.title,entry.meta,entry.text].filter(Boolean).join(" ")
      page.ctx.font=`400 23px ${FONT}`;const estimate=lines(page.ctx,combined,page.contentW).length*36+55
      ensure(Math.min(estimate,260))
      if(page.y<140)sectionTitle(page,title,accent)
      if(entry.title)write(page,entry.title,{size:26,weight:700,color:"#0f172a",lineHeight:34})
      if(entry.meta)write(page,entry.meta,{size:19,weight:600,color:"#64748b",lineHeight:28})
      if(entry.text)write(page,entry.text,{size:22,color:"#334155",lineHeight:33})
      page.y+=22
    }
  }
  if(data.profile)section("Perfil",[{text:data.profile}])
  section("Experiencia laboral",data.experiences.filter(x=>x.company||x.role).map(x=>({
    title:x.role||x.company,meta:[x.company,x.start?`${month(x.start)} — ${x.current?"Actualidad":month(x.end)}`:""].filter(Boolean).join(" · "),text:x.description
  })))
  section("Formación",data.studies.filter(x=>x.institution||x.title).map(x=>({
    title:x.title||x.institution,meta:[x.institution,x.status,[month(x.start),month(x.end)].filter(Boolean).join(" — ")].filter(Boolean).join(" · ")
  })))
  section("Cursos y capacitaciones",data.courses.filter(x=>x.name).map(x=>({
    title:x.name,meta:[x.institution,x.year,x.duration].filter(Boolean).join(" · ")
  })))
  if(template!=="modern"&&data.skills.length)section("Habilidades",[{text:data.skills.join(" · ")}])
  if(template!=="modern"&&data.languages.some(x=>x.language))section("Idiomas",data.languages.filter(x=>x.language).map(x=>({title:x.language,meta:x.level})))
  section("Referencias",data.references.filter(x=>x.name).map(x=>({title:x.name,meta:[x.relation,x.role,x.phone].filter(Boolean).join(" · ")})))
  if(clean(data.additional))section("Información adicional",[{text:data.additional}])
  pages.forEach((item,index)=>{item.ctx.font=`400 16px ${FONT}`;item.ctx.fillStyle=template==="modern"?"#64748b":"#94a3b8";item.ctx.textAlign="right";item.ctx.fillText(`${index+1} / ${pages.length}`,W-55,H-38)})
  return pages.map(item=>item.canvas)
}
