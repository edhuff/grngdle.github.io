import type { BadgeFamily, BadgeId } from '../attributes'
import type { GeneratorOptions, Source } from '../generator'
import type { AdvancedFamily, FamilyParameters } from '../generation/config'
import type { PropertyId } from '../research-properties'
import { node, type Requirement } from './requirements'

export type Specialization = NonNullable<GeneratorOptions['specialization']>
export type NodeType = 'Foundation' | 'Enhancement' | 'Repeatable' | 'Gateway' | 'Convergence' | 'Specialization' | 'Keystone'
export type Feature = 'badge-ledger' | 'source-ledger' | 'badge-filter' | 'source-filter' | 'record-search' | 'first-discovery' |
  'pool-breakdown' | 'reference-odds' | 'factorization' | 'divisor-count' | 'divisor-sum' | 'digit-sum' | 'numeral-bases' |
  'residue-table' | 'digit-inventory' | 'decimal-reversal' | 'sequence-indices' | 'decimal-bounds' | 'expression-tree' | 'tower-stack' | 'ordinal-index' | 'limit-approximants'
export type Effect =
  | { kind: 'ep'; basis: number }
  | { kind: 'familyEP'; family: BadgeFamily; amount: number }
  | { kind: 'family'; family: BadgeFamily }
  | { kind: 'unlock'; feature: 'wide' | 'vast' | 'arithmetic' | 'nesting' }
  | { kind: 'generator'; family: AdvancedFamily; tuning?: Partial<FamilyParameters> }
  | { kind: 'anomaly'; amount: number }
  | { kind: 'specialize'; choice: Specialization }
  | { kind: 'property'; id: PropertyId }
  | { kind: 'badgeEP'; id: BadgeId; amount: number }
  | { kind: 'pair'; badges: [BadgeId, BadgeId]; amount: number }
  | { kind: 'discount'; amount: number; discipline?: number }
  | { kind: 'feature'; id: Feature }
  | { kind: 'capacity'; record: 'recent' | 'rarest' | 'highest' | 'largest'; amount: number }
  | { kind: 'luck'; digit: number; amount: number }
  | { kind: 'range'; digits: number }
  | { kind: 'sourceEP'; source: Source; amount: number }

export type ResearchNode = {
  id: string; title: string; description: string; cost: bigint; legacyCost: bigint; previousCost?: bigint
  discipline: number; era?: number
  requires?: Requirement; priorRequires?: Requirement; effects: Effect[]
  max?: number; refundable?: boolean; doctrine?: Specialization
  cluster?: string; region?: number; type?: NodeType; challenge?: boolean; unavailable?: string
}
export type Purchases = Record<string, number>
export type ResearchProgress = { purchases: Purchases; families: number; lifetime?: bigint; badges?: Readonly<Partial<Record<BadgeId, number>>> }

export const ep = (basis: number): Effect => ({ kind: 'ep', basis })
export const badgeEP = (family: BadgeFamily, amount = 1): Effect => ({ kind: 'familyEP', family, amount })
export const unlock = (feature: Extract<Effect, { kind: 'unlock' }>['feature']): Effect => ({ kind: 'unlock', feature })
export const generator = (family: AdvancedFamily, tuning?: Partial<FamilyParameters>): Effect => ({ kind: 'generator', family, tuning })
export const property = (id: PropertyId): Effect => ({ kind: 'property', id })
export const reward = (id: BadgeId, amount: number): Effect => ({ kind: 'badgeEP', id, amount })
export const pair = (a: BadgeId, b: BadgeId, amount: number): Effect => ({ kind: 'pair', badges: [a, b], amount })
export const discount = (amount: number, discipline?: number): Effect => ({ kind: 'discount', amount, discipline })
export const feature = (id: Feature): Effect => ({ kind: 'feature', id })
export const capacity = (record: 'recent' | 'rarest' | 'highest' | 'largest', amount: number): Effect => ({ kind: 'capacity', record, amount })
export const luck = (digit: number, amount: number): Effect => ({ kind: 'luck', digit, amount })
export const range = (digits: number): Effect => ({ kind: 'range', digits })
export const sourceEP = (source: Source, amount: number): Effect => ({ kind: 'sourceEP', source, amount })

type Study = [id: string, title: string, cost: number, requires: string | Requirement, description: string, effects: Effect | Effect[], options?: Partial<ResearchNode>]
export function cluster(region: number, name: string, discipline: number, rows: Study[]): ResearchNode[] {
  return rows.map(([id, title, cost, requires, description, effects, options]) => ({
    id, title, description, cost: BigInt(cost), legacyCost: BigInt(cost), discipline, region, era: region,
    requires: typeof requires === 'string' ? node(requires) : requires,
    effects: Array.isArray(effects) ? effects : [effects],
    type: options?.max ? 'Repeatable' : 'Enhancement',
    cluster: name, ...options,
  }))
}
