import { badgeReference, badgeRule, evaluateAttributes, rewardFor, type Badge, type BadgeId } from './attributes'
import { distribution, type Source } from './generator'
import { compareProbability, fraction, type EventOdds, type Expression } from './math'
import { effectsOf, type Purchases } from './research'

export function rollEvent(source: Source, badges: Badge[], fallback: EventOdds, terminal?: readonly number[]): EventOdds {
  if (source !== 'classical') return fallback
  let rarest: EventOdds | undefined
  for (const badge of badges) {
    const probability = badgeReference(badge.id, terminal)
    if (probability && (!rarest || compareProbability(probability, rarest.probability) < 0)) {
      rarest = { label: badgeRule(badge.id).name, scope: 'Classical integers', probability }
    }
  }
  return rarest ?? fallback
}

export type RewardEffects = ReturnType<typeof effectsOf>

export function badgePayout(id: BadgeId, base: bigint, effects: RewardEffects) {
  return base + (effects.familyEP[badgeRule(id).family] ?? 0n) + (effects.badgeEP[id] ?? 0n)
}

export function rollBonus(subtotal: bigint, synergy: bigint, source: Source | undefined, effects: RewardEffects) {
  return subtotal * (effects.basis - 10_000n) / 10_000n + synergy + (source ? effects.sourceEP[source] ?? 0n : 0n)
}

const legacyOdds = new WeakMap<RewardEffects, { root: ReturnType<typeof fraction>; nested: ReturnType<typeof fraction> }>()
function arithmeticBadgeOdds(effects: RewardEffects) {
  const cached = legacyOdds.get(effects)
  if (cached) return cached
  const { bands, total } = distribution(effects.generator)
  const nested = bands.find(band => band.id === 'nested')?.weight ?? 0n
  const arithmetic = bands.find(band => band.id === 'arithmetic')?.weight ?? 0n
  const odds = { root: fraction(nested + arithmetic, 2n * total), nested: fraction(nested, total) }
  legacyOdds.set(effects, odds)
  return odds
}

export function evaluateRewards(expression: Expression, effects: RewardEffects, source?: Source) {
  const legacyShape = source === 'arithmetic' || source === 'nested' ||
    (source === undefined && (expression.kind === 'add' || expression.kind === 'multiply'))
  const badges: Badge[] = evaluateAttributes(expression, effects.families, true, legacyShape, effects.properties)
  const odds = legacyShape ? arithmeticBadgeOdds(effects) : undefined
  for (const badge of badges) {
    const family = badgeRule(badge.id).family
    if (legacyShape && family !== 'structure') {
      // Value annotations are shown without changing legacy arithmetic payouts.
      badge.reward = 0n
      continue
    }
    if (odds && (badge.id === 'addition' || badge.id === 'product' || badge.id === 'nested')) {
      const occurrence = badge.id === 'nested' ? odds.nested : odds.root
      badge.reward = rewardFor(badge.id, badge.level, occurrence)
    }
    badge.reward = badgePayout(badge.id, badge.reward, effects)
  }
  const subtotal = badges.reduce((sum, badge) => sum + badge.reward, 0n)
  const matched = new Set(badges.filter(badge => badge.reward > 0n).map(badge => badge.id))
  const synergy = effects.pairs.reduce((amount, pair) => pair.badges.every(id => matched.has(id)) ? amount + pair.amount : amount, 0n)
  const bonus = rollBonus(subtotal, synergy, source, effects)
  return { badges, bonus, earned: subtotal + bonus }
}

export function rewards(expression: Expression, purchases: Purchases, effects = effectsOf(purchases), source?: Source) {
  return evaluateRewards(expression, effects, source)
}
