import assert from 'node:assert/strict'
import test from 'node:test'
import { badgeIds, badgeRule, evaluateAttributes, initialFamilies, isPrime } from '../src/game/attributes'
import { rewards } from '../src/game/economy'
import { manualRoll, newGame, progress, purchase, refund } from '../src/game/game'
import { CLASSICAL_MAX, DISTRIBUTION_TOTAL, EXPANDED_MAX, VAST_MAX, generate, generatorBands, seededWords, uniformBelow } from '../src/game/generator'
import { depth, fraction, integer, magnitude, notation, rarityOf } from '../src/game/math'
import { milestones } from '../src/game/progression'
import { classicalRoute, dependencies, effectsOf, meets, rankCost, research, researchById, researchRoute, researchStatus, startingStudy, validateResearch, type ResearchNode } from '../src/game/research'
import { exportSave, importSave } from '../src/game/save'

test('classical generator includes both endpoints and rejects biased overflow draws', () => {
  const options = effectsOf({}).generator
  assert.deepEqual(generatorBands(options), [{ id: 'classical', weight: 100n, outcomes: 1_000_001n }])
  assert.deepEqual(generate(options, () => 0).expression, integer(0n))
  const words = [1_048_575, 1_000_000]
  const roll = generate(options, () => words.shift()!)
  assert.deepEqual(roll.expression, integer(CLASSICAL_MAX))
  assert.deepEqual(roll.probability, { numerator: 1n, denominator: 1_000_001n })
  assert.equal(rarityOf(roll.probability).name, 'Common')
  assert.equal(words.length, 0)
})

test('seeded uniform generation fits equal-width bins', () => {
  const word = seededWords(65_535)
  const bins = Array<number>(10).fill(0)
  const samples = 200_000
  for (let i = 0; i < samples; i++) bins[Number(uniformBelow(1_000_001n, word) / 100_001n)]++
  const expected = samples / bins.length
  const chiSquared = bins.reduce((sum, observed) => sum + (observed - expected) ** 2 / expected, 0)
  assert(chiSquared < 25, 'Chi-squared = ' + chiSquared)
})

test('attributes follow established integer and structural properties', () => {
  const badges = (value: bigint, families = initialFamilies) => evaluateAttributes(integer(value), families).map(item => item.id)
  assert.deepEqual(badges(0n), ['even', 'three', 'five', 'seven', 'fibonacci'])
  assert.deepEqual(badges(13n), ['odd', 'prime', 'fibonacci'])
  assert(badges(314159n).includes('constant'))
  assert(badges(12321n).includes('palindrome') && badges(12321n).includes('consecutive'))
  assert(badges(11111n).includes('uniform') && badges(11111n).includes('repeat'))
  assert(!badges(1212n).includes('rhythm'))
  assert(badges(1212n, [...initialFamilies, 'rhythm']).includes('rhythm'))
  assert(!badges(121n).includes('square'))
  assert(badges(121n, [...initialFamilies, 'powers']).includes('square'))
  assert.equal(isPrime(1n), false)
  assert.equal(isPrime(1_000_000_007n), true)
  assert.equal(isPrime(3_215_031_751n), false)
  assert.equal(isPrime(2n ** 64n + 1n), null)
  const expression = { kind: 'add', left: { kind: 'multiply', left: integer(5n), right: integer(6n) }, right: integer(7n) } as const
  const structural = evaluateAttributes(expression, initialFamilies)
  assert.deepEqual(structural.map(({ id, level }) => [id, level]), [['addition', undefined], ['nested', 2]])
  assert.equal(depth(expression), 2)
  assert.equal(magnitude(expression), 37n)
  assert.equal(notation(expression), '(5 × 6) + 7')
})

test('classical badge reference frequencies match exhaustive evaluation', () => {
  const totals = new Map(badgeIds.map(id => [id, 0]))
  const families = [...initialFamilies, 'rhythm', 'powers'] as const
  for (let value = 0n; value <= CLASSICAL_MAX; value++) {
    for (const badge of evaluateAttributes(integer(value), families)) totals.set(badge.id, totals.get(badge.id)! + 1)
  }
  for (const [id, total] of totals) assert.equal(total, badgeRule(id).count ?? 0, id)
})

