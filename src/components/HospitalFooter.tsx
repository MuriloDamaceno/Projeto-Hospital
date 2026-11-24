import { Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from './Brand'

export function HospitalFooter() {
  return (
    <footer className="hospital-footer">
      <div className="hospital-footer-links">
        <div className="hospital-footer-brand">
          <Brand />
          <p>Fundação Hospitalar Dr. Oswaldo Diesel</p>
        </div>
        <nav aria-label="Links do sistema">
          <strong>Acesso rápido</strong>
          <Link to="/">Início</Link>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/manual">Manual de uso</Link>
        </nav>
        <nav aria-label="Serviços do sistema">
          <strong>Experiência do paciente</strong>
          <Link to="/ouvidoria">Ouvidoria</Link>
          <Link to="/tv-wall">Painel público</Link>
          <Link to="/gestao/login">Acesso da equipe</Link>
        </nav>
        <div className="hospital-footer-social">
          <strong>Acompanhe o hospital</strong>
          <div>
            <a href="https://www.facebook.com/DrOswaldoDiesel" target="_blank" rel="noreferrer" aria-label="Facebook do hospital"><span aria-hidden="true">f</span></a>
            <a href="https://www.instagram.com/hospitaltrescoroas" target="_blank" rel="noreferrer" aria-label="Instagram do hospital"><span aria-hidden="true">◎</span></a>
            <a href="https://www.youtube.com/channel/UC2J92WWlRhvbv1f4NSbmHJQ" target="_blank" rel="noreferrer" aria-label="YouTube do hospital"><span aria-hidden="true">▶</span></a>
          </div>
        </div>
      </div>
      <div className="hospital-contact-band">
        <a href="https://maps.google.com/?q=R.+Doze+de+Maio,+555,+Tr%C3%AAs+Coroas,+RS" target="_blank" rel="noreferrer">
          <MapPin size={20} />
          <strong>Endereço</strong>
          <span>R. Doze de Maio, 555 - Centro<br />Três Coroas - RS, 95660-000</span>
        </a>
        <a href="tel:+555135461236">
          <Phone size={20} />
          <strong>Telefone geral</strong>
          <span>(51) 3546-1236</span>
        </a>
        <a href="mailto:sac@fhdod.com.br">
          <Mail size={20} />
          <strong>E-mail</strong>
          <span>sac@fhdod.com.br</span>
        </a>
      </div>
      <div className="hospital-copyright">Fundação Hospitalar Dr. Oswaldo Diesel · Três Coroas - RS</div>
    </footer>
  )
}
