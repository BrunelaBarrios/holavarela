'use client'
import { useState } from "react"
import { ImageIcon } from "lucide-react"
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0)
  return <div><div className="aspect-square overflow-hidden rounded-3xl bg-stone-100">{images[active] ? <img src={images[active]} alt={`${name} - imagen ${active + 1}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-stone-400"><ImageIcon className="h-16 w-16" /></div>}</div>{images.length > 1 && <div className="mt-3 grid grid-cols-5 gap-2">{images.map((image, index) => <button key={`${image}-${index}`} onClick={() => setActive(index)} className={`aspect-square overflow-hidden rounded-xl border-2 ${active === index ? "border-amber-700" : "border-transparent"}`}><img src={image} alt="" className="h-full w-full object-cover" /></button>)}</div>}</div>
}