test('one manual invocation records one roll and credits exactly the badge and research total', () => {
  const initial = newGame()
  let calls = 0
  const rolled = manualRoll(initial, () => { calls++; return 13 })
  assert.equal(calls, 1)
  assert.equal(initial.rolls, 0)
  assert.equal(rolled.rolls, 1)
  assert.equal(rolled.recent.length, 1)
  assert.equal(rolled.balance, 13n)
  assert.equal(rolled.lifetime, rolled.recent[0].earned)
  assert.equal(rolled.distribution.Common, 1)
  assert.equal(rolled.discoveries.prime, 1)
  const bonus = rewards(integer(13n), { yield: 1, compound: 1 })
  assert.equal(bonus.earned, 15n)
  assert.equal(bonus.bonus, 1n)
})

test('research purchases charge once per rank and preserve earned EP', () => {
  const empty = newGame()
  assert.equal(purchase(empty, 'yield'), empty)
  const testState = { ...empty, balance: 2n ** 100n, lifetime: 2n ** 100n }
  assert.equal(purchase(testState, 'compound'), testState)
  let game = purchase(testState, 'yield')
  assert.equal(game.balance, testState.balance - 6n)
  assert.equal(purchase(game, 'yield'), game)
  game = purchase(purchase(game, 'compound'), 'compound')
  assert.equal(game.purchases.compound, 2)
  assert.equal(game.balance, testState.balance - 6n - 42n - 84n)
  assert.equal(game.lifetime, testState.lifetime)
})

test('research validates cycles, missing nodes, AND and OR prerequisites', () => {
  validateResearch(research)
  const [root] = research
  const missing: ResearchNode = { ...root, requires: { kind: 'node', id: 'fake' } }
  assert.throws(() => validateResearch([missing]), /Invalid research node/)
  assert.throws(() => validateResearch([{ ...root, requires: { kind: 'node', id: root.id } }]), /Cyclic/)
  assert.throws(() => validateResearch([root, root]), /Duplicate/)
  const syntax = researchById.get('syntax')!
  assert(!meets(syntax.requires, { purchases: { operators: 1 }, families: 0 }))
  assert(meets(syntax.requires, { purchases: { operators: 1, symmetry: 1 }, families: 0 }))
  const grammar = researchById.get('arithmetic')!
  assert(!meets(grammar.requires, { purchases: { expansion: 1 }, families: 0 }))
  assert(meets(grammar.requires, { purchases: { anomaly: 1 }, families: 0 }))
  for (const choice of ['magnitude-focus', 'rarity-focus', 'efficiency-focus']) {
    assert(meets(grammar.requires, { purchases: { [choice]: 1 }, families: 0 }))
  }
})

test('research has one root and every study feeds a major milestone', () => {
  assert.deepEqual(research.filter(item => !dependencies(item.requires).length).map(item => item.id), [startingStudy])
  const routes = milestones.map(researchRoute)
  for (const item of research) {
    assert(researchRoute(item.id).has(startingStudy), item.id)
    assert(routes.some(route => route.has(item.id)), item.id)
  }
  for (const id of ['journal', 'archive', 'inspection', 'registry']) assert(!researchById.has(id))
})

test('milestones unlock at their EP cost and prerequisites regardless of roll count', () => {
  const route = classicalRoute()
  assert(route.size >= 30)
  let state = {
    ...newGame(), rolls: 1,
    purchases: Object.fromEntries([...route].filter(id => id !== 'expansion').map(id => [id, 1])),
    discoveries: { parity: 1, divisibility: 1, digits: 1, prime: 1, sequence: 1 },
  }
  for (const id of milestones) {
    const item = researchById.get(id)!
    const price = rankCost(item, 0)
    assert.equal(researchStatus(item, progress(newGame()), price), 'locked')
    if (id === 'arithmetic') {
      assert.equal(researchStatus(item, progress(state), price), 'locked')
      state = { ...state, purchases: { ...state.purchases, anomaly: 1 } }
    }
    assert.equal(researchStatus(item, progress(state), price - 1n), 'unaffordable')
    const purchased = purchase({ ...state, balance: price }, id)
    assert.equal(purchased.purchases[id], 1)
    assert.equal(purchased.balance, 0n)
    assert.equal(purchased.rolls, 1)
    state = { ...state, purchases: purchased.purchases }
  }
})

