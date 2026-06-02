import { db } from '@/lib/db'
import { DEFAULT_STAGES } from './default-stages'

const MAX_STAGES = 12

// Maps legacy/old stage names to the canonical slugs in DEFAULT_STAGES
const LEGACY_NAME_TO_SLUG: Record<string, string> = {
  'nuevo lead':          'contacto_nuevo',
  'contacto nuevo':      'contacto_nuevo',
  'contactado':          'contactado',
  'cita agendada':       'cita_agendada',
  'presupuesto enviado': 'calificado',
  'calificado':          'calificado',
  'convertido':          'convertido',
  'perdido':             'perdido',
}

export async function createDefaultStages(clinicId: string): Promise<void> {
  const count = await db.pipelineStage.count({ where: { clinicId } })
  if (count > 0) return // already initialized

  await db.pipelineStage.createMany({
    data: DEFAULT_STAGES.map(s => ({
      clinicId,
      name:          s.name,
      slug:          s.slug,
      color:         s.color,
      bgColor:       s.bgColor,
      headerBgColor: s.headerBgColor,
      icon:          s.icon,
      isProtected:   s.isProtected,
      isDefault:     true,
      isCustom:      false,
      order:         s.order,
    })),
  })
}

export async function getClinicStages(clinicId: string) {
  const stages = await db.pipelineStage.findMany({
    where:   { clinicId },
    orderBy: { order: 'asc' },
    include: { _count: { select: { leads: true } } },
  })

  // Auto-repair legacy stages that have empty slug (created before the pipeline refactor)
  const legacyStages = stages.filter(s => !s.slug)
  if (legacyStages.length > 0) {
    const defaultMap = new Map(DEFAULT_STAGES.map(s => [s.slug, s]))
    await Promise.all(legacyStages.map(stage => {
      const slug   = LEGACY_NAME_TO_SLUG[stage.name.toLowerCase()]
      const config = slug ? defaultMap.get(slug) : undefined
      if (!config) return
      return db.pipelineStage.update({
        where: { id: stage.id },
        data: {
          slug,
          color:         config.color,
          bgColor:       config.bgColor,
          headerBgColor: config.headerBgColor,
          isProtected:   config.isProtected,
          isDefault:     true,
          icon:          config.icon,
        },
      })
    }))

    // Refetch with repaired data
    return db.pipelineStage.findMany({
      where:   { clinicId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { leads: true } } },
    })
  }

  return stages
}

export async function addCustomStage(params: {
  clinicId:        string
  name:            string
  color:           string
  bgColor:         string
  headerBgColor:   string
  insertAfterOrder: number
}): Promise<void> {
  const stageCount = await db.pipelineStage.count({ where: { clinicId: params.clinicId } })
  if (stageCount >= MAX_STAGES) throw new Error(`Máximo ${MAX_STAGES} etapas por clínica`)

  const slug = params.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

  // Shift orders to make room
  const stages = await db.pipelineStage.findMany({
    where:   { clinicId: params.clinicId },
    orderBy: { order: 'desc' },
  })

  // Update in desc order to avoid transient conflicts
  for (const stage of stages) {
    if (stage.order > params.insertAfterOrder) {
      await db.pipelineStage.update({
        where: { id: stage.id },
        data:  { order: stage.order + 1 },
      })
    }
  }

  await db.pipelineStage.create({
    data: {
      clinicId:      params.clinicId,
      name:          params.name,
      slug,
      color:         params.color,
      bgColor:       params.bgColor,
      headerBgColor: params.headerBgColor,
      isProtected:   false,
      isDefault:     false,
      isCustom:      true,
      order:         params.insertAfterOrder + 1,
    },
  })
}

export async function renameStage(params: {
  stageId:  string
  clinicId: string
  newName:  string
}): Promise<void> {
  const stage = await db.pipelineStage.findFirst({
    where: { id: params.stageId, clinicId: params.clinicId },
  })
  if (!stage) throw new Error('Etapa no encontrada')
  if (stage.isProtected) throw new Error('Esta etapa no puede ser renombrada')

  await db.pipelineStage.update({
    where: { id: params.stageId },
    data:  { name: params.newName },
  })
}

export async function deleteStage(params: {
  stageId:       string
  clinicId:      string
  moveLeadsToId: string
}): Promise<void> {
  const stage = await db.pipelineStage.findFirst({
    where: { id: params.stageId, clinicId: params.clinicId },
  })
  if (!stage)            throw new Error('Etapa no encontrada')
  if (stage.isProtected) throw new Error('Esta etapa no puede ser eliminada')

  // Move leads to destination stage
  await db.lead.updateMany({
    where: { stageId: params.stageId },
    data:  { stageId: params.moveLeadsToId },
  })

  await db.pipelineStage.delete({ where: { id: params.stageId } })

  // Compact order gaps
  const remaining = await db.pipelineStage.findMany({
    where:   { clinicId: params.clinicId },
    orderBy: { order: 'asc' },
  })

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].order !== i) {
      await db.pipelineStage.update({
        where: { id: remaining[i].id },
        data:  { order: i },
      })
    }
  }
}

export async function reorderStages(params: {
  clinicId: string
  stageIds: string[]
}): Promise<void> {
  const stages = await db.pipelineStage.findMany({
    where: { clinicId: params.clinicId },
  })

  const stageMap = new Map(stages.map(s => [s.id, s]))

  // Validate: "perdido" must be last
  const perdidoIdx    = params.stageIds.findIndex(id => stageMap.get(id)?.slug === 'perdido')
  const convertidoIdx = params.stageIds.findIndex(id => stageMap.get(id)?.slug === 'convertido')

  if (perdidoIdx !== -1 && perdidoIdx !== params.stageIds.length - 1) {
    throw new Error('"Perdido" siempre debe ser la última etapa')
  }
  if (convertidoIdx !== -1 && convertidoIdx < params.stageIds.length - 2) {
    throw new Error('"Convertido" debe estar en las últimas dos posiciones')
  }

  // Assign high temp orders first to avoid conflicts, then real orders
  const highBase = 1000
  for (let i = 0; i < params.stageIds.length; i++) {
    await db.pipelineStage.update({
      where: { id: params.stageIds[i] },
      data:  { order: highBase + i },
    })
  }
  for (let i = 0; i < params.stageIds.length; i++) {
    await db.pipelineStage.update({
      where: { id: params.stageIds[i] },
      data:  { order: i },
    })
  }
}
