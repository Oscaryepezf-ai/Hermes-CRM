import { auth } from "../../../../../auth"
import { db } from "@/lib/db"
import { TemplatesClient } from "@/components/templates/TemplatesClient"

export default async function PlantillasPage() {
  const session = await auth()
  if (!session?.user) return null

  const [templates, stages] = await Promise.all([
    db.waTemplate.findMany({
      where:   { clinicId: session.user.clinicId },
      orderBy: { createdAt: "desc" },
    }),
    db.pipelineStage.findMany({
      where:   { clinicId: session.user.clinicId },
      orderBy: { order: "asc" },
      select:  { id: true, name: true },
    }),
  ])

  return <TemplatesClient initialTemplates={templates} stages={stages} />
}