test('specializations can be refunded after unlocking a permanent milestone', () => {
  const purchases = Object.fromEntries([...classicalRoute()].map(id => [id, 1]))
  const state = {
    ...newGame(), balance: 50_000n, rolls: 15_000, purchases,
    discoveries: { parity: 41, divisibility: 23, digits: 19, prime: 7, sequence: 2, mirror: 1 },
  }
  const specialized = purchase(state, 'magnitude-focus')
  assert.equal(specialized.balance, 48_200n)
  assert.equal(effectsOf(specialized.purchases).generator.specialization, 'magnitude')
  assert.equal(purchase(specialized, 'efficiency-focus'), specialized)
  assert.deepEqual(refund(specialized, 'magnitude-focus'), state)
  const learned = purchase(specialized, 'arithmetic')
  const returned = refund(learned, 'magnitude-focus')
  assert.equal(returned.balance, learned.balance + 1_800n)
  assert.deepEqual(returned.retainedResearch, ['arithmetic'])
  assert.equal(effectsOf(returned.purchases).generator.arithmetic, true)
  assert.equal(effectsOf(returned.purchases).generator.specialization, null)
  assert.equal(refund(returned, 'arithmetic'), returned)
})

test('unlocked generation bands retain the Classical range and have normalized exact probabilities', () => {
  const effect = effectsOf({ expansion: 1, arithmetic: 1, nesting: 1, vast: 1, anomaly: 5, 'tail-model': 1, 'magnitude-focus': 1 })
  const bands = generatorBands(effect.generator)
  assert.deepEqual(bands.map(band => band.id), ['classical', 'expanded', 'vast', 'arithmetic', 'nested'])
  let sum = 0n
  for (const band of bands) {
    const selector = sum
    let draws = 0
    const roll = generate(effect.generator, () => draws++ ? 0 : Number(selector))
    assert.equal(roll.source, band.id)
    assert.deepEqual(roll.probability, fraction(band.weight, DISTRIBUTION_TOTAL * band.outcomes))
    assert(band.weight > 0n)
    assert(band.outcomes > 0n)
    sum += band.weight
  }
  assert.equal(sum, DISTRIBUTION_TOTAL)
  const wide = generate(effectsOf({ expansion: 1 }).generator, (() => {
    const words = [78, 0, 0]
    return () => words.shift()!
  })())
  assert.deepEqual(wide.expression, integer(CLASSICAL_MAX + 1n))
  assert.equal(bands[2].outcomes, VAST_MAX - EXPANDED_MAX)
})

test('large integer sampling and AST notation avoid Number precision loss', () => {
  const large = 10n ** 24n
  const words = [0x7abc, 0xffff_ffff, 0xffff_ffff]
  const selected = uniformBelow(large + 1n, () => words.shift()!)
  assert(selected > BigInt(Number.MAX_SAFE_INTEGER) && selected <= large)
  assert.equal(notation(integer(large)), '1,000,000,000,000,000,000,000,000')
  const product = { kind: 'multiply', left: integer(large), right: integer(large) } as const
  assert.equal(magnitude(product), 10n ** 48n)
})

test('versioned saves round-trip records, validate purchases, and isolate development mode', () => {
  const word = seededWords(22)
  let game = newGame()
  for (let index = 0; index < 40; index++) game = manualRoll(game, word)
  game = purchase(game, 'yield')
  assert.equal(game.purchases.yield, 1)
  const saved = exportSave(game)
  assert.deepEqual(importSave(saved), game)
  assert.throws(() => importSave(saved, true), /different game mode/)
  assert.throws(() => importSave('{'), /JSON/)
  assert.throws(() => importSave(saved.replace('"schema":4', '"schema":55')), /unsupported/)
  assert.throws(() => importSave(saved.replace('"purchases":{', '"purchases":{"__proto__":1,')), /Malformed/)
  assert.throws(() => importSave(saved.replace(/"balance":"\d+"/, '"balance":"0"')), /Research spending/)
  const altered = JSON.parse(saved)
  altered.recent[0].probability = { numerator: '2', denominator: '1' }
  assert.throws(() => importSave(JSON.stringify(altered)), /Malformed/)
})

