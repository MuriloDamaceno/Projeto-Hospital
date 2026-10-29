import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Heart, ShieldCheck } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { DepartmentIcon } from '../components/DepartmentIcon'
import { completeSurvey, createManifestation, getDepartments, saveSurveyAnswer } from '../services/api'
import { departments as fallbackDepartments } from '../data/demo'
import type { Department, ManifestationType, SurveyRecord } from '../types'

const faces = [
  { value: 1, emoji: '😞', label: 'Muito ruim', color: 'face-one' },
  { value: 2, emoji: '🙁', label: 'Ruim', color: 'face-two' },
  { value: 3, emoji: '😐', label: 'Regular', color: 'face-three' },
  { value: 4, emoji: '🙂', label: 'Bom', color: 'face-four' },
  { value: 5, emoji: '😍', label: 'Muito bom', color: 'face-five' },
]

function FeedbackFooter() {
  return <div className="survey-privacy"><ShieldCheck size={16} /> Resposta protegida <span>•</span> <Link to="/privacidade">Como usamos seus dados</Link></div>
}

export function SurveyFlow() {
  const { slug = '', step = '1' } = useParams()
  const [searchParams] = useSearchParams()
  const [department, setDepartment] = useState<Department | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const navigate = useNavigate()
  const surveyId = searchParams.get('pesquisa') ?? ''
  const currentStep = Number(step)
  const currentDepartment = useMemo(() => department ?? fallbackDepartments.find((item) => item.slug === slug) ?? null, [department, slug])

  useEffect(() => {
    let active = true
    getDepartments().then((items) => {
      if (active) setDepartment(items.find((item) => item.slug === slug) ?? null)
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar esta pesquisa.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [slug])

  if (loading) return <div className="survey-loading"><span className="spinner" /> Preparando sua pesquisa…</div>
  if (!currentDepartment) return <SurveyMessage title="Não encontramos esse setor" text="Volte ao início e escolha um dos setores disponíveis." />
  if (!surveyId) return <SurveyMessage title="Pesquisa não iniciada" text="Volte ao início e escolha o setor onde você foi atendido." />

  const query = `?pesquisa=${encodeURIComponent(surveyId)}`
  const progress = Math.min(100, Math.round((currentStep / 4) * 100))

  async function saveAndContinue(field: 'overallRating' | 'departmentRating' | 'nps', value: number) {
    setSaving(true)
    setError('')
    try {
      await saveSurveyAnswer(surveyId, field, value)
      navigate(`/pesquisa/${slug}/pergunta/${currentStep + 1}${query}`)
      setSelected(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar sua resposta.')
    } finally {
      setSaving(false)
    }
  }

  async function finish(commentValue = '') {
    setSaving(true)
    setError('')
    try {
      if (commentValue.trim()) await saveSurveyAnswer(surveyId, 'comment', commentValue.trim())
      const survey = await completeSurvey(surveyId)
      if (survey.mean !== null && survey.mean <= 2) {
        navigate(`/ouvidoria${query}`)
      } else {
        navigate(`/pesquisa/agradecimento${query}`)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível finalizar a pesquisa.')
    } finally {
      setSaving(false)
    }
  }

  const questionContent = currentStep === 1 ? (
    <>
      <span className="survey-kicker">PERGUNTA 1 · OBRIGATÓRIA</span>
      <h1>De modo geral,<br />como foi sua experiência?</h1>
      <p className="survey-subtitle">Sua resposta ajuda a gente a cuidar melhor.</p>
      <div className="face-options" role="radiogroup" aria-label="Avaliação geral">
        {faces.map((face) => <button key={face.value} type="button" className={`face-option ${face.color}${selected === face.value ? ' selected' : ''}`} role="radio" aria-checked={selected === face.value} onClick={() => setSelected(face.value)}><span>{face.emoji}</span><small>{face.label}</small></button>)}
      </div>
      <div className="survey-actions"><button className="button button-primary button-wide" disabled={selected === null || saving} onClick={() => selected !== null && saveAndContinue('overallRating', selected)}>{saving ? 'Salvando…' : 'Continuar'} <ArrowRight size={17} /></button></div>
    </>
  ) : currentStep === 2 ? (
    <>
      <span className="survey-kicker">PERGUNTA 2 · OPCIONAL</span>
      <div className="current-sector-label"><DepartmentIcon name={currentDepartment.icon} size={17} /> {currentDepartment.name}</div>
      <h1>Como foi o atendimento<br />nesta etapa?</h1>
      <p className="survey-subtitle">Escolha um rostinho. Você também pode pular.</p>
      <div className="face-options" role="radiogroup" aria-label={`Avaliação de ${currentDepartment.name}`}>
        {faces.map((face) => <button key={face.value} type="button" className={`face-option ${face.color}${selected === face.value ? ' selected' : ''}`} role="radio" aria-checked={selected === face.value} onClick={() => setSelected(face.value)}><span>{face.emoji}</span><small>{face.label}</small></button>)}
      </div>
      <div className="survey-actions survey-actions-split"><button className="text-button" onClick={() => navigate(`/pesquisa/${slug}/pergunta/3${query}`)}>Pular pergunta</button><button className="button button-primary" disabled={selected === null || saving} onClick={() => selected !== null && saveAndContinue('departmentRating', selected)}>{saving ? 'Salvando…' : 'Continuar'} <ArrowRight size={17} /></button></div>
    </>
  ) : currentStep === 3 ? (
    <>
      <span className="survey-kicker">PERGUNTA 3 · OPCIONAL</span>
      <h1>Você recomendaria<br />nosso hospital?</h1>
      <p className="survey-subtitle">De 0 a 10, o quanto você recomendaria para alguém?</p>
      <div className="nps-scale" role="radiogroup" aria-label="Nota de recomendação de 0 a 10">
        {Array.from({ length: 11 }, (_, value) => <button key={value} type="button" role="radio" aria-checked={selected === value} className={selected === value ? 'nps-selected' : ''} onClick={() => setSelected(value)}>{value}</button>)}
      </div>
      <div className="nps-labels"><span>Não recomendaria</span><span>Com certeza recomendaria</span></div>
      <div className="survey-actions survey-actions-split"><button className="text-button" onClick={() => navigate(`/pesquisa/${slug}/pergunta/4${query}`)}>Pular pergunta</button><button className="button button-primary" disabled={selected === null || saving} onClick={() => selected !== null && saveAndContinue('nps', selected)}>{saving ? 'Salvando…' : 'Continuar'} <ArrowRight size={17} /></button></div>
    </>
  ) : currentStep === 4 ? (
    <>
      <span className="survey-kicker">ÚLTIMA ETAPA · OPCIONAL</span>
      <h1>Quer contar mais<br />alguma coisa?</h1>
      <p className="survey-subtitle">Elogios e sugestões também ajudam a melhorar.</p>
      <label className="comment-field"><span>Sua mensagem</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={700} placeholder="Escreva aqui, se quiser…" rows={5} /><small>{comment.length}/700 caracteres</small></label>
      <div className="survey-actions survey-actions-split"><button className="text-button" onClick={() => finish()}>Pular e finalizar</button><button className="button button-primary" disabled={saving} onClick={() => finish(comment)}>{saving ? 'Salvando…' : 'Finalizar pesquisa'} <Check size={17} /></button></div>
    </>
  ) : null

  return (
    <main className="survey-page">
      <header className="survey-header"><Brand /><Link className="survey-exit" to="/">Sair da pesquisa</Link></header>
      <div className="survey-shell">
        <div className="survey-progress"><div className="progress-caption"><span>{currentDepartment.name}</span><span>{Math.min(currentStep, 4)} de 4</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>
        <section className="survey-card">
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {questionContent ?? <SurveyMessage title="Pesquisa concluída" text="Obrigado por compartilhar sua experiência." />}
        </section>
        <FeedbackFooter />
      </div>
    </main>
  )
}

export function SurveyThanks() {
  const [searchParams] = useSearchParams()
  const surveyId = searchParams.get('pesquisa')
  return <SurveyMessage title="Obrigado por nos contar!" text="Sua resposta foi registrada. Ela ajuda a equipe a tornar o cuidado cada vez melhor." icon="heart" surveyId={surveyId ?? undefined} />
}

function SurveyMessage({ title, text, icon = 'check', surveyId }: { title: string; text: string; icon?: 'heart' | 'check'; surveyId?: string }) {
  return (
    <main className="survey-page">
      <header className="survey-header"><Brand /><Link className="survey-exit" to="/">Início</Link></header>
      <section className="survey-result-card">
        <div className="result-icon">{icon === 'heart' ? <Heart size={30} fill="currentColor" /> : <Check size={31} />}</div>
        <span className="survey-kicker">CUIDADO QUE MELHORA</span>
        <h1>{title}</h1><p>{text}</p>
        {surveyId && <p className="result-note">Se preferir, você ainda pode <Link to={`/ouvidoria?pesquisa=${encodeURIComponent(surveyId)}`}>falar com a Ouvidoria</Link>.</p>}
        <Link to="/" className="button button-primary">Voltar ao início <ArrowRight size={16} /></Link>
      </section>
      <FeedbackFooter />
    </main>
  )
}

export function OmbudsmanForm() {
  const [searchParams] = useSearchParams()
  const surveyId = searchParams.get('pesquisa') ?? ''
  const [sectorSlug, setSectorSlug] = useState('')
  const [type, setType] = useState<ManifestationType>('Reclamação')
  const [description, setDescription] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [contact, setContact] = useState('')
  const [consent, setConsent] = useState(false)
  const [departments, setDepartments] = useState<Department[]>(fallbackDepartments)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    getDepartments().then((items) => {
      setDepartments(items)
      setSectorSlug((current) => current || items[0]?.slug || '')
    }).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os setores.')
    })
  }, [])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!surveyId) {
      setError('Não encontramos a pesquisa relacionada. Volte ao início e escolha um setor.')
      return
    }
    if (!anonymous && (!contact.trim() || !consent)) {
      setError('Para pedir retorno, informe um telefone e autorize o uso dos dados.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createManifestation({ surveyId, sectorSlug, type, description: description.trim(), anonymous, ...(anonymous ? {} : { contact: contact.trim() }) })
      setSent(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar sua manifestação.')
    } finally {
      setSaving(false)
    }
  }

  if (sent) return <SurveyMessage title="Mensagem recebida" text="Obrigado por compartilhar. Para saber o resultado da sua manifestação, entre em contato diretamente com a Ouvidoria." />

  return (
    <main className="survey-page">
      <header className="survey-header"><Brand /><Link className="survey-exit" to="/">Sair</Link></header>
      <section className="ombudsman-card">
        <span className="survey-kicker">OUVIDORIA · SUA VOZ É IMPORTANTE</span>
        <h1>Quer falar com a gente?</h1>
        <p className="survey-subtitle">Registre um elogio, reclamação ou sugestão. Você pode fazer isso anonimamente.</p>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <label className="form-field"><span>Esta mensagem é um…</span><select value={type} onChange={(event) => setType(event.target.value as ManifestationType)}><option>Elogio</option><option>Reclamação</option><option>Sugestão</option></select></label>
          <label className="form-field"><span>Setor relacionado</span><select value={sectorSlug} onChange={(event) => setSectorSlug(event.target.value)}>{departments.filter((item) => item.active).map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
          <label className="form-field"><span>O que aconteceu?</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} maxLength={1500} required placeholder="Conte para nós com suas palavras…" /><small className="field-hint">{description.length}/1500 caracteres</small></label>
          <label className="check-row"><input type="checkbox" checked={!anonymous} onChange={(event) => setAnonymous(!event.target.checked)} /><span>Quero que a Ouvidoria possa entrar em contato comigo</span></label>
          {!anonymous && <div className="contact-consent"><label className="form-field"><span>Telefone para contato</span><input type="tel" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="(00) 00000-0000" autoComplete="tel" required /></label><label className="check-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Autorizo o uso deste telefone para tratar esta manifestação. <Link to="/privacidade">Saiba mais</Link>.</span></label></div>}
          <button type="submit" className="button button-primary button-wide" disabled={saving}>{saving ? 'Enviando…' : 'Enviar para a Ouvidoria'} <ArrowRight size={17} /></button>
        </form>
        <p className="ombudsman-note"><ShieldCheck size={15} /> Não prometemos retorno automático. Se quiser acompanhar, entre em contato diretamente com a Ouvidoria.</p>
      </section>
      <FeedbackFooter />
    </main>
  )
}
