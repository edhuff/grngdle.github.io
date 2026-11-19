import { initialFamilies, badgeRule, type BadgeFamily } from './attributes'
import type { GeneratorOptions } from './generator'
import { milestones } from './progression'
import { badgeIds, type BadgeId } from './attributes'
import type { PropertyId } from './research-properties'
import { classicalLegacyClusters, classicalStudies } from './research/classical'
import { doctrineStudies } from './research/doctrines'
import { advancedStudies } from './research/advanced'
import { all, any, dependencies, families, node, type Requirement } from './research/requirements'
import { badgeEP, ep, generator, unlock, range, type Effect, type Feature, type Purchases, type ResearchNode, type ResearchProgress, type Specialization } from './research/model'
import { familyDefaults, type AdvancedFamily, type FamilyParameters } from './generation/config'

export const disciplines = [
  { name: 'Numerical Expansion', short: 'Expansion', color: '#b59aff' },
  { name: 'Mathematical Notation', short: 'Notation', color: '#e79cff' },
  { name: 'Structural Complexity', short: 'Structure', color: '#adabff' },
  { name: 'Attribute Science', short: 'Attributes', color: '#ff9fae' },
  { name: 'Probability Theory', short: 'Probability', color: '#84baff' },
  { name: 'EP Economics', short: 'Economics', color: '#c8f68b' },
  { name: 'Mathematical Analysis', short: 'Analysis', color: '#f5c879' },
  { name: 'Convergence & Specialization', short: 'Convergence', color: '#ffaf8b' },
  { name: 'Discovery Engineering', short: 'Discovery', color: '#68d8c1' },
] as const

export const eras = [
  'Classical Era', 'Numerical Expansion', 'Extended Arithmetic', 'Power Towers', 'Hyperoperations',
  'Recursive Notations', 'Ordinal-Indexed Growth', 'Extreme Googology',
] as const

export type { Requirement, ResearchNode, Purchases, ResearchProgress, Specialization }
export { dependencies }
export const owns = (purchases: Purchases, id: string) => Object.hasOwn(purchases, id) ? purchases[id] : 0

function study(
  discipline: number, id: string, title: string, legacyCost: bigint,
  description: string, effects: Effect[], requires?: Requirement, extras: Partial<ResearchNode> = {},
): ResearchNode {
  const cost = (legacyCost + 4n) / 5n
  return { discipline, id, title, cost, legacyCost, description, effects, requires, ...extras }
}

