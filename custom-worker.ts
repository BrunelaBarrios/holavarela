// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore .open-next/worker.js is generated during the Cloudflare build.
import { default as handler } from "./.open-next/worker.js"

type CronEnv = {
  CRON_SECRET?: string
}

type ScheduledController = {
  cron: string
  scheduledTime: number
  noRetry: () => void
}

type ExecutionContext = {
  waitUntil: (promise: Promise<unknown>) => void
  passThroughOnException: () => void
}

type ExportedHandler<Env> = {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>
  scheduled?: (
    event: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ) => void | Promise<void>
}

export default {
  fetch: handler.fetch,

  async scheduled(_event: ScheduledController, env: CronEnv, ctx: ExecutionContext) {
    const secret = env.CRON_SECRET

    if (!secret) {
      console.error("CRON_SECRET is not configured; skipping event cleanup.")
      return
    }

    const request = new Request("https://hola-varela.brunelabarriosm.workers.dev/api/cron/cleanup-eventos", {
      headers: {
        authorization: `Bearer ${secret}`,
      },
    })

    const cleanupPromise = handler.fetch(request, env, ctx) as Promise<Response>

    ctx.waitUntil(
      cleanupPromise.then(async (response: Response) => {
        if (!response.ok) {
          console.error("Event cleanup failed", response.status, await response.text())
        }
      })
    )
  },
} satisfies ExportedHandler<CronEnv>
