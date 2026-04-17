type CouponItem = {
  title: string
  subtitle?: string | null
  meta?: string | null
  footer?: string | null
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function printCouponsPdf(params: {
  documentTitle: string
  heading: string
  subheading: string
  items: CouponItem[]
}) {
  if (typeof window === "undefined") return
  if (params.items.length === 0) return

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900")
  if (!printWindow) return

  const cardsMarkup = params.items
    .map(
      (item, index) => `
        <article class="coupon">
          <div class="coupon__badge">Cupón ${index + 1}</div>
          <h2 class="coupon__title">${escapeHtml(item.title)}</h2>
          ${item.subtitle ? `<p class="coupon__subtitle">${escapeHtml(item.subtitle)}</p>` : ""}
          ${item.meta ? `<div class="coupon__meta">${escapeHtml(item.meta)}</div>` : ""}
          ${item.footer ? `<div class="coupon__footer">${escapeHtml(item.footer)}</div>` : ""}
        </article>
      `
    )
    .join("")

  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(params.documentTitle)}</title>
        <style>
          :root {
            color-scheme: light;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #f8fafc;
            color: #0f172a;
          }
          .page {
            padding: 24px;
          }
          .header {
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0 0 6px;
            font-size: 26px;
          }
          .header p {
            margin: 0;
            color: #475569;
            font-size: 14px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }
          .coupon {
            min-height: 120px;
            border: 2px dashed #94a3b8;
            border-radius: 14px;
            background: white;
            padding: 12px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .coupon__badge {
            display: inline-flex;
            width: fit-content;
            padding: 6px 10px;
            border-radius: 999px;
            background: #e2e8f0;
            color: #334155;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }
          .coupon__title {
            margin: 10px 0 6px;
            font-size: 18px;
            line-height: 1.2;
          }
          .coupon__subtitle {
            margin: 0;
            font-size: 13px;
            color: #1e293b;
            font-weight: 600;
          }
          .coupon__meta {
            margin-top: 8px;
            color: #475569;
            font-size: 11px;
            line-height: 1.45;
            white-space: pre-line;
          }
          .coupon__footer {
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          @media print {
            body {
              background: white;
            }
            .page {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="header">
            <h1>${escapeHtml(params.heading)}</h1>
            <p>${escapeHtml(params.subheading)}</p>
          </header>
          <section class="grid">
            ${cardsMarkup}
          </section>
        </main>
        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
