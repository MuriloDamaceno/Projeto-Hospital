import type { AuthUser } from '../types'

export function getUserSectorSlugs(user: Pick<AuthUser, 'sectorSlug' | 'sectorSlugs'> | null): string[] {
  if (!user) return []
  const slugs = [...(user.sectorSlugs ?? [])]
  if (user.sectorSlug && !slugs.includes(user.sectorSlug)) slugs.unshift(user.sectorSlug)
  return [...new Set(slugs)]
}
