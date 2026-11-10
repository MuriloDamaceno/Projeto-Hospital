import { Link } from 'react-router-dom'

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brand${light ? ' brand-light' : ''}`} to="/" aria-label="Fundação Hospitalar Dr. Oswaldo Diesel, página inicial">
      <span className="brand-mark" aria-hidden="true">+</span>
      <span className="brand-copy"><strong>FHDOD</strong><small>Fundação Hospitalar<br />Dr. Oswaldo Diesel</small></span>
    </Link>
  )
}
