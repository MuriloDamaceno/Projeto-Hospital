import { createDemoManifestations, createDemoSurveys, departments as demoDepartments, demoQuestions, getShift } from '../data/demo'
import type { AuthUser, DashboardPayload, Department, Manifestation, ManifestationStatus, ManifestationType, SurveyAnswers, SurveyQuestion, SurveyQuestionType, SurveyRecord, TVWallPayload } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
const DEMO_SURVEYS_KEY = 'sgep:surveys'
const DEMO_MANIFESTATIONS_KEY = 'sgep:manifestations'
const DEMO_DEPARTMENTS_KEY = 'sgep:departments'
const DEMO_QUESTIONS_KEY = 'sgep:questions'
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

export async function getQuestions(sectorSlug: string): Promise<SurveyQuestion[]> {
  if (API_BASE_URL) {
    return request<SurveyQuestion[]>(`/api/v1/perguntas?setor=${encodeURIComponent(sectorSlug)}`)
  }
  return readDemo(DEMO_QUESTIONS_KEY, () => demoQuestions)
    .filter((question) => question.active && (question.sectorSlug === null || question.sectorSlug === sectorSlug))
    .sort((a, b) => Number(b.required) - Number(a.required) || a.order - b.order)
}

export async function getManagedQuestions(sectorSlug: string | null): Promise<SurveyQuestion[]> {
  if (API_BASE_URL) {
    const query = sectorSlug === null ? 'escopo=geral' : `setor=${encodeURIComponent(sectorSlug)}`
    return request<SurveyQuestion[]>(`/api/v1/perguntas?${query}&inativas=true`)
  }
  return readDemo(DEMO_QUESTIONS_KEY, () => demoQuestions)
    .filter((question) => question.sectorSlug === sectorSlug)
    .sort((a, b) => a.order - b.order)
}

