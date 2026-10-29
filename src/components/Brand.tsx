import { HeartPulse } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brand${light ? ' brand-light' : ''}`} to="/" aria-label="SGEP, página inicial">
      <span className="brand-mark"><HeartPulse size={22} strokeWidth={2} /></span>
      <span className="brand-copy"><strong>cuidado<span>+</span></strong><small>experiência do paciente</small></span>
    </Link>
  )
}
