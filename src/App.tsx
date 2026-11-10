import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ProtectedLayout } from './components/ManagementLayout'
import { AdministrationPage, DashboardPage, LoginPage, ManifestationDetailPage, OmbudsmanManagementPage, QuestionsManagementPage, TVWallPage } from './pages/Management'
import { OmbudsmanForm, SurveyFlow, SurveyThanks } from './pages/SurveyFlow'
import { ManualPage } from './pages/ManualPage'
import { PrivacyPage, PublicHome } from './pages/PublicHome'
import { createSurvey } from './services/api'
import { readSurveyProgress, saveSurveyProgress } from './services/surveyProgress'
import './App.css'

function StartSurvey({ slug, onStarted }: { slug: string; onStarted: (surveyId: string) => void }) {
  const [error, setError] = useState('')
  const startRequest = useRef<{ slug: string; promise: ReturnType<typeof createSurvey> } | null>(null)

  useEffect(() => {
    let active = true
    if (!startRequest.current || startRequest.current.slug !== slug) {
      startRequest.current = { slug, promise: createSurvey(slug) }
    }
    startRequest.current.promise.then((survey) => {
      if (active) onStarted(survey.id)
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível iniciar a pesquisa.')
    })
    return () => { active = false }
  }, [onStarted, slug])

  return <main className="survey-loading-page">{error ? <div className="alert alert-error" role="alert">{error}<p><a href="/">Voltar ao início</a></p></div> : <><span className="spinner" /> Preparando sua pesquisa…</>}</main>
}

function SurveyEntry() {
  const { slug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const locationQuery = searchParams.toString()
  const legacySurveyId = searchParams.get('i') ?? searchParams.get('pesquisa')
  const legacyStep = Number(searchParams.get('p') ?? searchParams.get('pergunta') ?? '1')
  const [progress, setProgress] = useState(() => {
    if (legacySurveyId && Number.isInteger(legacyStep) && legacyStep > 0) {
      return { surveyId: legacySurveyId, sectorSlug: slug, step: legacyStep }
    }
    const stored = readSurveyProgress()
    return stored?.sectorSlug === slug ? stored : null
  })

  useEffect(() => {
    if (legacySurveyId && Number.isInteger(legacyStep) && legacyStep > 0) {
      const restored = { surveyId: legacySurveyId, sectorSlug: slug, step: legacyStep }
      saveSurveyProgress(restored)
    }
    if (locationQuery) navigate(`/pesquisa/${slug}`, { replace: true })
  }, [legacySurveyId, legacyStep, locationQuery, navigate, slug])

  const onStarted = useCallback((surveyId: string) => {
    const started = { surveyId, sectorSlug: slug, step: 1 }
    saveSurveyProgress(started)
    setProgress(started)
  }, [slug])

  const onStepChange = useCallback((step: number) => {
    setProgress((current) => {
      if (!current) return current
      const updated = { ...current, step }
      saveSurveyProgress(updated)
      return updated
    })
  }, [])

  if (!progress) return <StartSurvey slug={slug} onStarted={onStarted} />
  return <SurveyFlow slug={slug} surveyId={progress.surveyId} currentStep={progress.step} onStepChange={onStepChange} />
}

function LegacySurveyRoute() {
  const { slug = '', step = '1' } = useParams()
  const [searchParams] = useSearchParams()
  const query = new URLSearchParams([['p', step]])
  const surveyId = searchParams.get('i') ?? searchParams.get('pesquisa')
  if (surveyId) query.append('i', surveyId)
  for (const [key, value] of searchParams) {
    if (!['p', 'pergunta', 'i', 'pesquisa'].includes(key)) query.append(key, value)
  }
  return <Navigate to={`/pesquisa/${slug}?${query.toString()}`} replace />
}

function RouterView() {
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
      <Route path="/manual" element={<ManualPage />} />
      <Route path="/pesquisa/:slug" element={<SurveyEntry />} />
      <Route path="/pesquisa/:slug/pergunta/:step" element={<LegacySurveyRoute />} />
      <Route path="/pesquisa/agradecimento" element={<SurveyThanks />} />
      <Route path="/ouvidoria" element={<OmbudsmanForm />} />
      <Route path="/tv-wall" element={<TVWallPage />} />
      <Route path="/gestao/login" element={<LoginPage />} />
      <Route path="/gestao" element={<ProtectedLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="ouvidoria" element={<OmbudsmanManagementPage />} />
        <Route path="ouvidoria/:manifestationId" element={<ManifestationDetailPage />} />
        <Route path="perguntas" element={<QuestionsManagementPage />} />
        <Route path="configuracoes" element={<AdministrationPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return <BrowserRouter><RouterView /></BrowserRouter>
}
