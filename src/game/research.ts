import { initialFamilies, type BadgeFamily } from './attributes'
import type { GeneratorOptions } from './generator'
import { milestones } from './progression'

export const disciplines = [
  { name: 'Numerical Expansion', short: 'Expansion', color: '#b59aff' },
  { name: 'Mathematical Notation', short: 'Notation', color: '#e79cff' },
  { name: 'Structural Complexity', short: 'Structure', color: '#adabff' },
  { name: 'Attribute Science', short: 'Attributes', color: '#ff9fae' },
  { name: 'Probability Theory', short: 'Probability', color: '#84baff' },
  { name: 'EP Economics', short: 'Economics', color: '#c8f68b' },
  { name: 'Mathematical Analysis', short: 'Analysis', color: '#f5c879' },
  { name: 'Convergence & Specialization', short: 'Convergence', color: '#ffaf8b' },
] as const

export const eras = [
  'Classical Era', 'Numerical Expansion', 'Extended Arithmetic', 'Power Towers', 'Hyperoperations',
  'Recursive Notations', 'Ordinal-Indexed Growth', 'Extreme Googology',
] as const

export type Requirement =
  | { kind: 'node'; id: string }
  | { kind: 'families'; amount: number }
  | { kind: 'all' | 'any'; items: Requirement[] }

export type Specialization = NonNullable<GeneratorOptions['specialization']>

type Effect =
  | { kind: 'ep'; basis: number }
  | { kind: 'familyEP'; family: BadgeFamily; amount: number }
  | { kind: 'family'; family: BadgeFamily }
  | { kind: 'unlock'; feature: 'wide' | 'vast' | 'arithmetic' | 'nesting' }
  | { kind: 'anomaly'; amount: number }
  | { kind: 'specialize'; choice: Specialization }

export type ResearchNode = {
  id: string; title: string; description: string; cost: bigint; legacyCost: bigint
  discipline: number; era?: number
  requires?: Requirement; effects: Effect[]
  max?: number; refundable?: boolean
}
export type Purchases = Record<string, number>
export type ResearchProgress = { purchases: Purchases; families: number }

export const owns = (purchases: Purchases, id: string) => Object.hasOwn(purchases, id) ? purchases[id] : 0
const node = (id: string): Requirement => ({ kind: 'node', id })
const all = (...items: Requirement[]): Requirement => ({ kind: 'all', items })
const any = (...items: Requirement[]): Requirement => ({ kind: 'any', items })
const families = (amount: number): Requirement => ({ kind: 'families', amount })
const ep = (basis: number): Effect => ({ kind: 'ep', basis })
const badgeEP = (family: BadgeFamily, amount = 1): Effect => ({ kind: 'familyEP', family, amount })
const unlock = (feature: Extract<Effect, { kind: 'unlock' }>['feature']): Effect => ({ kind: 'unlock', feature })

function study(
  discipline: number, id: string, title: string, legacyCost: bigint,
  description: string, effects: Effect[], requires?: Requirement, extras: Partial<ResearchNode> = {},
): ResearchNode {
  const cost = (legacyCost + 4n) / 5n
  return { discipline, id, title, cost, legacyCost, description, effects, requires, ...extras }
}