const original: ResearchNode[] = [
  study(5, 'yield', 'Yield Calibration', 30n, '+1 EP for the parity badge on every integer roll.', [badgeEP('parity')]),
  study(0, 'place-value', 'Place Value', 35n, '+1 EP for every digit badge.', [badgeEP('digits')], node('yield')),
  study(0, 'radix', 'Radix Survey', 130n, '+1 EP for stepping sequences.', [badgeEP('sequence')], node('place-value')),
  study(0, 'boundaries', 'Boundary Survey', 360n, '+1 EP for mathematical landmarks.', [badgeEP('landmarks')], node('radix')),
  study(0, 'horizon', 'The Classical Horizon', 850n, '+8% of base EP on every roll.', [ep(800)], node('boundaries')),
  study(0, 'expansion', 'Beyond a Million', 35_000n, 'Open Numerical Expansion I. Add an uncommon band from 1,000,001 through 10,000,000.', [unlock('wide'), range(7)], node('classical-synthesis'), { cost: 14_500n, previousCost: 6_250n, priorRequires: all(node('synthesis'), node('classical-review')) }),
  study(0, 'vast', 'Arbitrary Precision', 245_000n, 'Add an integer band that reaches 10²⁴.', [unlock('vast')], node('nesting'), { era: 1 }),

  study(1, 'notation', 'Number Forms', 45n, '+1 EP for every landmark badge.', [badgeEP('landmarks')], node('catalog')),
  study(1, 'operators', 'Operator Survey', 135n, '+1 EP for every divisibility badge.', [badgeEP('divisibility')], node('notation')),
  study(1, 'syntax', 'Syntax Table', 420n, '+4% of base EP on every roll.', [ep(400)], all(node('operators'), node('symmetry'))),
  study(1, 'grammar', 'Classical Grammar', 930n, '+1 EP for palindrome and sequence badges.', [badgeEP('mirror'), badgeEP('sequence')], node('syntax')),
  study(1, 'arithmetic', 'Expression Grammar', 112_000n, 'Add ordered sums and products to the roll pool.', [unlock('arithmetic')], any(node('anomaly'), node('magnitude-focus'), node('rarity-focus'), node('efficiency-focus'), node('decimal-fellowship')), { era: 1,
      priorRequires: any(node('anomaly'), node('magnitude-focus'), node('rarity-focus'), node('efficiency-focus')),
    }),

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
  study(7, 'magnitude-focus', 'Magnitude Doctrine', 9000n, 'Widen symbolic operands and shift 4 percentage points toward expanded integers.', [{ kind: 'specialize', choice: 'magnitude' }], node('expansion'), { refundable: true, era: 1, doctrine: 'magnitude' }),
  study(7, 'rarity-focus', 'Rarity Doctrine', 9000n, 'Shift 4 percentage points toward each unlocked vast or symbolic band.', [{ kind: 'specialize', choice: 'rarity' }], node('expansion'), { refundable: true, era: 1, doctrine: 'rarity' }),
  study(7, 'efficiency-focus', 'Economy Doctrine', 9000n, '+25% of base EP on every roll.', [{ kind: 'specialize', choice: 'efficiency' }, ep(2500)], node('expansion'), { refundable: true, era: 1, doctrine: 'efficiency' }),
  study(1, 'exact-operations', 'Exact Operations', 48_000n, 'Add signed subtraction, nonzero division, and factorials.', [generator('subtraction'), generator('division'), generator('factorials')], node('arithmetic'), { era: 1 }),
  study(0, 'digit-strings', 'Long Integers', 125_000n, 'Add weighted decimal strings from 26 to 40 digits.', [generator('digits')], node('vast'), { era: 2 }),
  study(4, 'digit-spectrum', 'Digit Spectrum', 90_000n, 'Per rank, extend the digit limit by 24 and increase the zero and family weights.', [generator('digits', { complexity: 24, digitBias: 1, weight: 1 })], node('digit-strings'), { max: 4, era: 2 }),
  study(1, 'exponentiation', 'Exponentiation', 320_000n, 'Add powers and right-nested exponents.', [generator('powers')], all(node('exact-operations'), node('digit-spectrum')), { era: 2 }),
  study(2, 'tower-reach', 'Tower Operands', 210_000n, 'Per rank, add one exponent layer and increase the operand limit and weight.', [generator('powers', { complexity: 1, operandMax: 3, weight: 1 })], node('exponentiation'), { max: 4, era: 2 }),
  study(2, 'power-towers', 'Power Towers', 550_000n, 'Add right-associated power towers and tetration with variable heights.', [generator('towers'), generator('tetration')], node('tower-reach'), { era: 2 }),
  study(1, 'hyperoperations', 'Hyperoperations', 850_000n, 'Add pentation, hexation, higher finite ranks, and Knuth up-arrows.', [generator('hyperoperations'), generator('arrows')],
    all(node('power-towers'), any(node('tower-convergence'), node('tetration-heights'))), { era: 3, priorRequires: node('power-towers') }),
  study(4, 'arrow-spectrum', 'Arrow Spectrum', 470_000n, 'Each rank increases the maximum arrow count by three decimal orders and extends finite hyperoperation ranks.', [generator('arrows', { complexity: 3, weight: 1 }), generator('hyperoperations', { complexity: 1 })], node('hyperoperations'), { max: 6, era: 4 }),
  study(1, 'conway-chains', 'Conway Chained Arrows', 1_350_000n, 'Add variable-length Conway chains, including nested chains.', [generator('chains')],
    all(node('arrow-spectrum'), any(node('hyperoperation-theory'), node('knuth-weight-study'))), { era: 4, priorRequires: node('arrow-spectrum') }),
  study(6, 'ordinal-hierarchy', 'Ordinal Hierarchy', 2_250_000n, 'Add fast-growing functions indexed by ordinals in Cantor normal form.', [generator('hierarchy')],
    all(node('conway-chains'), any(node('recursive-foundations'), node('chain-sampling'))), { era: 5, priorRequires: node('conway-chains') }),
  study(7, 'extreme-googology', 'Extreme Googology', 3_750_000n, 'Add Busy Beaver steps and ones, and Ackermann–Péter functions.', [generator('busy'), generator('ackermann')],
    all(node('ordinal-hierarchy'), any(node('ordinal-foundations'), node('ordinal-sampling'))), { era: 6, priorRequires: node('ordinal-hierarchy') }),
]

