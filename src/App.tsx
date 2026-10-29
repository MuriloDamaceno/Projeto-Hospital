import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { ProtectedLayout } from './components/ManagementLayout'
import { AdministrationPage, DashboardPage, LoginPage, OmbudsmanManagementPage, TVWallPage } from './pages/Management'
import { OmbudsmanForm, PrivacyPage, SurveyFlow, SurveyThanks } from './pages/SurveyFlow'
import { PublicHome } from './pages/PublicHome'
import { createSurvey } from './services/api'
import './App.css'

function StartSurvey() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    createSurvey(slug).then((survey) => {
      if (active) navigate(`/pesquisa/${slug}/pergunta/1?pesquisa=${encodeURIComponent(survey.id)}`, { replace: true })
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível iniciar a pesquisa.')
    })
    return () => { active = false }
  }, [navigate, slug])

  return <main className="survey-loading-page">{error ? <div className="alert alert-error" role="alert">{error}<p><a href="/">Voltar ao início</a></p></div> : <><span className="spinner" /> Preparando sua pesquisa…</>}</main>
}

function RouterView() {
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
      <Route path="/pesquisa/:slug" element={<StartSurvey />} />
      <Route path="/pesquisa/:slug/pergunta/:step" element={<SurveyFlow />} />
      <Route path="/pesquisa/agradecimento" element={<SurveyThanks />} />
      <Route path="/ouvidoria" element={<OmbudsmanForm />} />
      <Route path="/tv-wall" element={<TVWallPage />} />
      <Route path="/gestao/login" element={<LoginPage />} />
      <Route path="/gestao" element={<ProtectedLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="ouvidoria" element={<OmbudsmanManagementPage />} />
        <Route path="configuracoes" element={<AdministrationPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return <BrowserRouter><RouterView /></BrowserRouter>
}
