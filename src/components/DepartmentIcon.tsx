import { BedDouble, HeartPulse, ScanLine, Stethoscope, UserRound, UsersRound } from 'lucide-react'
import type { DepartmentIcon as DepartmentIconName } from '../types'

const icons = {
  door: UsersRound,
  heart: HeartPulse,
  nurse: UserRound,
  doctor: Stethoscope,
  bed: BedDouble,
  scan: ScanLine,
}

export function DepartmentIcon({ name, size = 22 }: { name: DepartmentIconName; size?: number }) {
  const Icon = icons[name]
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />
}
