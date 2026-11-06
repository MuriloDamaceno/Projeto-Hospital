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
    const body = await response.text()
    let message = body
    try {
      const error = JSON.parse(body) as { erro?: string; message?: string }
      message = error.erro ?? error.message ?? body
    } catch {
      if (!body) message = `A API respondeu com o status ${response.status}.`
    }
    throw new Error(message || `A API respondeu com o status ${response.status}.`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

type BackendDepartment = { id: number; nome: string; slug: string; ativo: boolean }
type BackendQuestion = {
  id: number
  texto: string
  tipo: SurveyQuestionType
  geral: boolean
  obrigatoria?: boolean
  ativo?: boolean
  ordem: number
  opcoes?: Array<{ id: number; valor: number; rotulo: string; emoji?: string | null }>
}

function mapDepartment(department: BackendDepartment): Department {
  const iconBySlug: Record<string, Department['icon']> = {
    recepcao: 'door',
    triagem: 'heart',
    enfermagem: 'nurse',
    medico: 'doctor',
    internacao: 'bed',
    'raio-x': 'scan',
  }
  return {
    id: String(department.id),
    name: department.nome,
    slug: department.slug,
    description: `Atendimento · ${department.nome}`,
    icon: iconBySlug[department.slug] ?? 'heart',
    active: department.ativo,
  }
}

function mapQuestion(question: BackendQuestion, sectorSlug: string): SurveyQuestion {
  return {
    id: String(question.id),
    text: question.texto,
    type: question.tipo,
    required: question.obrigatoria ?? question.geral,
    active: question.ativo ?? true,
    order: question.ordem,
    sectorSlug: question.geral ? null : sectorSlug,
    answerKey: question.geral && question.tipo === 'nps'
      ? 'nps'
      : question.tipo === 'rostinho' && !question.geral
        ? 'departmentRating'
        : `question_${question.id}`,
    options: question.opcoes?.map((option) => ({
      id: String(option.id),
      value: option.valor,
      label: option.rotulo,
      emoji: option.emoji,
    })),
  }
}

function mapManifestation(
  manifestation: {
    id: number
    pesquisa_id: number
    tipo: string
    descricao: string
    status: string
    data: string
    anonimo: boolean
    canal_contato?: string | null
    setor_slug?: string
  },
  sectorSlug = '',
): Manifestation {
  const type = manifestation.tipo === 'reclamacao'
    ? 'Reclamação'
    : manifestation.tipo === 'sugestao' ? 'Sugestão' : 'Elogio'
  const status = manifestation.status === 'em_tratamento'
    ? 'Em análise'
    : manifestation.status === 'concluida' ? 'Concluída' : 'Aberta'
  return {
    id: String(manifestation.id),
    surveyId: String(manifestation.pesquisa_id),
    sectorSlug: manifestation.setor_slug ?? sectorSlug,
    type,
    description: manifestation.descricao,
    status,
    createdAt: manifestation.data,
    anonymous: manifestation.anonimo,
    ...(manifestation.canal_contato ? { contact: manifestation.canal_contato } : {}),
  }
}

function surveyDraftKey(id: string): string {
  return `sgep:survey:${id}`
}

function readSurveyDraft(id: string): SurveyRecord {
  const stored = sessionStorage.getItem(surveyDraftKey(id))
  if (!stored) throw new Error('Esta pesquisa expirou nesta sessão. Volte ao início e tente novamente.')
  return JSON.parse(stored) as SurveyRecord
}

function saveSurveyDraft(survey: SurveyRecord): SurveyRecord {
  sessionStorage.setItem(surveyDraftKey(survey.id), JSON.stringify({ ...survey, answers: {} }))
  return survey
}

function getSurveyToken(id: string): string {
  const token = sessionStorage.getItem(`${surveyDraftKey(id)}:token`)
  if (!token) throw new Error('A sessão segura desta pesquisa expirou. Volte ao início e tente novamente.')
  return token
}

async function backendRequest<T>(path: string, init: RequestInit = {}, surveyId?: string): Promise<T> {
  const headers = new Headers(init.headers)
  if (surveyId) headers.set('x-survey-token', getSurveyToken(surveyId))
  return request<T>(path, { ...init, headers: Object.fromEntries(headers.entries()) })
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
  if (API_BASE_URL) {
    const departments = await backendRequest<BackendDepartment[]>('/api/setores')
    return departments.map(mapDepartment)
  }
  return readDemo(DEMO_DEPARTMENTS_KEY, () => demoDepartments)
}

export async function getQuestions(sectorSlug: string): Promise<SurveyQuestion[]> {
  if (API_BASE_URL) {
    const response = await backendRequest<{ fluxo: BackendQuestion[] }>(`/api/setores/${encodeURIComponent(sectorSlug)}/fluxo`)
    return response.fluxo.map((question) => mapQuestion(question, sectorSlug))
  }
  return readDemo(DEMO_QUESTIONS_KEY, () => demoQuestions)
    .filter((question) => question.active && (question.sectorSlug === null || question.sectorSlug === sectorSlug))
    .sort((a, b) => Number(b.required) - Number(a.required) || a.order - b.order)
}

export async function getManagedQuestions(sectorSlug: string | null): Promise<SurveyQuestion[]> {
  if (API_BASE_URL) {
    if (sectorSlug === null) {
      const sectors = await getDepartments()
      const firstSector = sectors[0]
      if (!firstSector) throw new Error('Não há setores cadastrados para carregar as perguntas gerais.')
      const response = await backendRequest<{ fluxo: BackendQuestion[] }>(`/api/setores/${encodeURIComponent(firstSector.slug)}/fluxo`)
      return response.fluxo.filter((question) => question.geral).map((question) => mapQuestion(question, firstSector.slug))
    }
    const department = (await getDepartments()).find((item) => item.slug === sectorSlug)
    if (!department) throw new Error('O setor selecionado não foi encontrado na API.')
    const questions = await backendRequest<BackendQuestion[]>(`/api/admin/perguntas?setor_id=${encodeURIComponent(department.id)}`)
    return questions.map((question) => mapQuestion(question, sectorSlug))
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
    if (!input.sectorSlug) throw new Error('A API permite gerenciar perguntas por setor; a pergunta geral obrigatória é protegida.')
    const department = (await getDepartments()).find((item) => item.slug === input.sectorSlug)
    if (!department) throw new Error('O setor selecionado não foi encontrado na API.')
    const question = await backendRequest<BackendQuestion>('/api/admin/perguntas', {
      method: 'POST',
      body: JSON.stringify({
        setor_id: Number(department.id),
        texto: input.text,
        tipo: input.type,
      }),
    })
    return mapQuestion(question, input.sectorSlug)
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

export async function updateQuestion(id: string, input: Partial<Pick<SurveyQuestion, 'text' | 'active' | 'required'>>, sectorSlug?: string): Promise<SurveyQuestion> {
  if (API_BASE_URL) {
    if (!sectorSlug) throw new Error('A pergunta geral obrigatória é protegida ou a pergunta não foi encontrada.')
    const updated = await backendRequest<BackendQuestion>(`/api/admin/perguntas/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(input.text !== undefined ? { texto: input.text } : {}),
        ...(input.active !== undefined ? { ativo: input.active } : {}),
      }),
    })
    return mapQuestion(updated, sectorSlug)
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
    const department = (await getDepartments()).find((item) => item.slug === sectorSlug)
    if (!department) throw new Error('O setor selecionado não foi encontrado na API.')
    const result = await backendRequest<{ pesquisa_id: number; token: string }>('/api/pesquisas', {
      method: 'POST',
      body: JSON.stringify({ setor_id: Number(department.id), anonimo: true, consentimento: false }),
    })
    const survey: SurveyRecord = {
      id: String(result.pesquisa_id),
      sectorSlug,
      createdAt: new Date().toISOString(),
      shift: getShift(),
      answers: {},
      mean: null,
      complete: false,
    }
    sessionStorage.setItem(`${surveyDraftKey(survey.id)}:token`, result.token)
    return saveSurveyDraft(survey)
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
    const answer = question.type === 'texto'
      ? { texto: String(value), pergunta_id: Number(question.id) }
      : question.type === 'multipla'
        ? { opcao_id: Number(value), pergunta_id: Number(question.id) }
        : { valor: Number(value), pergunta_id: Number(question.id) }
    const response = await backendRequest<{ mediaParcial: number | null }>(
      `/api/pesquisas/${encodeURIComponent(id)}/respostas/${encodeURIComponent(question.id)}`,
      {
      method: 'PUT',
      body: JSON.stringify(answer),
      },
      id,
    )
    const survey = readSurveyDraft(id)
    const updated = {
      ...survey,
      answers: { ...survey.answers, [question.answerKey]: value },
      mean: response.mediaParcial,
    }
    return saveSurveyDraft(updated)
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
    const response = await backendRequest<{ destino: 'ouvidoria' | 'agradecimento' }>(
      `/api/pesquisas/${encodeURIComponent(id)}/finalizar`,
      { method: 'POST' },
      id,
    )
    const survey = readSurveyDraft(id)
    return saveSurveyDraft({ ...survey, complete: true, destination: response.destino })
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
    const result = await backendRequest<{
      id: number
      pesquisa_id: number
      tipo: string
      descricao: string
      status: string
      data: string
      anonimo: boolean
      canal_contato?: string | null
      setor_slug?: string
    }>(`/api/pesquisas/${encodeURIComponent(input.surveyId)}/manifestacoes`, {
      method: 'POST',
      body: JSON.stringify({
        tipo: input.type === 'Reclamação' ? 'reclamacao' : input.type === 'Sugestão' ? 'sugestao' : 'elogio',
        descricao: input.description,
        anonimo: input.anonymous,
        canal_contato: input.contact,
        consentimento: !input.anonymous,
      }),
    }, input.surveyId)
    return mapManifestation(result, input.sectorSlug)
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
  if (API_BASE_URL) {
    const user = getCurrentUser()
    const summary = await backendRequest<{ manifestacoes_abertas?: number }>('/api/dashboard/resumo')
    const surveysPromise = user?.role === 'Ouvidoria'
      ? Promise.resolve([])
      : backendRequest<Array<{
          id: number
          setor_slug: string
          data_hora: string
          turno: string
          equipe?: string | null
          media_parcial: number | null
          nps_nota: number | null
          status: string
        }>>('/api/dashboard/pesquisas')
    const manifestationsPromise = user?.role !== 'Administrador' && user?.role !== 'Ouvidoria'
      ? Promise.resolve([])
      : backendRequest<Array<{
          id: number
          pesquisa_id: number
          tipo: string
          descricao: string
          status: string
          data: string
          anonimo: boolean
          canal_contato?: string | null
          setor_slug?: string
        }>>('/api/manifestacoes')
    const [surveys, manifestations] = await Promise.all([surveysPromise, manifestationsPromise])
    return {
      surveys: surveys.map((survey) => {
        const mean = survey.media_parcial === null ? null : Number(survey.media_parcial)
        const nps = survey.nps_nota === null ? undefined : Number(survey.nps_nota)
        return {
          id: String(survey.id),
          sectorSlug: survey.setor_slug,
          createdAt: survey.data_hora,
          shift: survey.turno === 'manha' ? 'Manhã' : survey.turno === 'tarde' ? 'Tarde' : 'Noite',
          ...(survey.equipe ? { teamName: survey.equipe } : {}),
          answers: {
            ...(mean === null ? {} : { overallRating: Math.round(mean) }),
            ...(nps === undefined ? {} : { nps }),
          },
          mean,
          complete: survey.status === 'concluida',
        }
      }),
      manifestations: manifestations.map((manifestation) => mapManifestation(manifestation)),
      manifestationOpenCount: summary.manifestacoes_abertas,
    }
  }
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
  if (API_BASE_URL) {
    const response = await backendRequest<{
      total_respostas: number | null
      media_geral: number | null
      nps_geral: number | null
      elogios_gerais: number
      setores: Array<{ slug: string; total_respostas: number | null; media: number | null }>
    }>('/api/tvwall')
    return {
      responseCount: response.total_respostas,
      satisfactionAverage: response.media_geral,
      nps: response.nps_geral,
      complimentCount: response.elogios_gerais,
      sectors: response.setores
        .filter((sector) => sector.total_respostas !== null && sector.media !== null)
        .map((sector) => ({
          sectorSlug: sector.slug,
          responseCount: sector.total_respostas ?? 0,
          satisfactionAverage: Number(sector.media),
        })),
    }
  }
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
    await backendRequest<void>(`/api/manifestacoes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: status === 'Em análise' ? 'em_tratamento' : status === 'Concluída' ? 'concluida' : 'aberta',
      }),
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
    const department = await backendRequest<BackendDepartment>('/api/admin/setores', {
      method: 'POST',
      body: JSON.stringify({ nome: input.name, slug: input.slug }),
    })
    return mapDepartment(department)
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
    const result = await backendRequest<{
      token: string
      usuario: { id: number; nome: string; email: string; perfil: string; permissoes: string[]; setor_id?: number | null }
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha: password }),
    })
    sessionStorage.setItem(DEMO_TOKEN_KEY, result.token)
    const permissions = result.usuario.permissoes ?? []
    const userRole: AuthUser['role'] = permissions.includes('super_admin')
      ? 'Administrador'
      : permissions.includes('ouvidoria')
        ? 'Ouvidoria'
      : permissions.includes('visualizador')
        ? 'Visualizador'
        : permissions.includes('gestao') || permissions.includes('admin_setor')
        ? 'Gestão'
          : (() => { throw new Error('O perfil desta conta não é compatível com a área de gestão do front-end.') })()
    const departments = await getDepartments()
    const linkedSector = departments.find((department) => Number(department.id) === Number(result.usuario.setor_id))
    const user: AuthUser = {
      name: result.usuario.nome,
      email: result.usuario.email,
      role: userRole,
      ...(linkedSector ? { sectorSlug: linkedSector.slug } : {}),
    }
    sessionStorage.setItem('sgep:user', JSON.stringify(user))
    return user
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