test('legacy saves keep research and history and receive a rebate on old prices', () => {
  const word = seededWords(22)
  let game = newGame()
  for (let index = 0; index < 360; index++) game = manualRoll(game, word)
  game = purchase(purchase(purchase(game, 'yield'), 'compound'), 'compound')
  assert.deepEqual(game.purchases, { yield: 1, compound: 2 })

  const oldYield = researchById.get('yield')!
  const oldCompound = researchById.get('compound')!
  const oldSpending = rankCost(oldYield, 0, false, oldYield.legacyCost) +
    rankCost(oldCompound, 0, false, oldCompound.legacyCost) + rankCost(oldCompound, 1, false, oldCompound.legacyCost)
  assert.equal(oldSpending, 660n)
  const legacy = JSON.parse(exportSave(game))
  legacy.schema = 2
  legacy.balance = String(game.lifetime - oldSpending)
  assert.deepEqual(importSave(JSON.stringify(legacy)), game)
  assert.equal(game.balance - BigInt(legacy.balance), 528n)

  legacy.schema = 1
  delete legacy.settings.showBadgeOdds
  assert.deepEqual(importSave(JSON.stringify(legacy)), game)
  legacy.balance = '1'
  assert.throws(() => importSave(JSON.stringify(legacy)), /Research spending/)
})

test('upgraded saves refund Discovery and retain historical studies with changed prerequisites', () => {
  let game = newGame()
  const word = seededWords(22)
  for (let index = 0; index < 700; index++) game = manualRoll(game, word)
  assert.equal(game.recent.length, 90)
  const raw = JSON.parse(exportSave(game))
  raw.schema = 3
  raw.purchases = { journal: 1, archive: 1, inspection: 1, registry: 1, catalog: 1, 'place-value': 1 }
  raw.balance = String(game.lifetime - 298n)
  const migrated = importSave(JSON.stringify(raw))
  assert.deepEqual(migrated.purchases, { catalog: 1, 'place-value': 1 })
  assert.deepEqual(migrated.retainedResearch, ['catalog', 'place-value'])
  assert.deepEqual(migrated.recent, game.recent)
  assert.equal(migrated.lifetime, game.lifetime)
  assert.equal(migrated.balance - BigInt(raw.balance), 283n)
  assert.deepEqual(importSave(exportSave(migrated)), migrated)

  raw.schema = 2
  raw.balance = String(game.lifetime - 1_490n)
  assert.deepEqual(importSave(JSON.stringify(raw)), migrated)
  raw.purchases.registry = 2
  assert.throws(() => importSave(JSON.stringify(raw)), /Malformed/)
})

test('lab progression can reach symbolic rolls and still credits EP strictly from individual actions', () => {
  const word = seededWords(234)
  let game = newGame(true)
  const route = classicalRoute()
  const targets = [...research.filter(item => route.has(item.id)),
    ...['efficiency-focus', 'arithmetic', 'nesting', 'vast'].map(id => researchById.get(id)!)]
  for (let index = 0; index < 480; index++) {
    game = manualRoll(game, word)
    for (const item of targets) {
      if (researchStatus(item, progress(game), game.balance, game.lab) === 'available') game = purchase(game, item.id)
    }
  }
  assert.equal(game.rolls, 480)
  assert.equal(game.purchases.nesting, 1)
  assert.equal(game.purchases.vast, 1)
  assert(game.recent.some(roll => roll.expression.kind !== 'integer') || game.rarest.some(roll => roll.expression.kind !== 'integer'))
  assert.equal(game.recent.length, 90)
  assert.deepEqual(importSave(exportSave(game), true), game)
  const refunded = refund(game, 'efficiency-focus')
  assert.deepEqual(refunded.retainedResearch, ['arithmetic'])
  assert.deepEqual(importSave(exportSave(refunded), true), refunded)
})
