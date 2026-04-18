import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

type OwnerType = "comercio" | "servicio" | "curso" | "institucion"

type CreateUserPayload = {
  email?: string
  password?: string
  ownerType?: OwnerType | ""
  ownerId?: number | null
}

type UpdateUserPayload = {
  id?: number
  userId?: string | null
  currentEmail?: string
  email?: string
  password?: string
  ownerType?: OwnerType | ""
  ownerId?: number | null
  requestId?: number | null
}

type DeleteUserPayload = {
  id?: number
  userId?: string | null
  email?: string
}

type LinkedOwner = {
  table: ReturnType<typeof resolveTable>
  type: OwnerType
  id: number
}

function resolveTable(ownerType: OwnerType) {
  switch (ownerType) {
    case "comercio":
      return "comercios"
    case "servicio":
      return "servicios"
    case "curso":
      return "cursos"
    case "institucion":
      return "instituciones"
  }
}

async function requireAdminSession(request: NextRequest) {
  const session = await readAdminSessionFromRequest(request)
  if (!session) {
    return null
  }

  return session
}

async function getLinkedOwnerByEmail(email: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const normalizedEmail = email.trim().toLowerCase()

  const [comercio, servicio, curso, institucion] = await Promise.all([
    supabaseAdmin.from("comercios").select("id").eq("owner_email", normalizedEmail).maybeSingle(),
    supabaseAdmin.from("servicios").select("id").eq("owner_email", normalizedEmail).maybeSingle(),
    supabaseAdmin.from("cursos").select("id").eq("owner_email", normalizedEmail).maybeSingle(),
    supabaseAdmin
      .from("instituciones")
      .select("id")
      .eq("owner_email", normalizedEmail)
      .maybeSingle(),
  ])

  const firstError = comercio.error || servicio.error || curso.error || institucion.error
  if (firstError) {
    throw firstError
  }

  if (comercio.data?.id) {
    return { table: "comercios", type: "comercio", id: Number(comercio.data.id) } satisfies LinkedOwner
  }

  if (servicio.data?.id) {
    return { table: "servicios", type: "servicio", id: Number(servicio.data.id) } satisfies LinkedOwner
  }

  if (curso.data?.id) {
    return { table: "cursos", type: "curso", id: Number(curso.data.id) } satisfies LinkedOwner
  }

  if (institucion.data?.id) {
    return {
      table: "instituciones",
      type: "institucion",
      id: Number(institucion.data.id),
    } satisfies LinkedOwner
  }

  return null
}

async function validateLinkedOwner({
  ownerType,
  ownerId,
  email,
}: {
  ownerType: OwnerType | null
  ownerId: number | null
  email: string
}) {
  if (!ownerType || !ownerId) {
    return
  }

  const supabaseAdmin = getSupabaseAdmin()
  const table = resolveTable(ownerType)
  const { data: ownerData, error: ownerError } = await supabaseAdmin
    .from(table)
    .select("id, owner_email")
    .eq("id", ownerId)
    .maybeSingle()

  if (ownerError) throw ownerError

  if (!ownerData) {
    throw new Error("No encontramos el perfil seleccionado.")
  }

  if (
    ownerData.owner_email &&
    ownerData.owner_email.toLowerCase() !== email.toLowerCase()
  ) {
    throw new Error("Ese perfil ya esta vinculado a otra cuenta.")
  }
}

