import type { JobOpportunity } from "./jobOpportunities"

type StoredJob = Pick<JobOpportunity, "horario" | "enlace_url">

// Older databases only have horario. Keep both values in a versioned envelope
// until the additive enlace_url migration has been applied.
export function normalizeJobStorage<T extends StoredJob>(item: T): T {
  let horario = item.horario
  let enlace = item.enlace_url
  if (horario?.startsWith("{")) {
    try {
      const parsed = JSON.parse(horario)
      if (parsed?.job_contact_version === 1) {
        horario = typeof parsed.horario === "string" ? parsed.horario : null
        enlace = enlace ?? (typeof parsed.enlace_url === "string" ? parsed.enlace_url : null)
      }
    } catch { /* Preserve ordinary schedule text. */ }
  }
  if (/^https?:\/\//i.test(horario || "")) {
    enlace = enlace ?? horario
    horario = null
  }
  return { ...item, horario, enlace_url: enlace }
}

export function legacyJobChanges(changes: Record<string, unknown>, existing: StoredJob = {}) {
  const current = normalizeJobStorage(existing)
  const horario = "horario" in changes ? changes.horario : current.horario
  const enlace = "enlace_url" in changes ? changes.enlace_url : current.enlace_url
  const result = { ...changes }
  delete result.enlace_url
  result.horario = enlace
    ? JSON.stringify({ job_contact_version: 1, horario: horario || null, enlace_url: enlace })
    : horario || null
  return result
}

export function missingJobLinkColumn(error: { code?: string; message?: string } | null) {
  return Boolean(error && ["42703", "PGRST204"].includes(error.code || "") && error.message?.includes("enlace_url"))
}
