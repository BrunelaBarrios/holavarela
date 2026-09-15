export type DrawTicket = { id: number; name: string; group: number }
export type DrawRecord = {
  version: 1
  campaignId: number
  title: string
  count: number
  preparedAt: string
  completedAt?: string
  tickets: DrawTicket[]
  winners?: DrawTicket[]
}
export type DrawView = {
  id: number
  campaignId: number
  title: string
  count: number
  total: number
  people: number
  preparedAt: string
  completedAt?: string
  winners?: DrawTicket[]
}

// Uniform sample without replacement. Multiple coupons keep their chances;
// once selected, all coupons from that same person leave the remaining pool.
export function selectDrawWinners(tickets: DrawTicket[], count: number, randomIndex: (max: number) => number) {
  if (!Number.isInteger(count) || count < 1 || count > new Set(tickets.map(t => t.group)).size) {
    throw new Error("Elegí una cantidad válida de ganadores.")
  }
  let pool = [...tickets]
  const winners: DrawTicket[] = []
  for (let i = 0; i < count; i++) {
    const index = randomIndex(pool.length)
    if (!Number.isInteger(index) || index < 0 || index >= pool.length) throw new Error("Selección inválida.")
    const winner = pool[index]
    winners.push(winner)
    pool = pool.filter(ticket => ticket.group !== winner.group)
  }
  return winners
}

export function drawView(id: number, record: DrawRecord): DrawView {
  return { id, campaignId: record.campaignId, title: record.title, count: record.count,
    total: record.tickets.length, people: new Set(record.tickets.map(t => t.group)).size,
    preparedAt: record.preparedAt, completedAt: record.completedAt, winners: record.winners }
}