const legacyRegions: Record<string, number> = {
  nesting: 2, vast: 2, 'exact-operations': 2, 'digit-strings': 2, 'digit-spectrum': 2,
  exponentiation: 2, 'tower-reach': 2, 'power-towers': 2, hyperoperations: 3,
  'arrow-spectrum': 4, 'conway-chains': 4, 'ordinal-hierarchy': 5, 'extreme-googology': 6,
}
// Preserve the original prices for pre-atlas saves. Staged costs space out the
// permanent studies before the gateway instead of concentrating EP at the end.
const classicalPrices: Record<string, bigint> = {
  radix: 270n, repetition: 160n, notation: 165n, operators: 330n, squares: 220n, measurement: 220n, distribution: 285n,
  boundaries: 1190n, horizon: 3180n, syntax: 1440n, grammar: 3590n,
  motifs: 420n, symmetry: 1070n, 'pattern-model': 2920n, classifier: 960n, atlas: 3250n,
  variance: 1520n, 'tail-model': 2820n, synergy: 800n, 'peer-review': 1250n, capital: 3070n,
  bounds: 585n, invariants: 1720n, verification: 3010n, synthesis: 6200n, 'classical-review': 6900n,
}
const gateways = new Set<string>(milestones)
export const research = [...original.map(item => {
  const region = legacyRegions[item.id] ?? item.era ?? 0
  return {
    ...item, ...(classicalPrices[item.id] ? { cost: classicalPrices[item.id], previousCost: item.cost } : {}), region, cluster: classicalLegacyClusters[item.id] ?? (item.doctrine ? 'Doctrines' : 'Era Foundations'),
    type: item.doctrine ? 'Specialization' : gateways.has(item.id) ? 'Gateway' : item.max ? 'Repeatable' : 'Foundation',
  } satisfies ResearchNode
}), ...classicalStudies, ...advancedStudies, ...doctrineStudies]
export const originalResearch: ReadonlySet<string> = new Set(original.map(item => item.id))
export const researchById = new Map(research.map(item => [item.id, item]))

function validateRequirement(requirement?: Requirement): void {
  if (!requirement) return
  if ('items' in requirement) {
    if (!requirement.items.length || (requirement.kind === 'count' &&
      (!Number.isSafeInteger(requirement.amount) || requirement.amount < 1 || requirement.amount > requirement.items.length ||
        new Set(requirement.items.map(item => JSON.stringify(item, (_, value) => typeof value === 'bigint' ? value.toString() : value))).size !== requirement.items.length))) throw new Error('Invalid research prerequisite group')
    requirement.items.forEach(validateRequirement)
  } else if (requirement.kind === 'lifetime') {
    if (typeof requirement.amount !== 'bigint' || requirement.amount <= 0n) throw new Error('Invalid lifetime EP milestone')
  } else if ('amount' in requirement && (!Number.isSafeInteger(requirement.amount) || requirement.amount < 1 ||
      (requirement.kind === 'families' && requirement.amount > 10) ||
      (requirement.kind === 'badge' && !badgeIds.includes(requirement.id)))) throw new Error('Invalid research milestone')
}

