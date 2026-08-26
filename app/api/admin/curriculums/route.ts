import { NextResponse, type NextRequest } from "next/server"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

const clean=(value:unknown,max=160)=>typeof value==="string"?value.trim().slice(0,max):""

export async function GET(request:NextRequest) {
  if(!await readAdminSessionFromRequest(request)) return NextResponse.json({error:"No autorizado."},{status:401})
  const q=clean(request.nextUrl.searchParams.get("q")), estado=clean(request.nextUrl.searchParams.get("estado"),20)
  let query=getSupabaseAdmin().from("curriculums_generados").select("id,codigo,nombre,email,telefono,modelo,estado_pago,numero_operacion,comprobante,creado_at,editable_hasta,codigo_promocional,monto_pago").order("creado_at",{ascending:false}).limit(500)
  if(estado) query=query.eq("estado_pago",estado)
  if(q){const safe=q.replace(/[%_,]/g," ");query=query.or(`nombre.ilike.%${safe}%,email.ilike.%${safe}%,telefono.ilike.%${safe}%`)}
  const {data,error}=await query
  return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({items:data||[]})
}
