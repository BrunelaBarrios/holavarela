type AdminNotificationParams = {
  subject: string
  intro: string
  fields: Array<{
    label: string
    value: string | null | undefined
  }>
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function getNotificationConfig() {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_NOTIFICATIONS_FROM
  const to = process.env.EMAIL_NOTIFICATIONS_TO

  if (!apiKey || !from || !to) {
    return null
  }

  return {
    apiKey,
    from,
    to: to
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  }
}

function buildTextBody(params: AdminNotificationParams) {
  const lines = [params.intro, ""]

  for (const field of params.fields) {
    lines.push(`${field.label}: ${field.value?.trim() || "-"}`)
  }

  return lines.join("\n")
}

function buildHtmlBody(params: AdminNotificationParams) {
  const rows = params.fields
    .map(
      (field) => `
        <tr>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">${escapeHtml(field.label)}</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#ffffff;white-space:pre-wrap;">${escapeHtml(
            field.value?.trim() || "-"
          )}</td>
        </tr>
      `
    )
    .join("")

  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
        <div style="padding:24px 28px;background:linear-gradient(135deg,#eff6ff 0%,#ecfdf5 100%);border-bottom:1px solid #e2e8f0;">
          <h1 style="margin:0;font-size:22px;">Hola Varela</h1>
          <p style="margin:10px 0 0;font-size:15px;line-height:1.6;">${escapeHtml(params.intro)}</p>
        </div>
        <div style="padding:24px 28px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.5;">
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `
}

export async function sendAdminNotification(params: AdminNotificationParams) {
  const config = getNotificationConfig()

  if (!config) {
    return { delivered: false, skipped: true as const }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: config.to,
      subject: params.subject,
      text: buildTextBody(params),
      html: buildHtmlBody(params),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`No pudimos enviar la notificacion por email: ${errorText}`)
  }

  return { delivered: true as const, skipped: false as const }
}
