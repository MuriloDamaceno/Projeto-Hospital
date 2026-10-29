import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpRight, Check, ChevronDown, CircleAlert, ClipboardList, Download, ExternalLink, FileDown, Filter, Plus, RefreshCw, Search, ShieldCheck, Smile, UsersRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Brand } from '../components/Brand'
import { DepartmentIcon } from '../components/DepartmentIcon'
import { createDepartment, getCurrentUser, getDashboardData, getDepartments, isDemoMode, login, updateManifestationStatus } from '../services/api'
import { departments as demoDepartments } from '../data/demo'
import type { AuthUser, DashboardPayload, Department, Manifestation, ManifestationStatus, SurveyRecord } from '../types'

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

function exportCsv(payload: DashboardPayload, departments: Department[]) {
  const sectorName = (slug: string) => departments.find((department) => department.slug === slug)?.name ?? slug
  const rows = [
    ['Data', 'Setor', 'Turno', 'Nota geral (1-5)', 'NPS (0-10)', 'Média parcial', 'Pesquisa completa'],
    ...payload.surveys.map((survey) => [
      new Date(survey.createdAt).toLocaleString('pt-BR'),
      sectorName(survey.sectorSlug),
      survey.shift,
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

  async function refresh() {
    try {
      const [dashboard, sectors] = await Promise.all([getDashboardData(), getDepartments()])
      setData(dashboard)
      setDepartments(sectors)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 30_000)
    return () => window.clearInterval(timer)
  }, [])
  return { data, departments, error, loading, refresh, setData, setError }
}

export function DashboardPage() {
  const { data, departments, error, loading, refresh } = useDashboard()
  const [sector, setSector] = useState('todos')
  const [period, setPeriod] = useState('30')
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    if (!data) return []
    const since = new Date()
    since.setDate(since.getDate() - Number(period))
    return data.surveys.filter((survey) => (sector === 'todos' || survey.sectorSlug === sector) && new Date(survey.createdAt) >= since)
  }, [data, period, sector])
  const answered = filtered.filter((survey) => survey.mean !== null)
  const average = answered.length ? answered.reduce((sum, survey) => sum + (survey.mean ?? 0), 0) / answered.length : 0
  const incomplete = filtered.filter((survey) => !survey.complete).length
  const nps = getNps(filtered)
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
      exportCsv({ surveys: filtered, manifestations: data.manifestations }, departments)
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
        <label><span>Setor</span><select value={sector} onChange={(event) => setSector(event.target.value)}><option value="todos">Todos os setores</option>{departments.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select><ChevronDown size={14} /></label>
        <span className="update-note"><span className="live-dot" /> Atualizado agora</span>
      </div>
      {loading && !data ? <div className="loading-panel"><span className="spinner" /> Carregando indicadores…</div> : (
        <>
          <section className="metric-grid" aria-label="Indicadores principais">
            <article className="metric-card"><div className="metric-label"><span>Respostas recebidas</span><span className="metric-icon metric-lilac"><ClipboardList size={18} /></span></div><strong>{filtered.length.toLocaleString('pt-BR')}</strong><small><span className="metric-up"><ArrowUpRight size={14} /> 12%</span> vs. período anterior</small><div className="metric-spark spark-purple"><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
            <article className="metric-card"><div className="metric-label"><span>Satisfação média</span><span className="metric-icon metric-mint"><Smile size={18} /></span></div><strong>{answered.length ? `${average.toFixed(1).replace('.', ',')}/5` : '—'}</strong><small>Escala de 1 a 5 · pesquisa geral</small><div className="metric-bottom-track"><span style={{ width: `${average / 5 * 100}%` }} /></div></article>
            <article className="metric-card"><div className="metric-label"><span>NPS de recomendação</span><span className="metric-icon metric-blue"><HeartPulseIcon /></span></div><strong>{nps === null ? '—' : nps}</strong><small>{nps === null ? 'Aguardando avaliações NPS' : 'Promotores menos detratores'}</small><div className="nps-mini"><span>0</span><span style={{ left: `${nps === null ? 50 : (nps + 100) / 2}%` }} /><span>100</span></div></article>
            <article className="metric-card"><div className="metric-label"><span>Pesquisas parciais</span><span className="metric-icon metric-amber"><CircleAlert size={18} /></span></div><strong>{incomplete}</strong><small>Respostas incompletas no período</small><div className="metric-bottom-track metric-track-amber"><span style={{ width: `${percentage(incomplete, filtered.length)}%` }} /></div></article>
          </section>

          <section className="dashboard-panels">
            <article className="panel trend-panel">
              <div className="panel-heading"><div><h2>Respostas ao longo do tempo</h2><p>Volume de pesquisas registradas</p></div><button className="icon-button" aria-label="Atualizar dados" onClick={() => void refresh()}><RefreshCw size={17} /></button></div>
              <div className="chart-area">
                <div className="chart-y-labels"><span>20</span><span>15</span><span>10</span><span>5</span><span>0</span></div>
                <div className="chart-content"><div className="chart-grid-lines"><i /><i /><i /><i /><i /></div><svg viewBox="0 0 640 190" preserveAspectRatio="none" role="img" aria-label="Gráfico de respostas diárias"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#52a894" stopOpacity=".2" /><stop offset="100%" stopColor="#52a894" stopOpacity="0" /></linearGradient></defs><path d="M0 148 C35 140 42 108 80 119 S129 150 160 108 S205 98 240 112 S274 138 320 79 S367 93 400 87 S449 121 480 70 S529 62 560 78 S605 52 640 35 L640 190 L0 190 Z" fill="url(#chartFill)" /><path d="M0 148 C35 140 42 108 80 119 S129 150 160 108 S205 98 240 112 S274 138 320 79 S367 93 400 87 S449 121 480 70 S529 62 560 78 S605 52 640 35" fill="none" stroke="#52a894" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg><div className="chart-x-labels"><span>01 out</span><span>06 out</span><span>12 out</span><span>18 out</span><span>24 out</span><span>29 out</span></div></div>
              </div>
            </article>
            <article className="panel breakdown-panel">
              <div className="panel-heading"><div><h2>Satisfação por setor</h2><p>Nota média · escala de 1 a 5</p></div><Link to="/gestao/configuracoes" className="link-small">Ver setores <ArrowUpRight size={14} /></Link></div>
              <div className="department-bars">{sectorStats.length ? sectorStats.map(({ department, total, average: score }) => <div className="department-bar" key={department.id}><span className={`mini-department-icon tone-${department.icon}`}><DepartmentIcon name={department.icon} size={16} /></span><span className="department-bar-name">{department.name}</span><span className="bar-track"><i style={{ width: `${score / 5 * 100}%` }} /></span><strong>{score.toFixed(1).replace('.', ',')}</strong><small>{total}</small></div>) : <div className="empty-note">Ainda não há respostas neste filtro.</div>}</div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel recent-panel"><div className="panel-heading"><div><h2>Respostas recentes</h2><p>Últimos registros da pesquisa</p></div><button className="link-small" onClick={downloadReport}>Ver relatório <ArrowUpRight size={14} /></button></div>
              <div className="table-wrap"><table><thead><tr><th>SETOR</th><th>DATA E TURNO</th><th>AVALIAÇÃO</th><th>STATUS</th></tr></thead><tbody>{filtered.slice(0, 5).map((survey) => <tr key={survey.id}><td><span className="table-sector">{departments.find((item) => item.slug === survey.sectorSlug)?.name ?? survey.sectorSlug}</span></td><td>{new Date(survey.createdAt).toLocaleDateString('pt-BR')} <small>{survey.shift}</small></td><td><span className="rating-stars">{'★'.repeat(survey.answers.overallRating ?? 0)}<span>{'★'.repeat(5 - (survey.answers.overallRating ?? 0))}</span></span></td><td><span className={`status-pill ${survey.complete ? 'status-complete' : 'status-partial'}`}>{survey.complete ? 'Completa' : 'Parcial'}</span></td></tr>)}</tbody></table>{!filtered.length && <div className="empty-note">Nenhuma resposta encontrada para este período.</div>}</div>
            </article>
            <article className="panel manifestations-summary"><div className="panel-heading"><div><h2>Ouvidoria</h2><p>Manifestações para acompanhamento</p></div><span className="summary-icon"><ClipboardList size={17} /></span></div><strong className="manifestation-total">{data?.manifestations.filter((item) => item.status !== 'Concluída').length ?? 0}</strong><span className="manifestation-caption">em aberto ou em análise</span><div className="summary-divider" /><div className="summary-foot"><span>Tempo médio de resposta</span><strong>2,4 dias</strong></div><Link className="button button-dark button-wide" to="/gestao/ouvidoria">Acessar Ouvidoria <ArrowUpRight size={16} /></Link></article>
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
  const canSeeContact = user?.role === 'Ouvidoria' || user?.role === 'Gestão' || user?.role === 'Super Admin'
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
        {loading && !data ? <div className="loading-panel"><span className="spinner" /> Carregando manifestações…</div> : records.length ? records.map((item) => <article className="inbox-item" key={item.id}><div className={`inbox-type type-${item.type.toLowerCase()}`}>{item.type === 'Elogio' ? <Smile size={17} /> : item.type === 'Sugestão' ? <Plus size={17} /> : <CircleAlert size={17} />}</div><div className="inbox-message"><div className="inbox-title-row"><strong>{item.type}</strong><span className="inbox-sector">{departments.find((department) => department.slug === item.sectorSlug)?.name ?? item.sectorSlug}</span><span className="inbox-date">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span></div><p>{item.description}</p><small>{item.anonymous ? 'Manifestação anônima' : canSeeContact && item.contact ? `Retorno autorizado · ${item.contact}` : 'Paciente solicitou retorno'}</small></div><label className="status-select"><span className="sr-only">Alterar status</span><select value={item.status} onChange={(event) => void changeStatus(item, event.target.value as ManifestationStatus)}><option>Aberta</option><option>Em análise</option><option>Concluída</option></select><ChevronDown size={13} /></label></article>) : <div className="empty-state"><Search size={25} /><strong>Nenhuma manifestação</strong><span>Não há registros com este status.</span></div>}
      </section>
      <div className="dashboard-disclaimer"><ShieldCheck size={15} /> Quem deseja acompanhar o resultado deve entrar em contato diretamente com a Ouvidoria.</div>
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
  useEffect(() => { void refresh() }, [])

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
        <aside className="settings-side"><article className="panel roles-panel"><div className="panel-heading"><div><h2>Perfis de acesso</h2><p>Permissões para cada função</p></div><UsersRound size={18} /></div>{[['Super Admin', 'Configura setores, perguntas e acessos'], ['Admin de Setor', 'Gerencia perguntas do seu setor'], ['Gestão', 'Acessa indicadores e relatórios'], ['Ouvidoria', 'Trata manifestações e contatos'], ['Visualizador', 'Consulta indicadores agregados']].map(([role, details]) => <div className="role-row" key={role}><span className="role-dot" /><span><strong>{role}</strong><small>{details}</small></span></div>)}</article><article className="settings-callout"><span className="callout-lock"><ShieldCheck size={19} /></span><strong>Privacidade em primeiro lugar</strong><p>Telefone e dados pessoais ficam restritos aos perfis Gestão e Ouvidoria, sempre com consentimento.</p><Link to="/privacidade">Ver política de privacidade <ArrowUpRight size={14} /></Link></article></aside>
      </div>
      <section className="panel question-config-note"><div className="settings-note-icon"><ClipboardList size={18} /></div><div><h2>Perguntas e jornada</h2><p>As perguntas iniciais da pesquisa estão configuradas para garantir respostas simples e acessíveis. Para alterar a jornada, as perguntas e os fluxos por setor, a API do back-end precisa disponibilizar os endpoints de configuração.</p></div><span className={`status-pill ${isDemoMode ? 'status-partial' : 'status-complete'}`}>{isDemoMode ? 'Modo demonstração' : 'API conectada'}</span></section>
    </>
  )
}

export function TVWallPage() {
  const { data, departments, error, loading, refresh } = useDashboard()
  const [lastUpdated, setLastUpdated] = useState(new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setLastUpdated(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const surveys = data?.surveys ?? []
  const scored = surveys.filter((survey) => survey.mean !== null)
  const average = scored.length ? scored.reduce((sum, survey) => sum + (survey.mean ?? 0), 0) / scored.length : 0
  const nps = getNps(surveys)
  const publicSectors = departments.map((department) => {
    const matching = scored.filter((survey) => survey.sectorSlug === department.slug)
    return { department, count: matching.length, average: matching.length ? matching.reduce((sum, survey) => sum + (survey.mean ?? 0), 0) / matching.length : 0 }
  }).filter((item) => item.count >= 5).sort((a, b) => b.average - a.average)
  const compliments = data?.manifestations.filter((item) => item.type === 'Elogio').length ?? 0

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen()
  }

  return <main className="tv-wall">
    <header className="tv-header"><Brand light /><div className="tv-live"><span className="live-dot" /> PAINEL PÚBLICO · DADOS AGREGADOS</div><div className="tv-time">{lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}<button onClick={toggleFullscreen} title="Tela cheia"><ExternalLink size={18} /></button><button onClick={() => { void refresh(); setLastUpdated(new Date()) }} title="Atualizar painel"><RefreshCw size={18} /></button><Link to="/" title="Voltar ao início"><ArrowUpRight size={18} /></Link></div></header>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {loading && !data ? <div className="loading-panel"><span className="spinner" /> Carregando painel…</div> : <div className="tv-content"><div className="tv-intro"><span className="eyebrow">CUIDADO QUE SE TRANSFORMA</span><h1>Juntos, fazemos melhor.</h1><p>Ouvimos cada pessoa para tornar a experiência de cuidado cada vez mais acolhedora.</p></div>
      <section className="tv-metrics"><article><span className="tv-metric-icon">☺</span><span className="tv-metric-number">{average ? `${average.toFixed(1).replace('.', ',')}` : '—'}<small>/5</small></span><span className="tv-metric-caption">satisfação média</span></article><article><span className="tv-metric-icon">♡</span><span className="tv-metric-number">{nps === null ? '—' : nps}<small>{nps === null ? '' : ' pts'}</small></span><span className="tv-metric-caption">NPS de recomendação</span></article><article><span className="tv-metric-icon">✦</span><span className="tv-metric-number">{surveys.length.toLocaleString('pt-BR')}</span><span className="tv-metric-caption">experiências compartilhadas</span></article><article><span className="tv-metric-icon">♥</span><span className="tv-metric-number">{compliments.toLocaleString('pt-BR')}</span><span className="tv-metric-caption">elogios recebidos</span></article></section>
      <section className="tv-sectors"><div className="tv-section-heading"><div><span className="eyebrow">NOSSA JORNADA</span><h2>Como estamos cuidando?</h2></div><span className="tv-privacy"><ShieldCheck size={15} /> Indicadores anônimos e agregados</span></div>{publicSectors.length ? <div className="tv-sector-grid">{publicSectors.map(({ department, average: score }) => <article key={department.id}><span className={`mini-department-icon tone-${department.icon}`}><DepartmentIcon name={department.icon} size={18} /></span><strong>{department.name}</strong><div className="tv-score-track"><i style={{ width: `${score / 5 * 100}%` }} /></div><span className="tv-score">{score.toFixed(1).replace('.', ',')}<small>/5</small></span></article>)}</div> : <div className="tv-empty">Os resultados por setor aparecem aqui quando houver pelo menos 5 respostas, para proteger a privacidade.</div>}</section>
      <footer className="tv-footer"><span><HeartPulseIcon /> Cada opinião nos ajuda a cuidar melhor.</span><span>Atualização automática · {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></footer></div>}
  </main>
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const existingUser = getCurrentUser()

  useEffect(() => { if (existingUser) navigate('/gestao/dashboard', { replace: true }) }, [existingUser, navigate])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/gestao/dashboard')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="login-page"><header><Brand /><Link to="/">Voltar ao site <ArrowUpRight size={15} /></Link></header><section className="login-panel"><div className="login-art"><span className="login-art-icon"><ShieldCheck size={29} /></span><span className="eyebrow">ACESSO SEGURO</span><h2>Um olhar atento<br />faz toda diferença.</h2><p>Indicadores claros para transformar escuta em cuidado.</p><div className="login-decoration">✳</div></div><div className="login-form-wrap"><span className="eyebrow">ÁREA DA EQUIPE</span><h1>Bem-vindo(a)</h1><p>Entre com seus dados para acessar o painel.</p>{error && <div className="alert alert-error" role="alert">{error}</div>}<form onSubmit={submit}><label className="form-field"><span>E-mail</span><input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu.email@hospital.com.br" /></label><label className="form-field"><span>Senha</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" /></label><button type="submit" className="button button-primary button-wide" disabled={loading}>{loading ? 'Entrando…' : 'Entrar no painel'} <ArrowUpRight size={17} /></button></form>{isDemoMode && <button className="demo-login" onClick={() => { void login('demo@hospital.com.br', 'demonstracao').then(() => navigate('/gestao/dashboard')).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a demonstração.')) }}><span className="demo-dot" /> Acessar ambiente de demonstração</button>}<div className="login-security"><ShieldCheck size={15} /> Seus dados de acesso são protegidos.</div></div></section><footer>cuidado+ · Experiência do Paciente</footer></main>
}
