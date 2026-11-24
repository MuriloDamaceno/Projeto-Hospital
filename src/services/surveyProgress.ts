export interface SurveyProgress {
  surveyId: string
  sectorSlug: string
  step: number
  lowRating?: boolean
}

const storageKey = 'hospital-survey-progress'

export function readSurveyProgress(): SurveyProgress | null {
  const stored = sessionStorage.getItem(storageKey)
  if (!stored) return null

  const value: unknown = JSON.parse(stored)
  const lowRating = typeof value === 'object' && value !== null && 'lowRating' in value
    ? value.lowRating
    : undefined
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
    && (lowRating === undefined || typeof lowRating === 'boolean')
  ) {
    return {
      surveyId: value.surveyId,
      sectorSlug: value.sectorSlug,
      step: value.step,
      ...(lowRating === true ? { lowRating: true } : {}),
    }
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
