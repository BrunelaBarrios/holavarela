import { NextResponse } from "next/server"
import { sendAdminNotification } from "../../lib/emailNotifications"
import { getSupabaseAdmin } from "../../lib/supabaseAdmin"
import { consumeRateLimit, getClientIp } from "../../lib/rateLimit"

type ContactRequestPayload = {
  nombre?: string
  telefono?: string
  mensaje?: string
}

export async function POST(request: Request) {
  try {
    const rateLimit = consumeRateLimit({
      key: `contact-request:${getClientIp(request)}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiados envios seguidos. Intenta nuevamente en unos minutos." },
        { status: 429 }
      )
    }

    const body = (await request.json()) as ContactRequestPayload
    const nombre = body.nombre?.trim() || ""
    const telefono = body.telefono?.trim() || ""
    const mensaje = body.mensaje?.trim() || ""

    if (!nombre || !telefono || !mensaje) {
      return NextResponse.json(
        { error: "Completa nombre, telefono y mensaje antes de enviar." },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error: insertError } = await supabaseAdmin.from("contacto_solicitudes").insert([
      {
        nombre,
        email: null,
        telefono,
        mensaje,
      },
    ])

    if (insertError) {
      throw insertError
    }

    try {
      await sendAdminNotification({
        subject: "Hola Varela - Nueva solicitud de contacto",
        intro: "Llego una nueva consulta desde el formulario de contacto del sitio.",
        fields: [
          { label: "Nombre", value: nombre },
          { label: "Telefono", value: telefono },
          { label: "Mensaje", value: mensaje },
        ],
      })
    } catch (notificationError) {
      console.error(notificationError)
    }

    return NextResponse.json({
      ok: true,
      message: "Recibimos tu mensaje. Te contactaremos a la brevedad.",
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos enviar tu solicitud en este momento."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
