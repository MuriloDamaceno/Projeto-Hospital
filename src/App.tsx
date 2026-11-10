import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ProtectedLayout } from './components/ManagementLayout'
import { AdministrationPage, DashboardPage, LoginPage, ManifestationDetailPage, OmbudsmanManagementPage, QuestionsManagementPage, TVWallPage } from './pages/Management'
import { OmbudsmanForm, SurveyFlow, SurveyThanks } from './pages/SurveyFlow'
import { ManualPage } from './pages/ManualPage'
import { PrivacyPage, PublicHome } from './pages/PublicHome'
import { createSurvey } from './services/api'
import './App.css'

function StartSurvey() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const startRequest = useRef<{ slug: string; promise: ReturnType<typeof createSurvey> } | null>(null)

  useEffect(() => {
    let active = true
    if (!startRequest.current || startRequest.current.slug !== slug) {
      startRequest.current = { slug, promise: createSurvey(slug) }
    }
    startRequest.current.promise.then((survey) => {
      if (active) navigate(`/pesquisa/${slug}?pergunta=1&pesquisa=${encodeURIComponent(survey.id)}`, { replace: true })
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível iniciar a pesquisa.')
    })
    return () => { active = false }
  }, [navigate, slug])

  return <main className="survey-loading-page">{error ? <div className="alert alert-error" role="alert">{error}<p><a href="/">Voltar ao início</a></p></div> : <><span className="spinner" /> Preparando sua pesquisa…</>}</main>
}

function SurveyEntry() {
  const [searchParams] = useSearchParams()
  return searchParams.get('pesquisa') ? <SurveyFlow /> : <StartSurvey />
}

function LegacySurveyRoute() {
  const { slug = '', step = '1' } = useParams()
  const [searchParams] = useSearchParams()
  const query = new URLSearchParams([['pergunta', step]])
  const surveyId = searchParams.get('pesquisa')
  if (surveyId) query.append('pesquisa', surveyId)
  for (const [key, value] of searchParams) {
    if (key !== 'pergunta' && key !== 'pesquisa') query.append(key, value)
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
