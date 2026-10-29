import { Activity, BarChart3, CircleHelp, ClipboardList, ListChecks, LogOut, Monitor, Settings2, ShieldCheck } from 'lucide-react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Brand } from './Brand'
import { getCurrentUser, logout } from '../services/api'
import type { AuthUser } from '../types'

const navigation = [
  { to: '/gestao/dashboard', label: 'Visão geral', icon: BarChart3 },
  { to: '/gestao/ouvidoria', label: 'Ouvidoria', icon: ClipboardList },
  { to: '/gestao/perguntas', label: 'Perguntas', icon: ListChecks },
  { to: '/gestao/configuracoes', label: 'Configurações', icon: Settings2 },
  { to: '/tv-wall', label: 'TV Wall', icon: Monitor, end: true },
]

const roleRoutes: Record<AuthUser['role'], string[]> = {
  Administrador: ['/gestao/dashboard', '/gestao/ouvidoria', '/gestao/perguntas', '/gestao/configuracoes', '/tv-wall'],
  Gestão: ['/gestao/dashboard', '/gestao/perguntas', '/tv-wall'],
  Ouvidoria: ['/gestao/ouvidoria'],
}

export function ProtectedLayout() {
  const user = getCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  if (!user) return <Navigate to="/gestao/login" replace />
  const allowedRoutes = roleRoutes[user.role]
  if (!allowedRoutes?.length) return <Navigate to="/gestao/login" replace />
  const canAccessCurrentRoute = allowedRoutes.some((route) => location.pathname === route || location.pathname.startsWith(`${route}/`))
  if (!canAccessCurrentRoute) return <Navigate to={allowedRoutes[0]} replace />
  if (user.role === 'Gestão' && !user.sectorSlug) return <Navigate to="/gestao/login" replace />
  const visibleNavigation = navigation.filter(({ to }) => allowedRoutes.includes(to))

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
          {visibleNavigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}><Icon size={18} /><span>{label}</span>{label === 'Ouvidoria' && <span className="nav-indicator" />}</NavLink>)}
        </nav>
        <div className="sidebar-help"><div className="help-icon"><CircleHelp size={18} /></div><strong>Precisa de ajuda?</strong><span>Consulte o manual de uso do sistema.</span><Link to="/manual">Acessar manual <Activity size={13} /></Link></div>
        <div className="sidebar-user"><span className="avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span className="user-copy"><strong>{user.name}</strong><small>{user.role}</small></span><button aria-label="Sair da conta" title="Sair" onClick={signOut}><LogOut size={17} /></button></div>
      </aside>
      <div className="management-main">
        <div className="management-mobilebar">
          <div className="management-mobile-row"><Brand /><button onClick={signOut} aria-label="Sair"><LogOut size={18} /></button></div>
          <nav className="mobile-management-nav" aria-label="Menu de gestão">
            {visibleNavigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `mobile-management-link${isActive ? ' active' : ''}`}><Icon size={15} />{label}</NavLink>)}
          </nav>
        </div>
        <main className="management-content"><Outlet /></main>
        <footer className="management-footer"><span><ShieldCheck size={14} /> Dados protegidos · Acesso restrito à equipe autorizada</span><span>cuidado+ · Sistema de Gestão da Experiência do Paciente</span></footer>
      </div>
    </div>
  )
}
