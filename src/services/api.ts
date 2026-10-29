import { createDemoManifestations, createDemoSurveys, departments as demoDepartments } from '../data/demo'
import type { AuthUser, DashboardPayload, Department, Manifestation, ManifestationStatus, ManifestationType, SurveyAnswers, SurveyRecord } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
const DEMO_SURVEYS_KEY = 'sgep:surveys'
const DEMO_MANIFESTATIONS_KEY = 'sgep:manifestations'
const DEMO_DEPARTMENTS_KEY = 'sgep:departments'
const DEMO_TOKEN_KEY = 'sgep:token'

export const isDemoMode = !API_BASE_URL

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) throw new Error('A URL da API não foi configurada.')
  const token = sessionStorage.getItem(DEMO_TOKEN_KEY)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `A API respondeu com o status ${response.status}.`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function readDemo<T>(key: string, seed: () => T): T {
  const stored = localStorage.getItem(key)
  if (stored) return JSON.parse(stored) as T
  const initial = seed()
  localStorage.setItem(key, JSON.stringify(initial))
  return initial
}

function saveDemo<T>(key: string, value: T): T {
  localStorage.setItem(key, JSON.stringify(value))
  return value
}

export async function getDepartments(): Promise<Department[]> {
  if (API_BASE_URL) return request<Department[]>('/api/v1/setores')
  return readDemo(DEMO_DEPARTMENTS_KEY, () => demoDepartments)
}

export async function createSurvey(sectorSlug: string): Promise<SurveyRecord> {
  if (API_BASE_URL) {
    return request<SurveyRecord>('/api/v1/pesquisas', {
      method: 'POST',
      body: JSON.stringify({ sectorSlug }),
    })
  }
  const surveys = readDemo(DEMO_SURVEYS_KEY, createDemoSurveys)
  const survey: SurveyRecord = {
    id: `pesquisa-${crypto.randomUUID()}`,
    sectorSlug,
    createdAt: new Date().toISOString(),
    shift: (await import('../data/demo')).getShift(),
    answers: {},
    mean: null,
    complete: false,
  }
  saveDemo(DEMO_SURVEYS_KEY, [survey, ...surveys])
  return survey
}

export async function saveSurveyAnswer(id: string, field: keyof SurveyAnswers, value: number | string): Promise<SurveyRecord> {
  if (API_BASE_URL) {
    return request<SurveyRecord>(`/api/v1/pesquisas/${encodeURIComponent(id)}/respostas`, {
      method: 'POST',
      body: JSON.stringify({ campo: field, valor: value }),
    })
  }
  const surveys = readDemo(DEMO_SURVEYS_KEY, createDemoSurveys)
  const index = surveys.findIndex((survey) => survey.id === id)
  if (index < 0) throw new Error('Esta pesquisa não foi encontrada. Volte ao início e tente novamente.')
  const answers = { ...surveys[index].answers, [field]: value }
  const ratings = [answers.overallRating, answers.departmentRating].filter((rating): rating is number => typeof rating === 'number')
  const updated: SurveyRecord = {
    ...surveys[index],
    answers,
    mean: ratings.length ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)) : null,
  }
  surveys[index] = updated
  saveDemo(DEMO_SURVEYS_KEY, surveys)
  return updated
}

export async function completeSurvey(id: string): Promise<SurveyRecord> {
  if (API_BASE_URL) {
    return request<SurveyRecord>(`/api/v1/pesquisas/${encodeURIComponent(id)}/finalizar`, { method: 'POST' })
  }
  const surveys = readDemo(DEMO_SURVEYS_KEY, createDemoSurveys)
  const index = surveys.findIndex((survey) => survey.id === id)
  if (index < 0) throw new Error('Esta pesquisa não foi encontrada. Volte ao início e tente novamente.')
  surveys[index] = { ...surveys[index], complete: true }
  saveDemo(DEMO_SURVEYS_KEY, surveys)
  return surveys[index]
}

export async function createManifestation(input: {
  surveyId: string
  sectorSlug: string
  type: ManifestationType
  description: string
  anonymous: boolean
  contact?: string
}): Promise<Manifestation> {
  if (API_BASE_URL) {
    return request<Manifestation>(`/api/v1/pesquisas/${encodeURIComponent(input.surveyId)}/manifestacoes`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }
  const manifestations = readDemo(DEMO_MANIFESTATIONS_KEY, createDemoManifestations)
  const manifestation: Manifestation = {
    ...input,
    id: `manifestacao-${crypto.randomUUID()}`,
    status: 'Aberta',
    createdAt: new Date().toISOString(),
  }
  saveDemo(DEMO_MANIFESTATIONS_KEY, [manifestation, ...manifestations])
  return manifestation
}

export async function getDashboardData(): Promise<DashboardPayload> {
  if (API_BASE_URL) return request<DashboardPayload>('/api/v1/dashboard/resumo')
  return {
    surveys: readDemo(DEMO_SURVEYS_KEY, createDemoSurveys),
    manifestations: readDemo(DEMO_MANIFESTATIONS_KEY, createDemoManifestations),
  }
}

export async function updateManifestationStatus(id: string, status: ManifestationStatus): Promise<void> {
  if (API_BASE_URL) {
    await request<void>(`/api/v1/manifestacoes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    return
  }
  const manifestations = readDemo(DEMO_MANIFESTATIONS_KEY, createDemoManifestations)
  const index = manifestations.findIndex((item) => item.id === id)
  if (index < 0) throw new Error('Manifestação não encontrada.')
  manifestations[index] = { ...manifestations[index], status }
  saveDemo(DEMO_MANIFESTATIONS_KEY, manifestations)
}

export async function createDepartment(input: Pick<Department, 'name' | 'slug' | 'description'>): Promise<Department> {
  if (API_BASE_URL) {
    return request<Department>('/api/v1/setores', { method: 'POST', body: JSON.stringify(input) })
  }
  const departments = readDemo(DEMO_DEPARTMENTS_KEY, () => demoDepartments)
  if (departments.some((department) => department.slug === input.slug)) {
    throw new Error('Já existe um setor com este endereço.')
  }
  const department: Department = {
    ...input,
    id: `setor-${crypto.randomUUID()}`,
    icon: 'heart',
    active: true,
  }
  saveDemo(DEMO_DEPARTMENTS_KEY, [...departments, department])
  return department
}

export async function login(email: string, password: string): Promise<AuthUser> {
  if (API_BASE_URL) {
    const result = await request<{ token: string; user: AuthUser }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha: password }),
    })
    sessionStorage.setItem(DEMO_TOKEN_KEY, result.token)
    sessionStorage.setItem('sgep:user', JSON.stringify(result.user))
    return result.user
  }
  if (!email.trim() || !password.trim()) throw new Error('Informe seu e-mail e sua senha.')
  const user: AuthUser = { name: 'Equipe de Gestão', email, role: 'Gestão' }
  sessionStorage.setItem(DEMO_TOKEN_KEY, 'demo-token')
  sessionStorage.setItem('sgep:user', JSON.stringify(user))
  return user
}

export function getCurrentUser(): AuthUser | null {
  const user = sessionStorage.getItem('sgep:user')
  return user ? JSON.parse(user) as AuthUser : null
}

export function logout(): void {
  sessionStorage.removeItem(DEMO_TOKEN_KEY)
  sessionStorage.removeItem('sgep:user')
}
