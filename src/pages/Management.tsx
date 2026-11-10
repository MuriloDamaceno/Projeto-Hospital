import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowDownToLine, ArrowLeft, ArrowUpRight, Check, ChevronDown, CircleAlert, ClipboardList, ExternalLink, Filter, ListChecks, Plus, RefreshCw, Search, ShieldCheck, Smile, UsersRound } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Brand } from '../components/Brand'
import { DepartmentIcon } from '../components/DepartmentIcon'
import { createDepartment, createQuestion, getCurrentUser, getDashboardData, getDepartments, getManagedQuestions, getTVWallData, isDemoMode, login, updateManifestationStatus, updateQuestion } from '../services/api'
import type { AuthUser, DashboardPayload, Department, Manifestation, ManifestationStatus, SurveyQuestion, SurveyQuestionType, SurveyRecord, TVWallPayload } from '../types'

function percentage(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0
}

function getNps(surveys: SurveyRecord[]) {
  const ratings = surveys.map((survey) => survey.answers.nps).filter((value): value is number => typeof value === 'number')
  if (!ratings.length) return null
  const promoters = ratings.filter((value) => value >= 9).length
  const detractors = ratings.filter((value) => value <= 6).length
  return Math.round(((promoters - detractors) / ratings.length) * 100)
}

function getTrendChart(surveys: SurveyRecord[], now: Date, period: number) {
  const start = new Date(now.getTime() - period * 24 * 60 * 60 * 1000)
  const bucketCount = 15
  const bucketDuration = (now.getTime() - start.getTime()) / bucketCount
  const counts = Array.from({ length: bucketCount }, () => 0)
  for (const survey of surveys) {
    const timestamp = new Date(survey.createdAt).getTime()
    if (timestamp < start.getTime() || timestamp > now.getTime()) continue
    const bucket = Math.min(bucketCount - 1, Math.floor((timestamp - start.getTime()) / bucketDuration))
    counts[bucket] += 1
  }
  const max = Math.max(1, ...counts)
  const points = counts.map((count, index) => `${(index / (bucketCount - 1)) * 640},${178 - (count / max) * 145}`)
  const line = `M ${points.join(' L ')}`
  const area = `${line} L 640 190 L 0 190 Z`
  const labels = [0, 3, 6, 9, 12, 14].map((index) => {
    const date = new Date(start.getTime() + bucketDuration * index)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
  })
  const yLabels = [1, 0.75, 0.5, 0.25, 0].map((fraction) => Math.round(max * fraction))
  return { line, area, labels, yLabels }
}

function exportCsv(payload: DashboardPayload, departments: Department[], includeTeams: boolean) {
  const sectorName = (slug: string) => departments.find((department) => department.slug === slug)?.name ?? slug
  const teamCounts = new Map<string, number>()
  for (const survey of payload.surveys) {
    if (survey.teamName) teamCounts.set(survey.teamName, (teamCounts.get(survey.teamName) ?? 0) + 1)
  }
  const headers = ['Data', 'Setor', 'Turno', ...(includeTeams ? ['Equipe'] : []), 'Nota geral (1-5)', 'NPS (0-10)', 'Média parcial', 'Pesquisa completa']
  const rows = [
    headers,
    ...payload.surveys.map((survey) => [
      new Date(survey.createdAt).toLocaleString('pt-BR'),
      sectorName(survey.sectorSlug),
      survey.shift,
      ...(includeTeams ? [survey.teamName && (teamCounts.get(survey.teamName) ?? 0) >= 5 ? survey.teamName : 'Volume insuficiente'] : []),
      survey.answers.overallRating ?? '',
      survey.answers.nps ?? '',
      survey.mean ?? '',
      survey.complete ? 'Sim' : 'Não',
    ]),
  ]
  const csv = `\uFEFF${rows.map((row) => row.map((field) => `"${String(field).replaceAll('"', '""')}"`).join(';')).join('\r\n')}`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  link.download = `relatorio-experiencia-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

function Topbar({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-topbar"><div><span className="page-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function useDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  async function refresh() {
    try {
      const [dashboard, sectors] = await Promise.all([getDashboardData(), getDepartments()])
      setData(dashboard)
      setDepartments(sectors)
      setLastUpdated(new Date())
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void refresh() }, 0)
    const timer = window.setInterval(() => { void refresh() }, 30_000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(timer)
    }
  }, [])
  return { data, departments, error, loading, refresh, lastUpdated, setData, setError }
}

function useTVWall() {
  const [data, setData] = useState<TVWallPayload | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  async function refresh() {
    try {
      const [wall, sectors] = await Promise.all([getTVWallData(), getDepartments()])
      setData(wall)
      setDepartments(sectors)
      setLastUpdated(new Date())
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os indicadores públicos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void refresh() }, 0)
    const timer = window.setInterval(() => { void refresh() }, 30_000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(timer)
    }
  }, [])
  return { data, departments, error, loading, refresh, lastUpdated }
}

