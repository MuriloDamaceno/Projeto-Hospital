import { ArrowLeft, ArrowRight, BarChart3, ClipboardList, Monitor, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'

const manualSections = [
  {
    number: '01',
    icon: ClipboardList,
    title: 'Para pacientes e acompanhantes',
    steps: [
      'Na página inicial, escolha o setor onde você recebeu atendimento. O mesmo endereço pode ser aberto pelo QR Code do setor.',
      'Toque em um rostinho para responder à pergunta geral obrigatória. As perguntas sobre o setor, recomendação e comentário são opcionais.',
      'As notas são registradas a cada etapa. Se a avaliação indicar uma experiência ruim, você pode registrar uma manifestação na Ouvidoria, inclusive anonimamente.',
    ],
  },
  {
    number: '02',
    icon: BarChart3,
    title: 'Para Gestão e coordenação',
    steps: [
      'Entre em “Acesso da equipe” com as credenciais fornecidas pela administração. No ambiente de demonstração, use o botão de demonstração.',
      'No painel “Visão geral”, selecione o período e o setor para analisar respostas, satisfação, NPS e pesquisas parciais.',
      'Use “Exportar Excel” para baixar um CSV compatível com Excel. Para PDF, use a opção Imprimir do navegador e escolha “Salvar como PDF”.',
    ],
  },
  {
    number: '03',
    icon: ClipboardList,
    title: 'Para a Ouvidoria',
    steps: [
      'Abra “Ouvidoria” no menu de gestão para consultar elogios, reclamações e sugestões.',
      'Atualize o status de cada manifestação conforme o andamento do atendimento.',
      'O paciente que quiser acompanhar o resultado deve entrar em contato diretamente com a Ouvidoria. Contatos só podem ser consultados por perfis autorizados.',
    ],
  },
  {
    number: '04',
    icon: Monitor,
    title: 'Para exibir o TV Wall',
    steps: [
      'Acesse “TV Wall” no menu ou abra /tv-wall em uma tela de exibição.',
      'Use o controle de tela cheia para deixar os indicadores visíveis à distância.',
      'O painel apresenta apenas dados agregados. A avaliação por setor só aparece quando há pelo menos cinco respostas, para reduzir o risco de identificação.',
    ],
  },
]

export function ManualPage() {
  return (
    <main className="manual-page">
      <header className="public-header"><Brand /><Link className="staff-link" to="/">Voltar ao início <ArrowLeft size={15} /></Link></header>
      <div className="manual-content">
        <span className="eyebrow"><ShieldCheck size={14} /> GUIA RÁPIDO</span>
        <h1>Como usar o cuidado+</h1>
        <p className="manual-intro">Um guia simples para pacientes, Gestão, Ouvidoria e equipe do TV Wall.</p>
        <div className="manual-cards">{manualSections.map(({ number, icon: Icon, title, steps }) => (
          <article className="manual-card" key={number}>
            <div className="manual-card-heading"><span className="manual-icon"><Icon size={20} /></span><span className="manual-number">{number}</span></div>
            <h2>{title}</h2>
            <ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol>
          </article>
        ))}</div>
        <div className="manual-bottom"><span>Ficou com dúvida?</span><p>Peça ajuda à equipe do hospital. O acesso a dados pessoais e as permissões de cada perfil são controlados pela API.</p><Link className="button button-primary" to="/">Ir para o início <ArrowRight size={16} /></Link></div>
      </div>
    </main>
  )
}
