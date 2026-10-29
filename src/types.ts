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
}

export interface SurveyRecord {
  id: string
  sectorSlug: string
  createdAt: string
  shift: 'Manhã' | 'Tarde' | 'Noite'
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
}

export interface AuthUser {
  name: string
  email: string
  role: 'Super Admin' | 'Admin de Setor' | 'Gestão' | 'Ouvidoria' | 'Visualizador'
}
