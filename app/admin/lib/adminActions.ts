export async function postAdminAction<T>(
  endpoint: string,
  body: unknown,
  fallbackError: string
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const result = (await response.json()) as T & { error?: string }

  if (!response.ok) {
    throw new Error(result.error || fallbackError)
  }

  return result
}