export function DashboardPage() {
  const { data, departments, error, loading, refresh, lastUpdated } = useDashboard()
  const user = getCurrentUser()
  const canFilterTeam = user?.role === 'Gestão' || user?.role === 'Administrador'
  const [sector, setSector] = useState(user?.role === 'Gestão' ? user.sectorSlug ?? 'todos' : 'todos')
  const [period, setPeriod] = useState('30')
  const [shift, setShift] = useState('todos')
  const [rating, setRating] = useState('todas')
  const [team, setTeam] = useState('todos')
  const [busy, setBusy] = useState(false)
  const [now] = useState(() => new Date())

  const periodAndSectorSurveys = useMemo(() => {
    if (!data) return []
    const since = new Date(now)
    since.setDate(since.getDate() - Number(period))
    return data.surveys.filter((survey) => (sector === 'todos' || survey.sectorSlug === sector) && new Date(survey.createdAt) >= since)
  }, [data, now, period, sector])
  const matchingFilters = (survey: SurveyRecord) => {
    const matchesShift = shift === 'todos' || survey.shift === shift
    const matchesRating = rating === 'todas'
      || (rating === 'baixas' && survey.mean !== null && survey.mean <= 2)
      || (rating === 'regulares' && survey.mean !== null && survey.mean > 2 && survey.mean <= 3)
      || (rating === 'positivas' && survey.mean !== null && survey.mean >= 4)
    return matchesShift && matchesRating
  }
  const shiftAndRatingSurveys = periodAndSectorSurveys.filter(matchingFilters)
  const teamCounts = new Map<string, number>()
  for (const survey of shiftAndRatingSurveys) {
    if (survey.teamName) teamCounts.set(survey.teamName, (teamCounts.get(survey.teamName) ?? 0) + 1)
  }
  const availableTeams = [...teamCounts].filter(([, count]) => count >= 5).map(([name]) => name)
  const filtered = shiftAndRatingSurveys.filter((survey) => !canFilterTeam || team === 'todos' || survey.teamName === team)
  const answered = filtered.filter((survey) => survey.mean !== null)
  const average = answered.length ? answered.reduce((sum, survey) => sum + (survey.mean ?? 0), 0) / answered.length : 0
  const incomplete = filtered.filter((survey) => !survey.complete).length
  const nps = getNps(filtered)
  const since = new Date(now.getTime() - Number(period) * 24 * 60 * 60 * 1000)
  const previousSince = new Date(since.getTime() - Number(period) * 24 * 60 * 60 * 1000)
  const previousTotal = (data?.surveys ?? []).filter((survey) => {
    const date = new Date(survey.createdAt)
    const previousWindow = (sector === 'todos' || survey.sectorSlug === sector) && date >= previousSince && date < since
    const previousTeam = !canFilterTeam || team === 'todos' || survey.teamName === team
    return previousWindow && previousTeam && matchingFilters(survey)
  }).length
  const change = previousTotal ? Math.round(((filtered.length - previousTotal) / previousTotal) * 100) : null
  const trend = getTrendChart(filtered, now, Number(period))
  const sectorStats = departments.map((department) => {
    const surveys = filtered.filter((survey) => survey.sectorSlug === department.slug && survey.mean !== null)
    return {
      department,
      total: surveys.length,
      average: surveys.length ? surveys.reduce((sum, survey) => sum + (survey.mean ?? 0), 0) / surveys.length : 0,
    }
  }).filter((item) => item.total).sort((a, b) => b.average - a.average)

  async function downloadReport() {
    if (!data) return
    setBusy(true)
    try {
      exportCsv({ surveys: filtered, manifestations: data.manifestations }, departments, canFilterTeam)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Topbar eyebrow="CENTRAL DE QUALIDADE" title="Visão geral" description="Acompanhe a experiência dos pacientes e identifique oportunidades de melhoria." action={<button className="button button-outline" onClick={() => void downloadReport()} disabled={!data || busy}><ArrowDownToLine size={17} /> Exportar Excel</button>} />
      {error && <div className="alert alert-error" role="alert">{error}<button onClick={() => void refresh()}>Tentar novamente</button></div>}
      <div className="dashboard-toolbar">
        <div className="toolbar-label"><Filter size={15} /> FILTROS</div>
        <label><span>Período</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select><ChevronDown size={14} /></label>
        <label><span>Setor</span><select value={sector} disabled={user?.role === 'Gestão'} onChange={(event) => setSector(event.target.value)}>{user?.role !== 'Gestão' && <option value="todos">Todos os setores</option>}{departments.filter((item) => user?.role !== 'Gestão' || item.slug === user.sectorSlug).map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select><ChevronDown size={14} /></label>
        <label><span>Turno</span><select value={shift} onChange={(event) => setShift(event.target.value)}><option value="todos">Todos os turnos</option><option>Manhã</option><option>Tarde</option><option>Noite</option></select><ChevronDown size={14} /></label>
        <label><span>Nota</span><select value={rating} onChange={(event) => setRating(event.target.value)}><option value="todas">Todas as notas</option><option value="baixas">Baixas · 1–2</option><option value="regulares">Regulares · 3</option><option value="positivas">Positivas · 4–5</option></select><ChevronDown size={14} /></label>
        {canFilterTeam && <label><span>Equipe</span><select value={team} onChange={(event) => setTeam(event.target.value)}><option value="todos">Volume mínimo</option>{availableTeams.map((name) => <option key={name}>{name}</option>)}</select><ChevronDown size={14} /></label>}
        <span className="update-note"><span className="live-dot" /> Atualizado {lastUpdated?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) ?? '—'}</span>
      </div>
      {loading && !data ? <div className="loading-panel"><span className="spinner" /> Carregando indicadores…</div> : (
        <>
          <section className="metric-grid" aria-label="Indicadores principais">
            <article className="metric-card"><div className="metric-label"><span>Respostas recebidas</span><span className="metric-icon metric-lilac"><ClipboardList size={18} /></span></div><strong>{filtered.length.toLocaleString('pt-BR')}</strong><small>{change === null ? 'Sem período anterior para comparar' : <><span className={change >= 0 ? 'metric-up' : 'metric-down'}>{change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {Math.abs(change)}%</span> vs. período anterior</>}</small><div className="metric-bottom-track"><span style={{ width: `${previousTotal ? filtered.length / (filtered.length + previousTotal) * 100 : 0}%` }} /></div></article>
            <article className="metric-card"><div className="metric-label"><span>Satisfação média</span><span className="metric-icon metric-mint"><Smile size={18} /></span></div><strong>{answered.length ? `${average.toFixed(1).replace('.', ',')}/5` : '—'}</strong><small>Escala de 1 a 5 · pesquisa geral</small><div className="metric-bottom-track"><span style={{ width: `${average / 5 * 100}%` }} /></div></article>
            <article className="metric-card"><div className="metric-label"><span>NPS de recomendação</span><span className="metric-icon metric-blue"><HeartPulseIcon /></span></div><strong>{nps === null ? '—' : nps}</strong><small>{nps === null ? 'Aguardando avaliações NPS' : 'Promotores menos detratores'}</small><div className="nps-mini"><span>-100</span><span style={{ left: `${nps === null ? 50 : (nps + 100) / 2}%` }} /><span>+100</span></div></article>
            <article className="metric-card"><div className="metric-label"><span>Pesquisas parciais</span><span className="metric-icon metric-amber"><CircleAlert size={18} /></span></div><strong>{incomplete}</strong><small>Respostas incompletas no período</small><div className="metric-bottom-track metric-track-amber"><span style={{ width: `${percentage(incomplete, filtered.length)}%` }} /></div></article>
          </section>

          <section className="dashboard-panels">
            <article className="panel trend-panel">
              <div className="panel-heading"><div><h2>Respostas ao longo do tempo</h2><p>Volume de pesquisas registradas</p></div><div className="panel-actions"><button className="icon-button" aria-label="Exportar PDF" title="Salvar painel como PDF" onClick={() => window.print()}><ArrowDownToLine size={17} /></button><button className="icon-button" aria-label="Atualizar dados" onClick={() => void refresh()}><RefreshCw size={17} /></button></div></div>
              <div className="chart-area">
                <div className="chart-y-labels">{trend.yLabels.map((label, index) => <span key={index}>{label}</span>)}</div>
                <div className="chart-content"><div className="chart-grid-lines"><i /><i /><i /><i /><i /></div><svg viewBox="0 0 640 190" preserveAspectRatio="none" role="img" aria-label={`Respostas ao longo dos últimos ${period} dias`}><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#e5323b" stopOpacity=".2" /><stop offset="100%" stopColor="#e5323b" stopOpacity="0" /></linearGradient></defs><path d={trend.area} fill="url(#chartFill)" /><path d={trend.line} fill="none" stroke="#e5323b" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg><div className="chart-x-labels">{trend.labels.map((label, index) => <span key={index}>{label}</span>)}</div></div>
              </div>
            </article>
            <article className="panel breakdown-panel">
              <div className="panel-heading"><div><h2>Satisfação por setor</h2><p>Nota média · escala de 1 a 5</p></div><Link to="/gestao/configuracoes" className="link-small">Ver setores <ArrowUpRight size={14} /></Link></div>
              <div className="department-bars">{sectorStats.length ? sectorStats.map(({ department, total, average: score }) => <div className="department-bar" key={department.id}><span className={`mini-department-icon tone-${department.icon}`}><DepartmentIcon name={department.icon} size={16} /></span><span className="department-bar-name">{department.name}</span><span className="bar-track"><i style={{ width: `${score / 5 * 100}%` }} /></span><strong>{score.toFixed(1).replace('.', ',')}</strong><small>{total}</small></div>) : <div className="empty-note">Ainda não há respostas neste filtro.</div>}</div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel recent-panel"><div className="panel-heading"><div><h2>Respostas recentes</h2><p>Últimos registros da pesquisa</p></div><button className="link-small" onClick={downloadReport}>Ver relatório <ArrowUpRight size={14} /></button></div>
              <div className="table-wrap"><table><thead><tr><th>SETOR</th><th>DATA E TURNO</th>{canFilterTeam && <th>EQUIPE</th>}<th>AVALIAÇÃO</th><th>STATUS</th></tr></thead><tbody>{filtered.slice(0, 5).map((survey) => <tr key={survey.id}><td><span className="table-sector">{departments.find((item) => item.slug === survey.sectorSlug)?.name ?? survey.sectorSlug}</span></td><td>{new Date(survey.createdAt).toLocaleDateString('pt-BR')} <small>{survey.shift}</small></td>{canFilterTeam && <td>{survey.teamName && (teamCounts.get(survey.teamName) ?? 0) >= 5 ? survey.teamName : 'Volume insuficiente'}</td>}<td><span className="rating-stars">{'★'.repeat(survey.answers.overallRating ?? 0)}<span>{'★'.repeat(5 - (survey.answers.overallRating ?? 0))}</span></span></td><td><span className={`status-pill ${survey.complete ? 'status-complete' : 'status-partial'}`}>{survey.complete ? 'Completa' : 'Parcial'}</span></td></tr>)}</tbody></table>{!filtered.length && <div className="empty-note">Nenhuma resposta encontrada para este período.</div>}</div>
            </article>
            <article className="panel manifestations-summary"><div className="panel-heading"><div><h2>Ouvidoria</h2><p>Manifestações para acompanhamento</p></div><span className="summary-icon"><ClipboardList size={17} /></span></div><strong className="manifestation-total">{data?.manifestationOpenCount ?? data?.manifestations.filter((item) => item.status !== 'Concluída').length ?? 0}</strong><span className="manifestation-caption">em aberto ou em análise</span><div className="summary-divider" /><div className="summary-foot"><span>Prazo de resposta</span><strong>Definido pela Ouvidoria</strong></div>{user?.role === 'Administrador' || user?.role === 'Ouvidoria' ? <Link className="button button-dark button-wide" to="/gestao/ouvidoria">Acessar Ouvidoria <ArrowUpRight size={16} /></Link> : <span className="dashboard-disclaimer">A Ouvidoria é administrada por uma equipe dedicada.</span>}</article>
          </section>
          <div className="dashboard-disclaimer"><ShieldCheck size={15} /> Indicadores por turno e equipe só devem ser exibidos à gestão quando atingirem o volume mínimo definido pelo hospital.</div>
        </>
      )}
    </>
  )
}

function HeartPulseIcon() {
  return <span aria-hidden="true">♡</span>
}

export function OmbudsmanManagementPage() {
  const { data, departments, error, loading, refresh } = useDashboard()
  const [filter, setFilter] = useState('Todas')
  const user = getCurrentUser()
  const canSeeContact = user?.role === 'Ouvidoria' || user?.role === 'Administrador'
  const records = (data?.manifestations ?? []).filter((item) => filter === 'Todas' || item.status === filter)

  async function changeStatus(item: Manifestation, status: ManifestationStatus) {
    try {
      await updateManifestationStatus(item.id, status)
      await refresh()
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Não foi possível atualizar o status.')
    }
  }

  return (
    <>
      <Topbar eyebrow="ESCUTA E ACOLHIMENTO" title="Ouvidoria" description="Acompanhe elogios, reclamações e sugestões recebidas dos pacientes." action={<button className="button button-outline" onClick={() => void refresh()}><RefreshCw size={16} /> Atualizar</button>} />
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="ombudsman-summary-row"><div className="ombudsman-summary-card"><span className="metric-icon metric-lilac"><ClipboardList size={19} /></span><div><strong>{data?.manifestations.length ?? 0}</strong><small>Total de manifestações</small></div></div><div className="ombudsman-summary-card"><span className="metric-icon metric-amber"><CircleAlert size={19} /></span><div><strong>{data?.manifestations.filter((item) => item.status === 'Aberta').length ?? 0}</strong><small>Aguardando análise</small></div></div><div className="ombudsman-summary-card"><span className="metric-icon metric-mint"><Check size={19} /></span><div><strong>{data?.manifestations.filter((item) => item.status === 'Concluída').length ?? 0}</strong><small>Concluídas</small></div></div></div>
      <section className="panel inbox-panel">
        <div className="inbox-toolbar"><div><h2>Caixa de manifestações</h2><p>Dados de contato são exibidos somente para perfis autorizados.</p></div><label className="select-wrap"><span className="sr-only">Filtrar status</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>Todas</option><option>Aberta</option><option>Em análise</option><option>Concluída</option></select><ChevronDown size={14} /></label></div>
        {loading && !data ? <div className="loading-panel"><span className="spinner" /> Carregando manifestações…</div> : records.length ? records.map((item) => <article className="inbox-item" key={item.id}><div className={`inbox-type type-${item.type.toLowerCase()}`}>{item.type === 'Elogio' ? <Smile size={17} /> : item.type === 'Sugestão' ? <Plus size={17} /> : <CircleAlert size={17} />}</div><div className="inbox-message"><div className="inbox-title-row"><strong>{item.type}</strong><span className="inbox-sector">{departments.find((department) => department.slug === item.sectorSlug)?.name ?? item.sectorSlug}</span><span className="inbox-date">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span></div><Link className="inbox-description-link" to={`/gestao/ouvidoria/${encodeURIComponent(item.id)}`}><p>{item.description}</p><span className="inbox-open-link">Abrir manifestação <ArrowUpRight size={12} /></span></Link><small>{item.anonymous ? 'Manifestação anônima' : canSeeContact && item.contact ? `Retorno autorizado · ${item.contact}` : 'Paciente solicitou retorno'}</small></div><label className="status-select"><span className="sr-only">Alterar status</span><select value={item.status} onChange={(event) => void changeStatus(item, event.target.value as ManifestationStatus)}><option>Aberta</option><option>Em análise</option><option>Concluída</option></select><ChevronDown size={13} /></label></article>) : <div className="empty-state"><Search size={25} /><strong>Nenhuma manifestação</strong><span>Não há registros com este status.</span></div>}
      </section>
      <div className="dashboard-disclaimer"><ShieldCheck size={15} /> Quem deseja acompanhar o resultado deve entrar em contato diretamente com a Ouvidoria.</div>
    </>
  )
}

export function ManifestationDetailPage() {
  const { manifestationId = '' } = useParams()
  const { data, departments, error, loading, refresh } = useDashboard()
  const user = getCurrentUser()
  const manifestation = data?.manifestations.find((item) => item.id === manifestationId)
  const canSeeContact = user?.role === 'Ouvidoria' || user?.role === 'Administrador'

  async function changeStatus(status: ManifestationStatus) {
    if (!manifestation) return
    try {
      await updateManifestationStatus(manifestation.id, status)
      await refresh()
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Não foi possível atualizar o status.')
    }
  }

  if (loading && !data) return <div className="loading-panel"><span className="spinner" /> Carregando manifestação…</div>
  if (!manifestation) {
    return (
      <>
        <Topbar eyebrow="ESCUTA E ACOLHIMENTO" title="Manifestação não encontrada" description={error || 'Não foi possível localizar esta manifestação.'} action={<Link className="button button-outline" to="/gestao/ouvidoria"><ArrowLeft size={16} /> Voltar à Ouvidoria</Link>} />
        {error && <div className="alert alert-error" role="alert">{error}</div>}
      </>
    )
  }

  return (
    <>
      <Topbar eyebrow="ESCUTA E ACOLHIMENTO" title={manifestation.type} description="Detalhes da manifestação recebida pela Ouvidoria." action={<Link className="button button-outline" to="/gestao/ouvidoria"><ArrowLeft size={16} /> Voltar à Ouvidoria</Link>} />
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <section className="panel manifestation-detail">
        <div className="manifestation-detail-meta">
          <div><span>Setor</span><strong>{departments.find((department) => department.slug === manifestation.sectorSlug)?.name ?? manifestation.sectorSlug}</strong></div>
          <div><span>Recebida em</span><strong>{new Date(manifestation.createdAt).toLocaleString('pt-BR')}</strong></div>
          <div><span>Status</span><label className="status-select"><span className="sr-only">Alterar status</span><select value={manifestation.status} onChange={(event) => void changeStatus(event.target.value as ManifestationStatus)}><option>Aberta</option><option>Em análise</option><option>Concluída</option></select><ChevronDown size={13} /></label></div>
        </div>
        <div className="manifestation-detail-body">
          <h2>Relato</h2>
          <p>{manifestation.description}</p>
        </div>
        <div className="manifestation-detail-contact">
          <h2>Contato</h2>
          <p>{manifestation.anonymous ? 'Manifestação enviada anonimamente.' : canSeeContact && manifestation.contact ? `Retorno autorizado: ${manifestation.contact}` : 'Paciente solicitou retorno. Os dados de contato não estão disponíveis para este perfil.'}</p>
        </div>
      </section>
    </>
  )
}

export function QuestionsManagementPage() {
  const user = getCurrentUser()
  const [departments, setDepartments] = useState<Department[]>([])
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [scope, setScope] = useState<string>(user?.role === 'Gestão' ? user.sectorSlug ?? '' : 'geral')
  const [text, setText] = useState('')
  const [type, setType] = useState<SurveyQuestionType>('rostinho')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const scopeSlug = scope === 'geral' ? null : scope
  const canManageGeneral = user?.role === 'Administrador'

  async function refresh(selectedScope = scope) {
    try {
      const [sectors, managedQuestions] = await Promise.all([
        getDepartments(),
        getManagedQuestions(selectedScope === 'geral' ? null : selectedScope),
      ])
      setDepartments(sectors)
      setQuestions(managedQuestions)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as perguntas.')
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(initialLoad)
  }, [])

  async function addQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await createQuestion({
        text: text.trim(),
        type,
        required: false,
        sectorSlug: scopeSlug,
      })
      setText('')
      setNotice('Pergunta adicionada. Ela aparecerá nas próximas pesquisas deste escopo.')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível adicionar a pergunta.')
    } finally {
      setBusy(false)
    }
  }

  async function saveQuestion(question: SurveyQuestion, input: Partial<Pick<SurveyQuestion, 'text' | 'active'>>) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await updateQuestion(question.id, input, question.sectorSlug ?? undefined)
      setNotice(input.active === undefined ? 'Pergunta atualizada.' : input.active ? 'Pergunta ativada.' : 'Pergunta desativada.')
      setEditingId(null)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a pergunta.')
    } finally {
      setBusy(false)
    }
  }

  if (!user || (user.role === 'Gestão' && (!user.sectorSlug || scope !== user.sectorSlug))) {
    return <Navigate to="/gestao/login" replace />
  }

  return (
    <>
      <Topbar
        eyebrow="PESQUISAS E JORNADA"
        title="Perguntas"
        description={user.role === 'Gestão' ? 'Gerencie as perguntas da pesquisa do seu setor.' : 'Gerencie perguntas gerais e perguntas de cada setor.'}
        action={user.role === 'Administrador' ? <label className="question-scope-select"><span>Escopo</span><select value={scope} onChange={(event) => { setScope(event.target.value); setNotice(''); void refresh(event.target.value) }}><option value="geral">Perguntas gerais</option>{departments.map((department) => <option key={department.id} value={department.slug}>{department.name}</option>)}</select><ChevronDown size={14} /></label> : <span className="status-pill status-complete">{departments.find((department) => department.slug === user.sectorSlug)?.name ?? 'Setor vinculado'}</span>}
      />
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      <section className="panel question-management-panel">
        <div className="panel-heading"><div><h2>{scopeSlug === null ? 'Perguntas gerais' : `Perguntas · ${departments.find((department) => department.slug === scope)?.name ?? scope}`}</h2><p>{scopeSlug === null ? 'Estas perguntas podem aparecer em todas as jornadas.' : 'Estas perguntas só aparecem na pesquisa do setor selecionado.'}</p></div><ListChecks size={19} /></div>
        <div className="question-list">
          {questions.map((question) => <article key={question.id} className={`question-row${question.active ? '' : ' question-inactive'}`}>
            <span className="question-order">{String(question.order).padStart(2, '0')}</span>
            <div className="question-row-content">
              {editingId === question.id
                ? <div className="question-edit"><input aria-label="Texto da pergunta" value={editingText} maxLength={255} onChange={(event) => setEditingText(event.target.value)} /><button className="button button-primary" disabled={busy || !editingText.trim()} onClick={() => void saveQuestion(question, { text: editingText.trim() })}>Salvar</button><button className="text-button" disabled={busy} onClick={() => setEditingId(null)}>Cancelar</button></div>
                : <><strong>{question.text}</strong><small>{question.type === 'rostinho' ? 'Rostinhos · escala de 1 a 5' : question.type === 'nps' ? 'Nota · escala de 0 a 10' : question.type === 'multipla' ? 'Múltipla escolha' : 'Resposta em texto'}{question.required ? ' · Obrigatória' : ' · Opcional'}</small></>}
            </div>
            {question.required
              ? <span className="status-pill status-required">Obrigatória</span>
              : <button className={`status-pill ${question.active ? 'status-complete' : 'status-partial'} question-toggle`} disabled={busy} onClick={() => void saveQuestion(question, { active: !question.active })}>{question.active ? 'Ativa' : 'Desativada'}</button>}
            {!editingId && !question.required && <button className="icon-button" disabled={busy} title="Editar pergunta" aria-label={`Editar ${question.text}`} onClick={() => { setEditingId(question.id); setEditingText(question.text) }}><ExternalLink size={15} /></button>}
          </article>)}
          {!questions.length && <div className="empty-state"><ListChecks size={24} /><strong>Nenhuma pergunta cadastrada</strong><span>Adicione uma pergunta para este escopo.</span></div>}
        </div>
        {scopeSlug === null
          ? <div className="dashboard-disclaimer"><ShieldCheck size={15} /> A pergunta geral NPS é definida pelo back-end e não pode ser editada nem removida por esta tela.</div>
          : <form className="add-question-form" onSubmit={(event) => void addQuestion(event)}>
          <div className="form-section-title"><Plus size={17} /><strong>Adicionar pergunta opcional</strong></div>
          <div className="add-question-fields">
            <label className="form-field"><span>Texto da pergunta</span><input value={text} onChange={(event) => setText(event.target.value)} required maxLength={255} placeholder="Ex.: Como você avalia a limpeza?" /></label>
            <label className="form-field"><span>Formato da resposta</span><select value={type} onChange={(event) => setType(event.target.value as SurveyQuestionType)}><option value="rostinho">Rostinhos · escala de 1 a 5</option><option value="nps">Nota · escala de 0 a 10</option><option value="texto">Resposta em texto</option></select></label>
            <button type="submit" className="button button-primary" disabled={busy || !text.trim()}>{busy ? 'Salvando…' : 'Adicionar pergunta'} <Plus size={16} /></button>
          </div>
        </form>}
      </section>
      <div className="dashboard-disclaimer"><ShieldCheck size={15} /> A pergunta geral obrigatória é protegida. Gestores só editam o próprio setor; apenas Administradores podem alterar perguntas gerais ou outro setor.</div>
      {!canManageGeneral && <div className="dashboard-disclaimer"><ShieldCheck size={15} /> O acesso a este setor também precisa ser validado pela API usando o perfil e o setor vinculados à sua conta.</div>}
    </>
  )
}

