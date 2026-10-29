import { Activity, BarChart3, CircleHelp, ClipboardList, LogOut, Monitor, Settings2, ShieldCheck } from 'lucide-react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { Brand } from './Brand'
import { getCurrentUser, logout } from '../services/api'

const navigation = [
  { to: '/gestao/dashboard', label: 'Visão geral', icon: BarChart3 },
  { to: '/gestao/ouvidoria', label: 'Ouvidoria', icon: ClipboardList },
  { to: '/gestao/configuracoes', label: 'Configurações', icon: Settings2 },
  { to: '/tv-wall', label: 'TV Wall', icon: Monitor, end: true },
]

export function ProtectedLayout() {
  const user = getCurrentUser()
  const navigate = useNavigate()
  if (!user) return <Navigate to="/gestao/login" replace />

  function signOut() {
    logout()
    navigate('/gestao/login')
  }

  return (
    <div className="management-app">
      <aside className="sidebar">
        <Brand light />
        <div className="sidebar-caption">ESPAÇO DE GESTÃO</div>
        <nav className="side-nav" aria-label="Menu de gestão">
          {navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}><Icon size={18} /><span>{label}</span>{label === 'Ouvidoria' && <span className="nav-indicator" />}</NavLink>)}
        </nav>
        <div className="sidebar-help"><div className="help-icon"><CircleHelp size={18} /></div><strong>Precisa de ajuda?</strong><span>Consulte o manual de uso do sistema.</span><a href="#manual">Acessar manual <Activity size={13} /></a></div>
        <div className="sidebar-user"><span className="avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span className="user-copy"><strong>{user.name}</strong><small>{user.role}</small></span><button aria-label="Sair da conta" title="Sair" onClick={signOut}><LogOut size={17} /></button></div>
      </aside>
      <div className="management-main">
        <div className="management-mobilebar"><Brand /><button onClick={signOut} aria-label="Sair"><LogOut size={18} /></button></div>
        <main className="management-content"><Outlet /></main>
        <footer className="management-footer"><span><ShieldCheck size={14} /> Dados protegidos · Acesso restrito à equipe autorizada</span><span>cuidado+ · Sistema de Gestão da Experiência do Paciente</span></footer>
      </div>
    </div>
  )
}
