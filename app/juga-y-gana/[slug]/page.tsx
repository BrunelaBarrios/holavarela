import { JugaYGanaExperience } from "../../components/JugaYGanaExperience"

type JugaYGanaBySlugPageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function JugaYGanaBySlugPage({ params }: JugaYGanaBySlugPageProps) {
  const { slug } = await params

  return <JugaYGanaExperience challengeSlug={slug} />
}
