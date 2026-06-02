export type DefaultStageConfig = {
  name:          string
  slug:          string
  color:         string
  bgColor:       string
  headerBgColor: string
  icon:          string
  isProtected:   boolean
  order:         number
}

export const DEFAULT_STAGES: DefaultStageConfig[] = [
  {
    name:          'Contacto Nuevo',
    slug:          'contacto_nuevo',
    color:         '#4A90E2',
    bgColor:       '#EEF3FC',
    headerBgColor: '#DDE8F8',
    icon:          'UserPlus',
    isProtected:   true,
    order:         0,
  },
  {
    name:          'Contactado',
    slug:          'contactado',
    color:         '#8B7CF6',
    bgColor:       '#F2EFFE',
    headerBgColor: '#E8E2FC',
    icon:          'Phone',
    isProtected:   false,
    order:         1,
  },
  {
    name:          'Calificado',
    slug:          'calificado',
    color:         '#0D9488',
    bgColor:       '#EDFAF4',
    headerBgColor: '#D8F4E8',
    icon:          'BadgeCheck',
    isProtected:   false,
    order:         2,
  },
  {
    name:          'Cita Agendada',
    slug:          'cita_agendada',
    color:         '#E8A528',
    bgColor:       '#FEF9EE',
    headerBgColor: '#FDF0D4',
    icon:          'CalendarCheck',
    isProtected:   false,
    order:         3,
  },
  {
    name:          'Convertido',
    slug:          'convertido',
    color:         '#10B981',
    bgColor:       '#EDFBF6',
    headerBgColor: '#D4F5E7',
    icon:          'HeartPulse',
    isProtected:   true,
    order:         4,
  },
  {
    name:          'Perdido',
    slug:          'perdido',
    color:         '#F47B8A',
    bgColor:       '#FEF2F4',
    headerBgColor: '#FDE2E7',
    icon:          'XCircle',
    isProtected:   true,
    order:         5,
  },
]

export const CUSTOM_STAGE_COLORS = [
  { name: 'Azul',    color: '#4A90E2', bg: '#EEF3FC', header: '#DDE8F8' },
  { name: 'Violeta', color: '#8B7CF6', bg: '#F2EFFE', header: '#E8E2FC' },
  { name: 'Verde',   color: '#10B981', bg: '#EDFBF6', header: '#D4F5E7' },
  { name: 'Teal',    color: '#0D9488', bg: '#EDFAF4', header: '#D8F4E8' },
  { name: 'Ámbar',   color: '#E8A528', bg: '#FEF9EE', header: '#FDF0D4' },
  { name: 'Naranja', color: '#F97316', bg: '#FFF7ED', header: '#FED7AA' },
  { name: 'Rosa',    color: '#EC4899', bg: '#FDF2F8', header: '#FCE7F3' },
  { name: 'Índigo',  color: '#6366F1', bg: '#EEF2FF', header: '#E0E7FF' },
  { name: 'Gris',    color: '#64748B', bg: '#F8FAFC', header: '#F1F5F9' },
]