export function validateResearch(nodes: readonly ResearchNode[]) {
  const byId = new Map(nodes.map(item => [item.id, item]))
  if (byId.size !== nodes.length) throw new Error('Duplicate research ID')
  if (new Set(nodes.map(item => item.title)).size !== nodes.length) throw new Error('Duplicate research title')
  const visited = new Set<string>()
  const path = new Set<string>()
  function visit(id: string) {
    if (path.has(id)) throw new Error('Cyclic research prerequisite: ' + id)
    if (visited.has(id)) return
    const item = byId.get(id)
    if (!item || !/^[a-z][a-z-]*$/.test(id) || item.cost <= 0n || !Number.isSafeInteger(item.max ?? 1) || (item.max ?? 1) < 1 || (!item.unavailable && !item.effects.length)) throw new Error('Invalid research node: ' + id)
    validateRequirement(item.requires)
    path.add(id)
    dependencies(item.requires).forEach(visit)
    path.delete(id)
    visited.add(id)
  }
  byId.forEach((_, id) => visit(id))
  const reachable = new Set<string>()
  const initial = ['even', 'odd', 'three', 'five', 'seven', 'prime', 'repeat', 'palindrome', 'consecutive', 'fibonacci', 'constant', 'uniform'] as const
  const generated: Record<AdvancedFamily, BadgeId> = {
    digits: 'longInteger', subtraction: 'difference', division: 'quotient', factorials: 'factorial', powers: 'exponent',
    towers: 'tower', tetration: 'tetrationHeight', hyperoperations: 'hyperRank', arrows: 'arrows', chains: 'chain',
    hierarchy: 'ordinal', busy: 'busy', ackermann: 'ackermann',
  }
  for (const doctrine of [undefined, 'magnitude', 'rarity', 'efficiency'] as const) {
    const purchases: Purchases = {}
    const badges: Partial<Record<BadgeId, number>> = {}
    const families = new Set<BadgeFamily>(initialFamilies)
    function discover(id: BadgeId) {
      families.add(badgeRule(id).family)
      badges[id] = Number.MAX_SAFE_INTEGER
    }
    initial.forEach(discover)
    const progress = { purchases, families: families.size, badges, lifetime: 10n ** 1024n }
    let changed = true
    while (changed) {
      changed = false
      for (const item of nodes) {
        if (purchases[item.id] || item.unavailable || (item.doctrine && item.doctrine !== doctrine) || !meets(item.requires, progress)) continue
        purchases[item.id] = 1
        reachable.add(item.id)
        for (const effect of item.effects) {
          if (effect.kind === 'property') discover(effect.id)
          if (effect.kind === 'family' && effect.family === 'rhythm') discover('rhythm')
          if (effect.kind === 'family' && effect.family === 'powers') discover('square')
          if (effect.kind === 'generator' && !effect.tuning) {
            discover(generated[effect.family])
            if (effect.family === 'tetration') discover('hyperRank')
            if (effect.family === 'towers') discover('repeatedOperand')
            if (effect.family === 'powers' || effect.family === 'chains') discover('nested')
          }
          if (effect.kind === 'unlock' && (effect.feature === 'arithmetic' || effect.feature === 'nesting')) {
            discover('addition')
            discover('product')
            if (effect.feature === 'nesting') discover('nested')
          }
        }
        progress.families = families.size
        changed = true
      }
    }
  }
  for (const item of nodes) if (!reachable.has(item.id) && !item.unavailable) throw new Error('Unreachable research: ' + item.id)
}

export function familyGoal(amount: number, lab: boolean) {
  return lab ? Math.min(amount, 4) : amount
}

