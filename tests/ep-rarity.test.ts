import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evaluateRewards } from '../src/game/economy'
import { buildPayoutProfile, epOdds } from '../src/game/ep-rarity'
import { manualRoll, newGame, rollRarity } from '../src/game/game'
import { distribution } from '../src/game/generator'
import { addProbability, compareProbability, epRarity, fraction, multiplyProbability, rarities } from '../src/game/math'
import { effectsOf } from '../src/game/research'
import { exportSave, importSave } from '../src/game/save'

test('higher payouts never rank below lower payouts in the same researched pool', () => {
  const game = { ...newGame(), purchases: {
    yield: 1, compound: 2, 'place-value': 1, catalog: 1, 'decimal-zero-luck': 1, 'fundamental-theorem': 1,
  } }
  const medium = manualRoll(game, () => 21).recent[0]
  const high = manualRoll(game, () => 2).recent[0]
  assert.equal(medium.earned, 16n)
  assert.equal(high.earned, 18n)
  assert.deepEqual(medium.epOdds, { method: 'exact', probability: fraction(186n, 900_001n) })
  assert.deepEqual(high.epOdds, { method: 'exact', probability: fraction(163n, 2_700_003n) })
  assert.equal(rollRarity(medium)?.name, 'Epic')
  assert.equal(rollRarity(high)?.name, 'Legendary')
  let previous = fraction(1n, 1n)
  for (let payout = 0n; payout <= 100n; payout++) {
    const { probability } = epOdds(payout, effectsOf(game.purchases))
    assert(compareProbability(probability, previous) <= 0)
    previous = probability
  }
})

test('equal payouts share rarity odds even when they have different badges and draw weights', () => {
  const game = { ...newGame(), purchases: { 'decimal-zero-luck': 1 } }
  const even = manualRoll(game, () => 40).recent[0]
  const odd = manualRoll(game, () => 9).recent[0]
  assert.equal(even.earned, odd.earned)
  assert.notDeepEqual(even.probability, odd.probability)
  assert.notDeepEqual(even.badges, odd.badges)
  assert.deepEqual(even.epOdds, odd.epOdds)
})

test('EP odds combine exact generator payout distributions with their roll weights', () => {
  const effects = effectsOf({ arithmetic: 1, nesting: 1 })
  const { bands, total } = distribution(effects.generator)
  const threshold = 8n
  const classical = epOdds(threshold, effectsOf({})).probability
  let expected = multiplyProbability(classical, fraction(bands[0].weight, total))
  for (const band of bands.slice(1)) {
    const hits = [0n, 1n].filter(ticket => evaluateRewards(band.domain.at(ticket), effects, band.id).earned >= threshold).length
    expected = addProbability(expected, fraction(BigInt(hits) * band.weight, 2n * total))
  }
  assert.deepEqual(epOdds(threshold, effects), { method: 'exact', probability: expected })
})

test('large generator profiles are deterministic and their estimated tail stays monotone', () => {
  const purchases = { expansion: 1, anomaly: 2, 'exact-operations': 1, 'power-towers': 1 }
  const effects = effectsOf(purchases)
  const profile = buildPayoutProfile(effects)
  assert.deepEqual(profile, buildPayoutProfile(effectsOf({ ...purchases })))
  assert.equal(profile.method, 'estimated')
  assert.deepEqual(epOdds(0n, effects).probability, fraction(1n, 1n))
  let previous = fraction(1n, 1n)
  let tier = 0
  for (let payout = 1n; payout <= 120n; payout++) {
    const { probability } = epOdds(payout, effects)
    assert(compareProbability(probability, previous) <= 0)
    const next = rarities.indexOf(epRarity(probability))
    assert(next >= tier)
    previous = probability
    tier = next
  }
  assert(previous.numerator > 0n)
})

test('schema 6 keeps progress and old outcomes without assigning badge-based EP rarity', () => {
  const original = manualRoll(newGame(), () => 13)
  const old = JSON.parse(exportSave(original))
  old.schema = 6
  delete old.unratedRolls
  for (const category of ['recent', 'rarest', 'highest', 'largest']) delete old[category][0].epOdds
  const migrated = importSave(JSON.stringify(old))
  assert.equal(migrated.balance, original.balance)
  assert.equal(migrated.unratedRolls, 1)
  assert.equal(rollRarity(migrated.recent[0]), null)
  assert.equal(migrated.recent[0].earned, original.recent[0].earned)
  assert.equal(Object.values(migrated.distribution).reduce((sum, count) => sum + count, 0), 0)
  const next = manualRoll(migrated, () => 13)
  assert.equal(next.unratedRolls, 1)
  assert.equal(next.distribution.Legendary, 1)
  assert.equal(next.rarest[0].index, 2)
  assert.deepEqual(importSave(exportSave(next)), next)
  const altered = JSON.parse(exportSave(next))
  altered.recent[0].epOdds.probability.numerator = '0'
  assert.throws(() => importSave(JSON.stringify(altered)), /Malformed/)
})