export const research: ResearchNode[] = [
  study(5, 'yield', 'Yield Calibration', 30n, '+1 EP for the parity badge on every integer roll.', [badgeEP('parity')]),
  study(0, 'place-value', 'Place Value', 35n, '+1 EP for every digit badge.', [badgeEP('digits')], node('yield')),
  study(0, 'radix', 'Radix Survey', 130n, '+1 EP for stepping sequences.', [badgeEP('sequence')], node('place-value')),
  study(0, 'boundaries', 'Boundary Survey', 360n, '+1 EP for mathematical landmarks.', [badgeEP('landmarks')], node('radix')),
  study(0, 'horizon', 'The Classical Horizon', 850n, '+8% of base EP on every roll.', [ep(800)], node('boundaries')),
  study(0, 'expansion', 'Beyond a Million', 35_000n, 'Unlock a new integer band through one trillion. Classical rolls remain in the pool.', [unlock('wide')], all(node('synthesis'), node('classical-review')), { cost: 6_250n }),
  study(0, 'vast', 'Arbitrary Precision', 245_000n, 'Add an integer band that reaches 10²⁴.', [unlock('vast')], node('nesting'), { era: 1 }),

  study(1, 'notation', 'Number Forms', 45n, '+1 EP for every landmark badge.', [badgeEP('landmarks')], node('catalog')),
  study(1, 'operators', 'Operator Survey', 135n, '+1 EP for every divisibility badge.', [badgeEP('divisibility')], node('notation')),
  study(1, 'syntax', 'Syntax Table', 420n, '+4% of base EP on every roll.', [ep(400)], all(node('operators'), node('symmetry'))),
  study(1, 'grammar', 'Classical Grammar', 930n, '+1 EP for palindrome and sequence badges.', [badgeEP('mirror'), badgeEP('sequence')], node('syntax')),
  study(1, 'arithmetic', 'Expression Grammar', 112_000n, 'Add ordered sums and products to the roll pool.', [unlock('arithmetic')], any(node('anomaly'), node('magnitude-focus'), node('rarity-focus'), node('efficiency-focus')), { era: 1 }),

  study(2, 'repetition', 'Repetition', 55n, '+1 EP for double takes and repdigits.', [badgeEP('digits')], node('place-value')),
  study(2, 'motifs', 'Recurring Motifs', 140n, 'Discover Digit Rhythm for repeated multi-digit blocks.', [{ kind: 'family', family: 'rhythm' }], node('repetition')),
  study(2, 'symmetry', 'Symmetry', 390n, '+2 EP for palindromes.', [badgeEP('mirror', 2)], node('motifs')),
  study(2, 'pattern-model', 'Pattern Model', 810n, '+2 EP for Digit Rhythm.', [badgeEP('rhythm', 2)], node('symmetry')),
  study(2, 'nesting', 'Nested Arithmetic', 160_000n, 'Add depth-two expressions and a procedural depth badge.', [unlock('nesting')], node('arithmetic'), { era: 1 }),

  study(3, 'catalog', 'Badge Catalog', 40n, '+1 EP for prime badges.', [badgeEP('prime')], node('yield')),
  study(3, 'squares', 'Square Recognition', 145n, 'Discover Perfect Square and its EP reward.', [{ kind: 'family', family: 'powers' }], node('catalog')),
  study(3, 'classifier', 'Family Classifier', 460n, '+2 EP for Perfect Square.', [badgeEP('powers', 2)], all(node('squares'), families(5))),
  study(3, 'atlas', 'Attribute Atlas', 890n, '+9% of base EP on every roll.', [ep(900)], node('classifier')),

  study(4, 'odds', 'Sample Space', 50n, '+1 EP for every prime badge.', [badgeEP('prime')], node('yield')),
  study(4, 'distribution', 'Distribution Survey', 160n, '+1 EP for palindromes.', [badgeEP('mirror')], node('odds')),
  study(4, 'variance', 'Variance Analysis', 420n, '+1 EP for rare sequence landmarks.', [badgeEP('landmarks')], node('distribution')),
  study(4, 'tail-model', 'Tail Model', 880n, '+1 percentage point for each unlocked nonclassical integer band.', [{ kind: 'anomaly', amount: 1 }], node('variance')),
  study(4, 'anomaly', 'Anomaly Weighting', 21_000n, 'Shift 1 percentage point per rank to each unlocked nonclassical integer band.', [{ kind: 'anomaly', amount: 1 }], node('expansion'), { max: 5, era: 1 }),

  study(5, 'compound', 'Reward Multiplier', 210n, '+12% of base EP per rank. Each rank doubles the next cost.', [ep(1_200)], node('yield'), { max: 4 }),
  study(5, 'synergy', 'Badge Synergy', 530n, '+1 EP for divisibility and digit badges.', [badgeEP('divisibility'), badgeEP('digits')], node('fieldwork')),
  study(5, 'capital', 'Expression Capital', 950n, '+15% of base EP on every roll.', [ep(1500)], node('peer-review')),

  study(6, 'measurement', 'Measurement', 45n, '+1 EP for integer stepping sequences.', [badgeEP('sequence')], node('radix')),
  study(6, 'bounds', 'Exact Bounds', 155n, '+1 EP for every square badge.', [badgeEP('powers')], node('measurement')),
  study(6, 'invariants', 'Integer Invariants', 440n, '+1 EP for prime badges and palindromes.', [badgeEP('prime'), badgeEP('mirror')], node('bounds')),
  study(6, 'verification', 'Symbolic Verification', 900n, '+7% of base EP on every roll.', [ep(700)], node('invariants')),

  study(7, 'fieldwork', 'Fieldwork', 65n, '+5% of base EP on every roll.', [ep(500)], node('compound')),
  study(7, 'peer-review', 'Peer Review', 225n, '+1 EP for mathematical landmarks.', [badgeEP('landmarks')], node('synergy')),
  study(7, 'synthesis', 'Research Synthesis', 620n, '+8% of base EP on every roll.', [ep(800)], all(node('horizon'), node('pattern-model'), node('grammar'), node('verification'))),
  study(7, 'classical-review', 'Classical Review', 1350n, '+12% of base EP on every roll.', [ep(1200)], all(node('atlas'), node('tail-model'), node('capital'))),
  study(7, 'magnitude-focus', 'Magnitude Focus', 9000n, 'Widen symbolic operands and shift 4 percentage points toward expanded integers.', [{ kind: 'specialize', choice: 'magnitude' }], node('expansion'), { refundable: true, era: 1 }),
  study(7, 'rarity-focus', 'Rarity Focus', 9000n, 'Shift 4 percentage points toward each unlocked vast or symbolic band.', [{ kind: 'specialize', choice: 'rarity' }], node('expansion'), { refundable: true, era: 1 }),
  study(7, 'efficiency-focus', 'Efficiency Focus', 9000n, '+25% of base EP on every roll.', [{ kind: 'specialize', choice: 'efficiency' }, ep(2500)], node('expansion'), { refundable: true, era: 1 }),
]

