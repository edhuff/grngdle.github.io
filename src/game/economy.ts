import { badgeReference, badgeRule, evaluateAttributes, rewardFor, type Badge } from './attributes'
import { distribution, type Source } from './generator'
import { compareProbability, fraction, type EventOdds, type Expression } from './math'
import { effectsOf, type Purchases } from './research'

export function rarityEvent(source: Source, badges: Badge[], fallback: EventOdds, terminal?: readonly number[]): EventOdds {
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

export function rewards(expression: Expression, purchases: Purchases, effects = effectsOf(purchases), source?: Source) {
  const legacyShape = source === 'arithmetic' || source === 'nested' ||
    (source === undefined && (expression.kind === 'add' || expression.kind === 'multiply'))
  const badges: Badge[] = evaluateAttributes(expression, effects.families, true, legacyShape, effects.properties)
  const { bands, total } = expression.kind === 'integer' ? { bands: [], total: 1n } : distribution(effects.generator)
  const nestedWeight = bands.find(band => band.id === 'nested')?.weight ?? 0n
  const arithmeticWeight = bands.find(band => band.id === 'arithmetic')?.weight ?? 0n
  for (const badge of badges) {
    const family = badgeRule(badge.id).family
    if (legacyShape && family !== 'structure') {
      // Value annotations are shown without changing legacy arithmetic payouts.
      badge.reward = 0n
      continue
    }
    if (legacyShape && (badge.id === 'addition' || badge.id === 'product' || badge.id === 'nested')) {
      const occurrence = badge.id === 'nested'
        ? fraction(nestedWeight, total)
        : fraction(nestedWeight + arithmeticWeight, 2n * total)
      badge.reward = rewardFor(badge.id, badge.level, occurrence)
    }
    badge.reward += (effects.familyEP[family] ?? 0n) + (effects.badgeEP[badge.id] ?? 0n)
  }
  const subtotal = badges.reduce((sum, badge) => sum + badge.reward, 0n)
  const matched = new Set(badges.filter(badge => badge.reward > 0n).map(badge => badge.id))
  const synergy = effects.pairs.reduce((amount, pair) => pair.badges.every(id => matched.has(id)) ? amount + pair.amount : amount, 0n)
  const bonus = subtotal * (effects.basis - 10_000n) / 10_000n + synergy + (source ? effects.sourceEP[source] ?? 0n : 0n)
  return { badges, bonus, earned: subtotal + bonus }
}