export function AdministrationPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  async function refresh() {
    try {
      setDepartments(await getDepartments())
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os setores.')
    }
  }
  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(initialLoad)
  }, [])

  async function addSector(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await createDepartment({ name: name.trim(), slug, description: description.trim() || `Pesquisa de experiência · ${name.trim()}` })
      setName('')
      setDescription('')
      setNotice('Setor cadastrado. O endereço próprio já está disponível.')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível cadastrar o setor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Topbar eyebrow="PERSONALIZE SEU ESPAÇO" title="Configurações" description="Gerencie os setores da pesquisa e seus links de acesso." />
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      <div className="settings-layout">
        <section className="panel settings-panel"><div className="panel-heading"><div><h2>Setores da pesquisa</h2><p>Cada setor possui uma página e um link próprios.</p></div><span className="settings-count">{departments.filter((item) => item.active).length} ativos</span></div>
          <div className="settings-sector-list">{departments.map((department) => <article key={department.id} className="settings-sector"><span className="sector-icon"><DepartmentIcon name={department.icon} size={19} /></span><span className="sector-info"><strong>{department.name}</strong><small>/pesquisa/{department.slug}</small></span><span className={`status-pill ${department.active ? 'status-complete' : 'status-partial'}`}>{department.active ? 'Ativo' : 'Inativo'}</span><a href={`/pesquisa/${department.slug}`} target="_blank" rel="noreferrer" className="icon-button" title="Abrir pesquisa"><ExternalLink size={16} /></a><div className="qr-popover"><QRCodeSVG value={`${window.location.origin}/pesquisa/${department.slug}`} size={48} level="M" /><span>QR Code</span></div></article>)}</div>
          <form className="add-sector-form" onSubmit={addSector}><div className="form-section-title"><Plus size={17} /><strong>Adicionar setor</strong></div><div className="add-sector-fields"><label className="form-field"><span>Nome do setor</span><input value={name} onChange={(event) => setName(event.target.value)} required maxLength={70} placeholder="Ex.: Laboratório" /></label><label className="form-field"><span>Descrição</span><input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={100} placeholder="Ex.: Coleta e realização de exames" /></label><button className="button button-primary" disabled={saving}>{saving ? 'Salvando…' : 'Adicionar'} <ArrowUpRight size={16} /></button></div></form>
        </section>
        <aside className="settings-side"><article className="panel roles-panel"><div className="panel-heading"><div><h2>Perfis de acesso</h2><p>Permissões para cada função</p></div><UsersRound size={18} /></div>{[['Administrador', 'Acesso total: setores, perguntas gerais, perguntas de qualquer setor e Ouvidoria'], ['Gestão', 'Acompanha indicadores e gerencia perguntas somente do setor associado à conta'], ['Ouvidoria', 'Acessa e trata manifestações da Ouvidoria']].map(([role, details]) => <div className="role-row" key={role}><span className="role-dot" /><span><strong>{role}</strong><small>{details}</small></span></div>)}</article><article className="settings-callout"><span className="callout-lock"><ShieldCheck size={19} /></span><strong>Privacidade em primeiro lugar</strong><p>O acesso a manifestações e dados pessoais depende do perfil e deve ser validado na API.</p><Link to="/privacidade">Ver política de privacidade <ArrowUpRight size={14} /></Link></article></aside>
      </div>
      <section className="panel question-config-note"><div className="settings-note-icon"><ClipboardList size={18} /></div><div><h2>Perguntas por setor</h2><p>Use a área “Perguntas” para adicionar, editar ou desativar perguntas. A Gestão acessa somente o setor associado à conta; o Administrador pode editar perguntas gerais e de qualquer setor.</p></div><Link className="button button-outline" to="/gestao/perguntas">Abrir perguntas <ArrowUpRight size={15} /></Link></section>
    </>
  )
}

