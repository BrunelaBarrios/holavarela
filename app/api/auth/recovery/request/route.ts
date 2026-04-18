import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin"
import { consumeRateLimit, getClientIp } from "../../../../lib/rateLimit"

type RecoveryRequestPayload = {
  email?: string
  contactName?: string
  phone?: string
  message?: string
}

function getClientMeta(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null,
    userAgent: request.headers.get("user-agent"),
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = consumeRateLimit({
      key: `recovery-request:${getClientIp(request)}`,
      limit: 6,
      windowMs: 15 * 60 * 1000,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes seguidas. Intenta nuevamente en unos minutos." },
        { status: 429 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = (await request.json()) as RecoveryRequestPayload
    const email = body.email?.trim().toLowerCase() || ""
    const contactName = body.contactName?.trim() || null
    const phone = body.phone?.trim() || null
    const message = body.message?.trim() || null
    const clientMeta = getClientMeta(request)

    if (!email) {
      return NextResponse.json(
        { error: "Ingresa el email de la cuenta que necesita una nueva contrasena." },
        { status: 400 }
      )
    }

    const { data: existingUser, error: userError } = await supabaseAdmin
      .from("usuarios_registrados")
      .select("user_id, email")
      .eq("email", email)
      .maybeSingle()

    if (userError) throw userError

    const { error: insertError } = await supabaseAdmin
      .from("password_reset_requests")
      .insert([
        {
          user_id: existingUser?.user_id || null,
          email,
          contact_name: contactName,
          phone,
          message,
          status: "pending",
          ip_address: clientMeta.ipAddress,
          user_agent: clientMeta.userAgent,
        },
      ])

    if (insertError) throw insertError

    return NextResponse.json({
      ok: true,
      message:
        "Tu solicitud fue enviada al administrador. Te asignaran una nueva contrasena a la brevedad.",
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos enviar tu solicitud en este momento."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
