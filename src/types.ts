export type DepartmentIcon = 'door' | 'heart' | 'nurse' | 'doctor' | 'bed' | 'scan'

export interface Department {
  id: string
  name: string
  slug: string
  description: string
  icon: DepartmentIcon
  active: boolean
}

export interface SurveyAnswers {
  overallRating?: number
  departmentRating?: number
  nps?: number
  comment?: string
  [answerKey: string]: number | string | undefined
}

export type SurveyQuestionType = 'rostinho' | 'nps' | 'texto'

export interface SurveyQuestion {
  id: string
  text: string
  type: SurveyQuestionType
  required: boolean
  active: boolean
  order: number
  sectorSlug: string | null
  answerKey: string
}

export interface SurveyRecord {
  id: string
  sectorSlug: string
  createdAt: string
  shift: 'Manhã' | 'Tarde' | 'Noite'
  teamName?: string
  answers: SurveyAnswers
  mean: number | null
  complete: boolean
}

export type ManifestationType = 'Elogio' | 'Reclamação' | 'Sugestão'
export type ManifestationStatus = 'Aberta' | 'Em análise' | 'Concluída'

export interface Manifestation {
  id: string
  surveyId: string
  sectorSlug: string
  type: ManifestationType
  description: string
  status: ManifestationStatus
  createdAt: string
  anonymous: boolean
  contact?: string
}

export interface DashboardPayload {
  surveys: SurveyRecord[]
  manifestations: Manifestation[]
  manifestationOpenCount?: number
}

export interface TVWallPayload {
  responseCount: number
  satisfactionAverage: number | null
  nps: number | null
  complimentCount: number
  sectors: Array<{
    sectorSlug: string
    responseCount: number
    satisfactionAverage: number
  }>
}

export interface AuthUser {
  name: string
  email: string
  role: 'Ouvidoria' | 'Gestão' | 'Administrador'
  sectorSlug?: string
}
