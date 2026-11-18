import { badgeRule, evaluateAttributes, rewardFor, type Badge } from './attributes'
import { DISTRIBUTION_TOTAL, generatorBands } from './generator'
import { fraction, type Expression } from './math'
import { effectsOf, type Purchases } from './research'

export function rewards(expression: Expression, purchases: Purchases, effects = effectsOf(purchases)) {
  const badges: Badge[] = evaluateAttributes(expression, effects.families)
  const bands = expression.kind === 'integer' ? [] : generatorBands(effects.generator)
  const nestedWeight = bands.find(band => band.id === 'nested')?.weight ?? 0n
  const arithmeticWeight = bands.find(band => band.id === 'arithmetic')?.weight ?? 0n
  for (const badge of badges) {
    const family = badgeRule(badge.id).family
    if (family === 'structure') {
      const occurrence = badge.id === 'nested'
        ? fraction(nestedWeight, DISTRIBUTION_TOTAL)
        : fraction(nestedWeight + arithmeticWeight, 2n * DISTRIBUTION_TOTAL)
      badge.reward = rewardFor(badge.id, badge.level, occurrence)
    }
    badge.reward += effects.familyEP[family] ?? 0n
  }
  const subtotal = badges.reduce((sum, badge) => sum + badge.reward, 0n)
  const bonus = subtotal * (effects.basis - 10_000n) / 10_000n
  return { badges, bonus, earned: subtotal + bonus }
}