export function TVWallPage() {
  const { data, departments, error, loading, refresh, lastUpdated } = useTVWall()
  const average = data?.satisfactionAverage ?? 0
  const nps = data?.nps ?? null
  const publicSectors = (data?.sectors ?? []).flatMap((sector) => {
    const department = departments.find((item) => item.slug === sector.sectorSlug)
    return department ? [{ department, count: sector.responseCount, average: sector.satisfactionAverage }] : []
  }).sort((a, b) => b.average - a.average)
  const compliments = data?.complimentCount ?? 0

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen()
  }

  return <main className="tv-wall">
    <header className="tv-header"><Brand light /><div className="tv-live"><span className="live-dot" /> PAINEL PÚBLICO · DADOS AGREGADOS</div><div className="tv-time">{lastUpdated?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) ?? '--:--'}<button onClick={toggleFullscreen} title="Tela cheia"><ExternalLink size={18} /></button><button onClick={() => void refresh()} title="Atualizar painel"><RefreshCw size={18} /></button><Link to="/" title="Voltar ao início"><ArrowUpRight size={18} /></Link></div></header>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {loading && !data ? <div className="loading-panel"><span className="spinner" /> Carregando painel…</div> : <div className="tv-content"><div className="tv-intro"><span className="eyebrow">CUIDADO QUE SE TRANSFORMA</span><h1>Juntos, fazemos melhor.</h1><p>Ouvimos cada pessoa para tornar a experiência de cuidado cada vez mais acolhedora.</p></div>
      <section className="tv-metrics"><article><span className="tv-metric-icon">☺</span><span className="tv-metric-number">{average ? `${average.toFixed(1).replace('.', ',')}` : '—'}<small>/5</small></span><span className="tv-metric-caption">satisfação média</span></article><article><span className="tv-metric-icon">♡</span><span className="tv-metric-number">{nps === null ? '—' : nps}<small>{nps === null ? '' : ' pts'}</small></span><span className="tv-metric-caption">NPS de recomendação</span></article><article><span className="tv-metric-icon">✦</span><span className="tv-metric-number">{data?.responseCount === null ? '—' : (data?.responseCount ?? 0).toLocaleString('pt-BR')}</span><span className="tv-metric-caption">experiências compartilhadas</span></article><article><span className="tv-metric-icon">♥</span><span className="tv-metric-number">{compliments.toLocaleString('pt-BR')}</span><span className="tv-metric-caption">elogios recebidos</span></article></section>
      <section className="tv-sectors"><div className="tv-section-heading"><div><span className="eyebrow">NOSSA JORNADA</span><h2>Como estamos cuidando?</h2></div><span className="tv-privacy"><ShieldCheck size={15} /> Indicadores anônimos e agregados</span></div>{publicSectors.length ? <div className="tv-sector-grid">{publicSectors.map(({ department, average: score }) => <article key={department.id}><span className={`mini-department-icon tone-${department.icon}`}><DepartmentIcon name={department.icon} size={18} /></span><strong>{department.name}</strong><div className="tv-score-track"><i style={{ width: `${score / 5 * 100}%` }} /></div><span className="tv-score">{score.toFixed(1).replace('.', ',')}<small>/5</small></span></article>)}</div> : <div className="tv-empty">Os resultados por setor aparecem aqui quando houver pelo menos 5 respostas, para proteger a privacidade.</div>}</section>
      <footer className="tv-footer"><span><HeartPulseIcon /> Cada opinião nos ajuda a cuidar melhor.</span><span>Atualização automática · {lastUpdated?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) ?? '--:--'}</span></footer></div>}
  </main>
}