export async function createQuestion(input: {
  text: string
  type: SurveyQuestionType
  required: boolean
  sectorSlug: string | null
}): Promise<SurveyQuestion> {
  if (API_BASE_URL) {
    return request<SurveyQuestion>('/api/v1/perguntas', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }
  const questions = readDemo(DEMO_QUESTIONS_KEY, () => demoQuestions)
  if (input.required && questions.some((question) => question.required && question.active)) {
    throw new Error('Já existe uma pergunta obrigatória. Desative a obrigatoriedade da pergunta atual antes de criar outra.')
  }
  const question: SurveyQuestion = {
    ...input,
    id: `pergunta-${crypto.randomUUID()}`,
    active: true,
    order: Math.max(0, ...questions.filter((item) => item.sectorSlug === input.sectorSlug).map((item) => item.order)) + 1,
    answerKey: `custom_${crypto.randomUUID().replaceAll('-', '')}`,
  }
  saveDemo(DEMO_QUESTIONS_KEY, [...questions, question])
  return question
}

export async function updateQuestion(id: string, input: Partial<Pick<SurveyQuestion, 'text' | 'active' | 'required'>>): Promise<SurveyQuestion> {
  if (API_BASE_URL) {
    return request<SurveyQuestion>(`/api/v1/perguntas/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  }
  const questions = readDemo(DEMO_QUESTIONS_KEY, () => demoQuestions)
  const index = questions.findIndex((question) => question.id === id)
  if (index < 0) throw new Error('Pergunta não encontrada.')
  if (input.active === false && questions[index].required) {
    throw new Error('A pergunta geral obrigatória não pode ser desativada.')
  }
  if (input.required && (questions[index].type !== 'rostinho' || questions[index].sectorSlug !== null)) {
    throw new Error('Somente uma pergunta geral com rostinhos pode ser obrigatória.')
  }
  if (input.required && questions.some((question) => question.id !== id && question.required && question.active)) {
    throw new Error('A pesquisa pode ter apenas uma pergunta obrigatória.')
  }
  questions[index] = { ...questions[index], ...input }
  saveDemo(DEMO_QUESTIONS_KEY, questions)
  return questions[index]
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
    shift: getShift(),
    answers: {},
    mean: null,
    complete: false,
  }
  saveDemo(DEMO_SURVEYS_KEY, [survey, ...surveys])
  return survey
}

export async function saveSurveyAnswer(id: string, question: SurveyQuestion, value: number | string): Promise<SurveyRecord> {
  if (API_BASE_URL) {
    return request<SurveyRecord>(`/api/v1/pesquisas/${encodeURIComponent(id)}/respostas`, {
      method: 'POST',
      body: JSON.stringify({ perguntaId: question.id, valor: value }),
    })
  }
  const surveys = readDemo(DEMO_SURVEYS_KEY, createDemoSurveys)
  const index = surveys.findIndex((survey) => survey.id === id)
  if (index < 0) throw new Error('Esta pesquisa não foi encontrada. Volte ao início e tente novamente.')
  const answers = { ...surveys[index].answers, [question.answerKey]: value }
  const ratings = questionsForSurvey(surveys[index].sectorSlug, answers)
  const updated: SurveyRecord = {
    ...surveys[index],
    answers,
    mean: ratings.length ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)) : null,
  }
  surveys[index] = updated
  saveDemo(DEMO_SURVEYS_KEY, surveys)
  return updated
}

function questionsForSurvey(sectorSlug: string, answers: SurveyAnswers): number[] {
  const allQuestions = readDemo(DEMO_QUESTIONS_KEY, () => demoQuestions)
  const questions = allQuestions
    .filter((item) => item.active && item.type === 'rostinho' && (item.sectorSlug === null || item.sectorSlug === sectorSlug))
    .map((item) => answers[item.answerKey])
    .filter((value): value is number => typeof value === 'number')
  return questions
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
  const user = getCurrentUser()
  const surveys = readDemo(DEMO_SURVEYS_KEY, createDemoSurveys)
  const manifestations = readDemo(DEMO_MANIFESTATIONS_KEY, createDemoManifestations)
  if (user?.role === 'Gestão') {
    const sectorSurveys = surveys.filter((survey) => survey.sectorSlug === user.sectorSlug)
    return {
      surveys: sectorSurveys,
      manifestations: [],
      manifestationOpenCount: manifestations.filter((item) => item.status !== 'Concluída').length,
    }
  }
  if (user?.role === 'Ouvidoria') {
    return {
      surveys: [],
      manifestations,
    }
  }
  return {
    surveys,
    manifestations,
    manifestationOpenCount: manifestations.filter((item) => item.status !== 'Concluída').length,
  }
}

export async function getTVWallData(): Promise<TVWallPayload> {
  if (API_BASE_URL) return request<TVWallPayload>('/api/v1/tv-wall/resumo')
  const surveys = readDemo(DEMO_SURVEYS_KEY, createDemoSurveys)
  const manifestations = readDemo(DEMO_MANIFESTATIONS_KEY, createDemoManifestations)
  const scored = surveys.filter((survey) => survey.mean !== null)
  const npsRatings = surveys.map((survey) => survey.answers.nps).filter((value): value is number => typeof value === 'number')
  const nps = npsRatings.length
    ? Math.round(((npsRatings.filter((value) => value >= 9).length - npsRatings.filter((value) => value <= 6).length) / npsRatings.length) * 100)
    : null
  const departments = readDemo(DEMO_DEPARTMENTS_KEY, () => demoDepartments)
  const sectors = departments.map((department) => {
    const matching = scored.filter((survey) => survey.sectorSlug === department.slug)
    return {
      sectorSlug: department.slug,
      responseCount: matching.length,
      satisfactionAverage: matching.length ? Number((matching.reduce((sum, survey) => sum + (survey.mean ?? 0), 0) / matching.length).toFixed(1)) : 0,
    }
  }).filter((sector) => sector.responseCount >= 5)
  return {
    responseCount: surveys.length,
    satisfactionAverage: scored.length ? Number((scored.reduce((sum, survey) => sum + (survey.mean ?? 0), 0) / scored.length).toFixed(1)) : null,
    nps,
    complimentCount: manifestations.filter((item) => item.type === 'Elogio').length,
    sectors,
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

export async function login(email: string, password: string, role: AuthUser['role'] = 'Gestão', sectorSlug?: string): Promise<AuthUser> {
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
  if (role === 'Gestão' && !sectorSlug) throw new Error('Selecione o setor associado à conta de Gestão.')
  const defaultName = role === 'Administrador' ? 'Administrador' : role === 'Ouvidoria' ? 'Equipe de Ouvidoria' : 'Responsável pelo setor'
  const user: AuthUser = { name: defaultName, email, role, ...(role === 'Gestão' ? { sectorSlug } : {}) }
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
