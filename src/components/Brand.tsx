import { Link } from 'react-router-dom'
import logo from '../assets/fhdod-logo.png'

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brand${light ? ' brand-light' : ''}`} to="/" aria-label="Fundação Hospitalar Dr. Oswaldo Diesel, página inicial">
      <img src={logo} alt="" />
    </Link>
  )
}
