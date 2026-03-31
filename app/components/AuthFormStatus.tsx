type AuthFormStatusProps = {
  tone: "error" | "success"
  message: string
}

export function AuthFormStatus({ tone, message }: AuthFormStatusProps) {
  const className =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700"

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${className}`}>
      {message}
    </div>
  )
}
