import { Link } from 'react-router-dom'
import logo from '../assets/fhdod-logo.png'

export function Brand({ light = false, link = true }: { light?: boolean; link?: boolean }) {
  const className = `brand${light ? ' brand-light' : ''}`
  const image = <img src={logo} alt="" />

  if (!link) {
    return <div className={className} aria-label="Fundação Hospitalar Dr. Oswaldo Diesel">{image}</div>
  }

  return (
    <Link className={className} to="/" aria-label="Fundação Hospitalar Dr. Oswaldo Diesel, página inicial">
      {image}
    </Link>
  )
}
