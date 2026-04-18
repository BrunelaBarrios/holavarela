type RateLimitState = {
  count: number
  expiresAt: number
}

const rateLimitStore = new Map<string, RateLimitState>()

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

export function consumeRateLimit(options: {
  key: string
  limit: number
  windowMs: number
}) {
  const now = Date.now()
  const current = rateLimitStore.get(options.key)

  if (!current || current.expiresAt <= now) {
    rateLimitStore.set(options.key, {
      count: 1,
      expiresAt: now + options.windowMs,
    })
    return { allowed: true, remaining: options.limit - 1 }
  }

  if (current.count >= options.limit) {
    return { allowed: false, remaining: 0 }
  }

  current.count += 1
  rateLimitStore.set(options.key, current)
  return { allowed: true, remaining: options.limit - current.count }
}