async function syncOwnerAssignment({
  currentEmail,
  nextEmail,
  ownerType,
  ownerId,
}: {
  currentEmail: string
  nextEmail: string
  ownerType: OwnerType | null
  ownerId: number | null
}) {
  const supabaseAdmin = getSupabaseAdmin()
  const currentOwner = await getLinkedOwnerByEmail(currentEmail)
  const nextOwner =
    ownerType && ownerId
      ? { table: resolveTable(ownerType), type: ownerType, id: ownerId }
      : null

  if (
    currentOwner &&
    (!nextOwner ||
      currentOwner.table !== nextOwner.table ||
      currentOwner.id !== nextOwner.id ||
      currentEmail !== nextEmail)
  ) {
    const { error } = await supabaseAdmin
      .from(currentOwner.table)
      .update({ owner_email: null })
      .eq("id", currentOwner.id)
      .eq("owner_email", currentEmail)

    if (error) throw error
  }

  if (nextOwner) {
    const { error } = await supabaseAdmin
      .from(nextOwner.table)
      .update({ owner_email: nextEmail })
      .eq("id", nextOwner.id)

    if (error) throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminSession = await requireAdminSession(request)
    if (!adminSession) {
      return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = (await request.json()) as CreateUserPayload
    const email = body.email?.trim().toLowerCase() || ""
    const password = body.password || ""
    const ownerType = body.ownerType || ""
    const ownerId = body.ownerId ? Number(body.ownerId) : null
    const hasLinkedOwner = Boolean(ownerType && ownerId)
    const linkedOwnerType = hasLinkedOwner ? (ownerType as OwnerType) : null

    if (!email || !password) {
      return NextResponse.json(
        { error: "Faltan datos para crear el usuario." },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contrasena debe tener al menos 6 caracteres." },
        { status: 400 }
      )
    }

    if (!ownerType && ownerId) {
      return NextResponse.json(
        { error: "La asignacion del perfil quedo incompleta." },
        { status: 400 }
      )
    }

    try {
      await validateLinkedOwner({
        ownerType: linkedOwnerType,
        ownerId,
        email,
      })
    } catch (validationError) {
      return NextResponse.json(
        {
          error:
            validationError instanceof Error
              ? validationError.message
              : "No encontramos el perfil seleccionado.",
        },
        { status: 409 }
      )
    }

    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !createdUser.user) {
      return NextResponse.json(
        { error: createError?.message || "No pudimos crear el usuario en Auth." },
        { status: 400 }
      )
    }

    try {
      const { error: registeredError } = await supabaseAdmin
        .from("usuarios_registrados")
        .upsert(
          {
            user_id: createdUser.user.id,
            email,
          },
          { onConflict: "email" }
        )

      if (registeredError) throw registeredError

      if (linkedOwnerType && ownerId) {
        await syncOwnerAssignment({
          currentEmail: email,
          nextEmail: email,
          ownerType: linkedOwnerType,
          ownerId,
        })
      }
    } catch (persistenceError) {
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id)
      throw persistenceError
    }

    return NextResponse.json({
      ok: true,
      userId: createdUser.user.id,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos crear el usuario en este momento."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminSession = await requireAdminSession(request)
    if (!adminSession) {
      return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = (await request.json()) as UpdateUserPayload
    const id = body.id ? Number(body.id) : 0
    const userId = body.userId?.trim() || null
    const currentEmail = body.currentEmail?.trim().toLowerCase() || ""
    const email = body.email?.trim().toLowerCase() || ""
    const nextPassword = body.password || ""
    const ownerType = body.ownerType || ""
    const ownerId = body.ownerId ? Number(body.ownerId) : null
    const requestId = body.requestId ? Number(body.requestId) : null
    const linkedOwnerType = ownerType ? (ownerType as OwnerType) : null

    if (!id || !currentEmail || !email) {
      return NextResponse.json(
        { error: "Faltan datos para actualizar el usuario." },
        { status: 400 }
      )
    }

    if (nextPassword && nextPassword.length < 6) {
      return NextResponse.json(
        { error: "La nueva contrasena debe tener al menos 6 caracteres." },
        { status: 400 }
      )
    }

    if (!ownerType && ownerId) {
      return NextResponse.json(
        { error: "La asignacion del perfil quedo incompleta." },
        { status: 400 }
      )
    }

    try {
      await validateLinkedOwner({
        ownerType: linkedOwnerType,
        ownerId,
        email,
      })
    } catch (validationError) {
      return NextResponse.json(
        {
          error:
            validationError instanceof Error
              ? validationError.message
              : "No encontramos el perfil seleccionado.",
        },
        { status: 409 }
      )
    }

    const { data: duplicateUser, error: duplicateError } = await supabaseAdmin
      .from("usuarios_registrados")
      .select("id")
      .eq("email", email)
      .neq("id", id)
      .maybeSingle()

    if (duplicateError) throw duplicateError

    if (duplicateUser) {
      return NextResponse.json(
        { error: "Ya existe otro usuario registrado con ese email." },
        { status: 409 }
      )
    }

    if (userId && (email !== currentEmail || nextPassword)) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email,
        ...(nextPassword ? { password: nextPassword } : {}),
      })

      if (authUpdateError) {
        return NextResponse.json(
          { error: authUpdateError.message || "No pudimos actualizar la cuenta en Auth." },
          { status: 400 }
        )
      }
    }

    await syncOwnerAssignment({
      currentEmail,
      nextEmail: email,
      ownerType: linkedOwnerType,
      ownerId,
    })

    const { error: userRowError } = await supabaseAdmin
      .from("usuarios_registrados")
      .update({ email })
      .eq("id", id)

    if (userRowError) throw userRowError

    if (requestId) {
      const { error: requestError } = await supabaseAdmin
        .from("password_reset_requests")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: adminSession.username,
          user_id: userId,
        })
        .eq("id", requestId)

      if (requestError) throw requestError
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos actualizar el usuario en este momento."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminSession = await requireAdminSession(request)
    if (!adminSession) {
      return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = (await request.json()) as DeleteUserPayload
    const id = body.id ? Number(body.id) : 0
    const userId = body.userId?.trim() || null
    const email = body.email?.trim().toLowerCase() || ""

    if (!id || !email) {
      return NextResponse.json(
        { error: "Faltan datos para borrar el usuario." },
        { status: 400 }
      )
    }

    await syncOwnerAssignment({
      currentEmail: email,
      nextEmail: email,
      ownerType: null,
      ownerId: null,
    })

    if (userId) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (authDeleteError) {
        return NextResponse.json(
          { error: authDeleteError.message || "No pudimos borrar la cuenta en Auth." },
          { status: 400 }
        )
      }
    }

    const { error: rowDeleteError } = await supabaseAdmin
      .from("usuarios_registrados")
      .delete()
      .eq("id", id)

    if (rowDeleteError) throw rowDeleteError

    const { error: requestCleanupError } = await supabaseAdmin
      .from("password_reset_requests")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by: adminSession.username,
        user_id: userId,
      })
      .eq("email", email)
      .eq("status", "pending")

    if (requestCleanupError) throw requestCleanupError

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos borrar el usuario en este momento."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