export function LoginPage() {
  const [email, setEmail] = useState(isDemoMode ? 'demo@hospital.com.br' : '')
  const [password, setPassword] = useState('')
  const [demoRole, setDemoRole] = useState<AuthUser['role']>('Gestão')
  const [sectorSlug, setSectorSlug] = useState('recepcao')
  const [departments, setDepartments] = useState<Department[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const existingUser = getCurrentUser()

  useEffect(() => {
    if (isDemoMode) {
      const initialLoad = window.setTimeout(() => {
        void getDepartments().then(setDepartments).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os setores.'))
      }, 0)
      return () => window.clearTimeout(initialLoad)
    }
  }, [])
  useEffect(() => {
    if (existingUser && (existingUser.role !== 'Gestão' || existingUser.sectorSlug)) {
      navigate(existingUser.role === 'Ouvidoria' ? '/gestao/ouvidoria' : '/gestao/dashboard', { replace: true })
    }
  }, [existingUser, navigate])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = await login(email || 'demo@hospital.com.br', password || 'demonstracao', demoRole, sectorSlug)
      navigate(user.role === 'Ouvidoria' ? '/gestao/ouvidoria' : '/gestao/dashboard')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="login-page"><header><Brand /><Link to="/">Voltar ao site <ArrowUpRight size={15} /></Link></header><section className="login-panel"><div className="login-art"><span className="login-art-icon"><ShieldCheck size={29} /></span><span className="eyebrow">ACESSO SEGURO</span><h2>Um olhar atento<br />faz toda diferença.</h2><p>Indicadores claros para transformar escuta em cuidado.</p><div className="login-decoration">✳</div></div><div className="login-form-wrap"><span className="eyebrow">ÁREA DA EQUIPE</span><h1>Bem-vindo(a)</h1><p>{isDemoMode ? 'Escolha o perfil para testar as permissões.' : 'Entre com os dados da sua conta.'}</p>{existingUser?.role === 'Gestão' && !existingUser.sectorSlug && <div className="alert alert-error" role="alert">Esta conta não tem um setor associado. Peça ao Administrador para configurá-lo.</div>}{error && <div className="alert alert-error" role="alert">{error}</div>}<form onSubmit={submit}>{isDemoMode && <><label className="form-field"><span>Perfil de demonstração</span><select value={demoRole} onChange={(event) => setDemoRole(event.target.value as AuthUser['role'])}><option value="Gestão">Gestão · responsável de setor</option><option value="Ouvidoria">Ouvidoria</option><option value="Administrador">Administrador · acesso total</option></select></label>{demoRole === 'Gestão' && <label className="form-field"><span>Setor vinculado à Gestão</span><select value={sectorSlug} onChange={(event) => setSectorSlug(event.target.value)}>{departments.filter((department) => department.active).map((department) => <option key={department.id} value={department.slug}>{department.name}</option>)}</select></label>}</>}<label className="form-field"><span>E-mail</span><input type="email" autoComplete="username" required={!isDemoMode} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu.email@hospital.com.br" /></label><label className="form-field"><span>Senha</span><input type="password" autoComplete="current-password" required={!isDemoMode} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isDemoMode ? 'Opcional no modo demonstração' : 'Sua senha'} /></label><button type="submit" className="button button-primary button-wide" disabled={loading || (demoRole === 'Gestão' && !sectorSlug)}>{loading ? 'Entrando…' : isDemoMode ? 'Acessar demonstração' : 'Entrar no painel'} <ArrowUpRight size={17} /></button></form><div className="login-security"><ShieldCheck size={15} /> {isDemoMode ? 'Dados fictícios; permissões reais são aplicadas pela API.' : 'Seus dados de acesso são protegidos.'}</div></div></section><footer>cuidado+ · Experiência do Paciente</footer></main>
}
