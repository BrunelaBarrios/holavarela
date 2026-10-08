export function servicioSaveError(error: unknown) {
  const details = error && typeof error === "object"
    ? error as { code?: unknown; message?: unknown }
    : {}
  const code = typeof details.code === "string" ? details.code : ""
  const message = typeof details.message === "string" ? details.message : ""

  if (code === "42703" || code === "PGRST204") {
    return "La base de datos no tiene todos los campos del formulario. Conservá los cambios y solicitá actualizar la estructura de servicios."
  }
  if (code === "42501") {
    return "La base de datos rechazó el guardado por permisos. Conservá el formulario y solicitá revisar el acceso del servidor."
  }
  if (code === "23505") {
    return "Ya existe un servicio con un dato que debe ser único. Revisá los datos antes de guardar."
  }
  if (code === "23514" || code === "23502" || code === "22P02") {
    return "La base de datos rechazó uno de los valores del servicio. Revisá los campos del formulario."
  }
  if (code === "57014" || /fetch failed|timeout|timed out|abort/i.test(message)) {
    return "No pudimos confirmar el guardado por un problema de conexión o demora. Conservá este formulario y verificá en otra pestaña si se guardó antes de reintentar."
  }
  return "No pudimos confirmar el guardado del servicio. Conservá este formulario y verificá en otra pestaña si se guardó antes de reintentar. El detalle quedó registrado en el servidor."
}
