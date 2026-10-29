import type { Department, Manifestation, SurveyQuestion, SurveyRecord } from '../types'

export const departments: Department[] = [
  { id: '1', name: 'Recepção', slug: 'recepcao', description: 'Chegada, orientação e acolhimento', icon: 'door', active: true },
  { id: '2', name: 'Triagem', slug: 'triagem', description: 'Escuta e avaliação inicial', icon: 'heart', active: true },
  { id: '3', name: 'Enfermagem', slug: 'enfermagem', description: 'Cuidado e atenção da equipe', icon: 'nurse', active: true },
  { id: '4', name: 'Atendimento médico', slug: 'medico', description: 'Consulta e orientações médicas', icon: 'doctor', active: true },
  { id: '5', name: 'Internação', slug: 'internacao', description: 'Acomodação e cuidados durante a estadia', icon: 'bed', active: true },
  { id: '6', name: 'Raio-X e exames', slug: 'raio-x', description: 'Realização de exames e diagnóstico', icon: 'scan', active: true },
]

export const demoQuestions: SurveyQuestion[] = [
  { id: 'geral', text: 'De modo geral, como foi sua experiência?', type: 'rostinho', required: true, active: true, order: 1, sectorSlug: null, answerKey: 'overallRating' },
  { id: 'setor', text: 'Como foi o atendimento neste setor?', type: 'rostinho', required: false, active: true, order: 2, sectorSlug: null, answerKey: 'departmentRating' },
  { id: 'recomendacao', text: 'De 0 a 10, o quanto você recomendaria nosso hospital?', type: 'nps', required: false, active: true, order: 3, sectorSlug: null, answerKey: 'nps' },
  { id: 'comentario', text: 'Quer contar mais alguma coisa?', type: 'texto', required: false, active: true, order: 4, sectorSlug: null, answerKey: 'comment' },
]

const sampleRatings = [5, 4, 5, 4, 3, 5, 4, 5, 2, 4, 5, 3, 4, 5, 4, 3, 5, 4, 5, 4, 2, 5, 4, 3, 5, 4, 5, 4]
const sampleNps = [10, 9, 10, 8, 7, 10, 9, 10, 5, 8, 10, 7, 9, 10, 8, 7, 10, 9, 10, 8, 4, 10, 9, 7, 10, 8, 9, 10]

export function createDemoSurveys(now = new Date()): SurveyRecord[] {
  return sampleRatings.map((rating, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - (index % 14))
    date.setHours(8 + (index % 12), (index * 7) % 60, 0, 0)
    const sector = departments[index % departments.length]
    const nps = sampleNps[index]
    const mean = index % 4 === 0 ? (rating + ((index % 3) + 2)) / 2 : rating
    return {
      id: `demo-${index + 1}`,
      sectorSlug: sector.slug,
      createdAt: date.toISOString(),
      shift: index % 3 === 0 ? 'Manhã' : index % 3 === 1 ? 'Tarde' : 'Noite',
      teamName: `Equipe ${String.fromCharCode(65 + (index % 3))}`,
      answers: { overallRating: rating, departmentRating: Math.min(5, rating), nps },
      mean: Number(mean.toFixed(1)),
      complete: index % 9 !== 0,
    }
  })
}

export function createDemoManifestations(now = new Date()): Manifestation[] {
  const examples: Array<Pick<Manifestation, 'type' | 'description' | 'status' | 'sectorSlug'>> = [
    { type: 'Reclamação', description: 'Esperei bastante para receber orientação na chegada.', status: 'Em análise', sectorSlug: 'recepcao' },
    { type: 'Elogio', description: 'A equipe de enfermagem foi muito atenciosa comigo.', status: 'Concluída', sectorSlug: 'enfermagem' },
    { type: 'Sugestão', description: 'Seria bom ter mais placas indicando a sala de exames.', status: 'Aberta', sectorSlug: 'raio-x' },
    { type: 'Reclamação', description: 'Gostaria de mais informações sobre o tempo de espera.', status: 'Aberta', sectorSlug: 'triagem' },
    { type: 'Elogio', description: 'O atendimento médico foi cuidadoso e explicou tudo.', status: 'Em análise', sectorSlug: 'medico' },
  ]
  return examples.map((item, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - index)
    return {
      ...item,
      id: `manifestacao-${index + 1}`,
      surveyId: `demo-${index + 1}`,
      createdAt: date.toISOString(),
      anonymous: true,
    }
  })
}

export function getShift(date = new Date()): SurveyRecord['shift'] {
  const hour = date.getHours()
  return hour < 12 ? 'Manhã' : hour < 18 ? 'Tarde' : 'Noite'
}