export function meets(requirement: Requirement | undefined, progress: ResearchProgress, lab = false): boolean {
  if (!requirement) return true
  switch (requirement.kind) {
    case 'node': return owns(progress.purchases, requirement.id) > 0
    case 'lifetime': return (progress.lifetime ?? 0n) >= (lab ? (requirement.amount + 3199n) / 3200n : requirement.amount)
    case 'families': return progress.families >= familyGoal(requirement.amount, lab)
    case 'badge': return (progress.badges?.[requirement.id] ?? 0) >= (lab ? 1 : requirement.amount)
    case 'count': return requirement.items.filter(item => meets(item, progress, lab)).length >= requirement.amount
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
  if (owns(purchases, 'extreme-googology')) return 7
  if (owns(purchases, 'ordinal-hierarchy')) return 6
  if (owns(purchases, 'conway-chains')) return 5
  if (owns(purchases, 'hyperoperations')) return 4
  if (owns(purchases, 'power-towers')) return 3
  if (owns(purchases, 'arithmetic')) return 2
  if (owns(purchases, 'expansion')) return 1
  return 0
}

export function purchaseCost(item: ResearchNode, state: Purchases, lab = false) {
  const full = rankCost(item, owns(state, item.id), lab)
  const { rebates } = effectsOf(state)
  const basis = BigInt(10_000 - Math.min(4500, (rebates.get(-1) ?? 0) + (rebates.get(item.discipline) ?? 0)))
  return (full * basis + 9_999n) / 10_000n
}

const clusters = new Map<string, ResearchNode[]>()
for (const item of research) {
  const key = item.region + '/' + item.cluster
  const members = clusters.get(key) ?? []
  members.push(item)
  clusters.set(key, members)
}

export function clusterProgress(purchases: Purchases) {
  const revealed = researchEra(purchases)
  return [...clusters.values()].filter(members => members[0].region! <= revealed).map(members => ({
    name: members[0].cluster!, region: members[0].region!, total: members.length,
    mastered: members.filter(item => owns(purchases, item.id) === (item.max ?? 1)).length,
  }))
}

export function researchStatus(item: ResearchNode, progress: ResearchProgress, balance: bigint, lab = false) {
  const rank = owns(progress.purchases, item.id)
  if (rank >= (item.max ?? 1)) return 'complete'
  if (item.unavailable) return 'unsupported'
  const current = specializationOf(progress.purchases)
  if (item.doctrine && current && current !== item.doctrine) return 'exclusive'
  if (!meets(item.requires, progress, lab)) return 'locked'
  if (balance < purchaseCost(item, progress.purchases, lab)) return 'unaffordable'
  return 'available'
}

function calculateEffects(purchases: Purchases, legacyRange: boolean) {
  const generator: GeneratorOptions = {
    wide: false, vast: false, arithmetic: false, nesting: false, anomaly: 0, specialization: specializationOf(purchases),
  }
  const generatorTuning: Partial<Record<AdvancedFamily, FamilyParameters>> = {}
  let basis = 10_000n
  const families = [...initialFamilies]
  const features = new Set<Feature>()
  const properties = new Set<PropertyId>()
  const badgeEP: Partial<Record<BadgeId, bigint>> = {}
  const pairs: { badges: [BadgeId, BadgeId]; amount: bigint }[] = []
  const rebates = new Map<number, number>()
  const capacities = { recent: 90, rarest: 12, highest: 12, largest: 12 }
  const sourceEP: Record<string, bigint> = {}
  const terminal = Array<number>(10).fill(0)
  const familyEP: Partial<Record<BadgeFamily, bigint>> = {}
  for (const [id, rank] of Object.entries(purchases)) {
    const item = researchById.get(id)
    if (!item || !rank) continue
    for (const effect of item.effects) {
      switch (effect.kind) {
        case 'luck': terminal[effect.digit] += effect.amount * rank; break
        case 'range': generator.expansionDigits = Math.max(generator.expansionDigits ?? 7, effect.digits); break
        case 'capacity': capacities[effect.record] += effect.amount * rank; break
        case 'feature': features.add(effect.id); break
        case 'property': properties.add(effect.id); break
        case 'badgeEP': badgeEP[effect.id] = (badgeEP[effect.id] ?? 0n) + BigInt(effect.amount * rank); break
        case 'sourceEP': sourceEP[effect.source] = (sourceEP[effect.source] ?? 0n) + BigInt(effect.amount * rank); break
        case 'pair': pairs.push({ badges: effect.badges, amount: BigInt(effect.amount * rank) }); break
        case 'discount': {
          const key = effect.discipline ?? -1
          rebates.set(key, (rebates.get(key) ?? 0) + effect.amount * rank)
          break
        }
        case 'ep': basis += BigInt(effect.basis * rank); break
        case 'familyEP': familyEP[effect.family] = (familyEP[effect.family] ?? 0n) + BigInt(effect.amount * rank); break
        case 'family': if (!families.includes(effect.family)) families.push(effect.family); break
        case 'generator': {
          generator.advanced ??= {}
          if (!effect.tuning) {
            generator.advanced[effect.family] = { ...familyDefaults[effect.family] }
            break
          }
          const delta = generatorTuning[effect.family] ??= { weight: 0, operandMax: 0, complexity: 0, digitBias: 0 }
          for (const key of Object.keys(effect.tuning) as (keyof FamilyParameters)[]) delta[key] += effect.tuning[key]! * rank
          break
        }
        case 'anomaly': generator.anomaly += effect.amount * rank; break
        case 'unlock': generator[effect.feature] = true; break
      }
    }
  }
  for (const [id, delta] of Object.entries(generatorTuning)) {
    const params = generator.advanced?.[id as AdvancedFamily]
    if (!params) continue
    for (const key of Object.keys(delta) as (keyof FamilyParameters)[]) params[key] += delta[key]
  }
  if (legacyRange && generator.wide) delete generator.expansionDigits
  if (terminal.some(Boolean)) generator.terminal = terminal
  return { generator, basis, families, familyEP, badgeEP, pairs, rebates, capacities, features, properties, sourceEP }
}

const cachedEffects = new WeakMap<Purchases, [ReturnType<typeof calculateEffects>?, ReturnType<typeof calculateEffects>?]>()
export function effectsOf(purchases: Purchases, legacyRange = false) {
  let cached = cachedEffects.get(purchases)
  if (!cached) {
    cached = []
    cachedEffects.set(purchases, cached)
  }
  const slot = legacyRange ? 1 : 0
  return cached[slot] ??= calculateEffects(purchases, legacyRange)
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

validateResearch(research)
for (const item of research) {
  if (!researchRoute(item.id).has(startingStudy)) throw new Error('Research must connect to the starting study: ' + item.id)
}
