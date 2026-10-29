import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { DepartmentIcon } from '../components/DepartmentIcon'
import { getDepartments, createSurvey } from '../services/api'
import type { Department } from '../types'

export function PublicHome() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [error, setError] = useState('')
  const [starting, setStarting] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getDepartments().then(setDepartments).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os setores.')
    })
  }, [])

  async function begin(slug: string) {
    setStarting(slug)
    setError('')
    try {
      const survey = await createSurvey(slug)
      navigate(`/pesquisa/${slug}/pergunta/1?pesquisa=${encodeURIComponent(survey.id)}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível iniciar a pesquisa.')
    } finally {
      setStarting('')
    }
  }

  return (
    <main className="public-page">
      <header className="public-header">
        <Brand />
        <nav className="public-nav" aria-label="Navegação principal">
          <a href="#setores">Como funciona</a>
          <Link to="/privacidade">Privacidade</Link>
          <Link className="staff-link" to="/gestao/login">Acesso da equipe <ArrowRight size={15} /></Link>
        </nav>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={14} /> SUA VOZ FAZ DIFERENÇA</span>
          <h1>Como foi sua<br /><span>experiência?</span></h1>
          <p>Queremos cuidar cada vez melhor. Conte para a gente como foi seu atendimento — é rápido, simples e ajuda a melhorar o hospital.</p>
          <a className="button button-primary hero-button" href="#setores">Começar pesquisa <ArrowDown size={17} /></a>
          <div className="trust-note"><ShieldCheck size={17} /> Sua resposta é tratada com respeito e privacidade.</div>
        </div>
        <div className="hero-art" aria-label="Ilustração de cuidado e acolhimento" role="img">
          <div className="art-glow" />
          <div className="art-card art-card-top"><span className="art-face">😊</span><span><b>Seu cuidado importa</b><small>Estamos aqui para ouvir</small></span></div>
          <div className="art-person"><div className="person-hair" /><div className="person-face"><span className="person-eye left" /><span className="person-eye right" /><span className="person-smile" /></div><div className="person-neck" /><div className="person-body"><span className="person-heart">+</span></div></div>
          <div className="art-flower flower-one">✳</div><div className="art-flower flower-two">✿</div><div className="art-sparkle sparkle-one">✦</div><div className="art-sparkle sparkle-two">✧</div>
          <div className="art-card art-card-bottom"><span className="art-check">✓</span><span><b>Pesquisa segura</b><small>Leva menos de 1 minuto</small></span></div>
        </div>
      </section>

      <section className="sector-section" id="setores">
        <div className="section-heading">
          <div><span className="eyebrow">ESCOLHA UMA ETAPA</span><h2>Onde você foi atendido?</h2><p>Toque no setor para começar. Você pode avaliar mais de uma etapa.</p></div>
          <span className="step-count">01 <i /> 03</span>
        </div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <div className="sector-grid">
          {departments.filter((department) => department.active).map((department, index) => (
            <button key={department.id} className={`sector-card sector-tone-${index % 6}`} onClick={() => begin(department.slug)} disabled={starting !== ''}>
              <span className="sector-icon"><DepartmentIcon name={department.icon} size={23} /></span>
              <span className="sector-info"><strong>{department.name}</strong><small>{department.description}</small></span>
              <span className="sector-arrow">{starting === department.slug ? <span className="spinner" /> : <ArrowRight size={18} />}</span>
            </button>
          ))}
        </div>
        <div className="section-footnote"><span className="tiny-lock"><ShieldCheck size={16} /></span> Não pedimos seus dados pessoais para avaliar o atendimento. <Link to="/privacidade">Saiba mais</Link></div>
      </section>
      <footer className="public-footer"><Brand /><span>Um cuidado melhor começa com uma conversa.</span><Link to="/tv-wall">Painel público</Link></footer>
    </main>
  )
}

export function PrivacyPage() {
  return (
    <main className="legal-page">
      <header className="public-header"><Brand /><Link className="staff-link" to="/">Voltar ao início <ArrowRight size={15} /></Link></header>
      <article className="legal-card">
        <span className="eyebrow">TRANSPARÊNCIA E CUIDADO</span>
        <h1>Privacidade dos seus dados</h1>
        <p>Esta pesquisa coleta avaliações para ajudar a melhorar os serviços do hospital. Você pode enviar uma manifestação sem se identificar.</p>
        <h2>O que registramos</h2><p>As respostas podem ser relacionadas ao setor, à data e ao turno do atendimento. Não vinculamos avaliações a profissionais individualmente.</p>
        <h2>Seus dados e seu consentimento</h2><p>Seu telefone só é solicitado se você optar por receber contato da Ouvidoria e autorizar esse uso. O acesso às informações de contato é restrito às equipes autorizadas.</p>
        <h2>TV Wall e indicadores</h2><p>Os painéis públicos exibem apenas informações agregadas. Comentários, contatos e dados que possam identificar alguém não são apresentados.</p>
        <p className="legal-note">Esta página é um modelo inicial para o projeto. A política definitiva e os prazos de retenção devem ser validados com o hospital e com o responsável pela proteção de dados.</p>
        <Link className="button button-primary" to="/">Entendi <ArrowRight size={16} /></Link>
      </article>
    </main>
  )
}
