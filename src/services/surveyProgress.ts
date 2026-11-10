export interface SurveyProgress {
  surveyId: string
  sectorSlug: string
  step: number
}

const storageKey = 'hospital-survey-progress'

export function readSurveyProgress(): SurveyProgress | null {
  const stored = sessionStorage.getItem(storageKey)
  if (!stored) return null

  const value: unknown = JSON.parse(stored)
  if (
    typeof value === 'object'
    && value !== null
    && 'surveyId' in value
    && typeof value.surveyId === 'string'
    && 'sectorSlug' in value
    && typeof value.sectorSlug === 'string'
    && 'step' in value
    && typeof value.step === 'number'
    && Number.isInteger(value.step)
    && value.step > 0
  ) {
    return { surveyId: value.surveyId, sectorSlug: value.sectorSlug, step: value.step }
  }

  sessionStorage.removeItem(storageKey)
  return null
}

export function saveSurveyProgress(progress: SurveyProgress): void {
  sessionStorage.setItem(storageKey, JSON.stringify(progress))
}

export function clearSurveyProgress(): void {
  sessionStorage.removeItem(storageKey)
}