export const researchById = new Map(research.map(item => [item.id, item]))
export function dependencies(requirement?: Requirement): string[] {
  if (!requirement) return []
  if (requirement.kind === 'node') return [requirement.id]
  if (requirement.kind === 'all' || requirement.kind === 'any') return requirement.items.flatMap(dependencies)
  return []
}

export function validateResearch(nodes: readonly ResearchNode[]) {
  const byId = new Map(nodes.map(item => [item.id, item]))
  if (byId.size !== nodes.length) throw new Error('Duplicate research ID')
  const visited = new Set<string>()
  const path = new Set<string>()
  function visit(id: string) {
    if (path.has(id)) throw new Error('Cyclic research prerequisite: ' + id)
    if (visited.has(id)) return
    const item = byId.get(id)
    if (!item || !/^[a-z][a-z-]*$/.test(id) || item.cost <= 0n || (item.max ?? 1) < 1) throw new Error('Invalid research node: ' + id)
    path.add(id)
    dependencies(item.requires).forEach(visit)
    path.delete(id)
    visited.add(id)
  }
  byId.forEach((_, id) => visit(id))
}
validateResearch(research)

export function familyGoal(amount: number, lab: boolean) {
  return lab ? Math.min(amount, 4) : amount
}

export function meets(requirement: Requirement | undefined, progress: ResearchProgress, lab = false): boolean {
  if (!requirement) return true
  switch (requirement.kind) {
    case 'node': return owns(progress.purchases, requirement.id) > 0
    case 'families': return progress.families >= familyGoal(requirement.amount, lab)
    case 'all': return requirement.items.every(item => meets(item, progress, lab))
    case 'any': return requirement.items.some(item => meets(item, progress, lab))
  }
}

export function rankCost(item: Pick<ResearchNode, 'cost'>, rank: number, lab = false, base = item.cost) {
  const full = base * 2n ** BigInt(rank)
  return lab ? (full + 3199n) / 3200n : full
}

export function specializationOf(purchases: Purchases): Specialization | null {
  for (const choice of ['magnitude', 'rarity', 'efficiency'] as const) {
    if (owns(purchases, choice + '-focus')) return choice
  }
  return null
}

export function researchEra(purchases: Purchases) {
  if (owns(purchases, 'arithmetic')) return 2
  if (owns(purchases, 'expansion')) return 1
  return 0
}

export function researchStatus(item: ResearchNode, progress: ResearchProgress, balance: bigint, lab = false) {
  const rank = owns(progress.purchases, item.id)
  if (rank >= (item.max ?? 1)) return 'complete'
  if (item.refundable && specializationOf(progress.purchases)) return 'exclusive'
  if (!meets(item.requires, progress, lab)) return 'locked'
  if (balance < rankCost(item, rank, lab)) return 'unaffordable'
  return 'available'
}

export function effectsOf(purchases: Purchases) {
  const generator: GeneratorOptions = {
    wide: false, vast: false, arithmetic: false, nesting: false, anomaly: 0, specialization: specializationOf(purchases),
  }
  let basis = 10_000n
  const families = [...initialFamilies]
  const familyEP: Partial<Record<BadgeFamily, bigint>> = {}
  for (const [id, rank] of Object.entries(purchases)) {
    const item = researchById.get(id)
    if (!item || !rank) continue
    for (const effect of item.effects) {
      switch (effect.kind) {
        case 'ep': basis += BigInt(effect.basis * rank); break
        case 'familyEP': familyEP[effect.family] = (familyEP[effect.family] ?? 0n) + BigInt(effect.amount * rank); break
        case 'family': if (!families.includes(effect.family)) families.push(effect.family); break
        case 'anomaly': generator.anomaly += effect.amount * rank; break
        case 'unlock': generator[effect.feature] = true; break
      }
    }
  }
  return { generator, basis, families, familyEP }
}

export function researchRoute(id: string) {
  const route = new Set<string>()
  function visit(id: string) {
    if (route.has(id)) return
    route.add(id)
    dependencies(researchById.get(id)?.requires).forEach(visit)
  }
  visit(id)
  return route
}

export const startingStudy = 'yield'
export const classicalRoute = () => researchRoute('expansion')

const milestoneRoutes = milestones.map(researchRoute)
for (const item of research) {
  if (!researchRoute(item.id).has(startingStudy) || !milestoneRoutes.some(route => route.has(item.id))) {
    throw new Error('Research must connect the starting study to a milestone: ' + item.id)
  }
  if (item.id !== startingStudy && !dependencies(item.requires).length) {
    throw new Error('Unexpected starting study: ' + item.id)
  }
}
