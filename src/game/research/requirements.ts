import type { BadgeId } from '../attributes'

export type Requirement =
  | { kind: 'node'; id: string }
  | { kind: 'lifetime'; amount: bigint }
  | { kind: 'families'; amount: number }
  | { kind: 'badge'; id: BadgeId; amount: number }
  | { kind: 'all' | 'any'; items: Requirement[] }
  | { kind: 'count'; amount: number; items: Requirement[] }

export const node = (id: string): Requirement => ({ kind: 'node', id })
export const all = (...items: Requirement[]): Requirement => ({ kind: 'all', items })
export const any = (...items: Requirement[]): Requirement => ({ kind: 'any', items })
export const countOf = (amount: number, ...ids: string[]): Requirement => ({ kind: 'count', amount, items: ids.map(node) })
export const families = (amount: number): Requirement => ({ kind: 'families', amount })
export const earned = (amount: bigint): Requirement => ({ kind: 'lifetime', amount })
export const found = (id: BadgeId, amount = 1): Requirement => ({ kind: 'badge', id, amount })

export function dependencies(requirement?: Requirement): string[] {
  if (!requirement) return []
  if (requirement.kind === 'node') return [requirement.id]
  if ('items' in requirement) return [...new Set(requirement.items.flatMap(dependencies))]
  return []
}
