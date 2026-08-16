export async function postAdminAction<T>(
  endpoint: string,
  body: unknown,
  fallbackError: string
) {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const result = (await response.json()) as T & { error?: string }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      const nextPath = `${window.location.pathname}${window.location.search}`
      window.location.assign(`/admin/login?next=${encodeURIComponent(nextPath)}`)
      throw new Error("Tu sesión venció. Volvé a iniciar sesión para continuar.")
    }

    throw new Error(result.error || fallbackError)
  }

  return result
}
