import { SubscriptionStatusPage } from "../components/SubscriptionStatusPage"

export default function SuscripcionExitosaPage() {
  return (
    <SubscriptionStatusPage
      eyebrow="Suscripción confirmada"
      title="Tu suscripción quedó confirmada"
      description="Recibimos tu registro correctamente. En breve vamos a revisar la información para continuar con la publicación en Hola Varela."
      tone="success"
    />
  )
}
