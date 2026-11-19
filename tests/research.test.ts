import assert from 'node:assert/strict'
import { test } from 'node:test'
import { badgeReference, evaluateAttributes, initialFamilies } from '../src/game/attributes'
import { manualRoll, newGame, progress, purchase, refund, toggleBookmark } from '../src/game/game'
import { replay, seededWords } from '../src/game/generator'
import { inspectInteger } from '../src/game/inspection'
import { integer } from '../src/game/math'
import { addProbability, fraction, multiplyProbability } from '../src/game/math/probability'
import { classicalRoute, clusterProgress, dependencies, effectsOf, meets, purchaseCost, rankCost, research, researchById, researchRoute, researchStatus, revealedResearch, validateResearch } from '../src/game/research'
import { classicalClusters } from '../src/game/research/classical'
import { all, countOf, found, node } from '../src/game/research/requirements'
import { importSave, exportSave } from '../src/game/save'
import { atlases, buildAtlases, overlaps } from '../src/ui/research-layout'

test('all Classical clusters and doctrine investments have complete definitions', () => {
  const classical = research.filter(item => item.region === 0)
  assert.equal(classical.length, 140)
  assert.deepEqual(classicalClusters.map(name => classical.filter(item => item.cluster === name).length), [24, 24, 22, 18, 18, 16, 18])
  assert.equal(new Set(research.map(item => item.title)).size, research.length)
  assert.equal(new Set(research.map(item => item.id)).size, research.length)
  assert(research.every(item => item.effects.length > 0 && item.description && item.cost > 0n && item.type))
  assert(atlases.every(atlas => atlas.items.length > 0 && atlas.items.length === atlas.positions.size))
  for (const choice of ['magnitude', 'rarity', 'efficiency']) assert.equal(research.filter(item => item.doctrine === choice).length, 20)
  assert(classicalRoute().size >= 30 && classicalRoute().size <= 51)
  validateResearch(research)
})

test('research fog reveals purchased studies and only their immediate successors in open eras', () => {
  assert.deepEqual([...revealedResearch({})], ['yield'])
  const opening = revealedResearch({ yield: 1 })
  assert(opening.has('place-value') && opening.has('compound'))
  assert(!opening.has('repetition'))
  const frontier = revealedResearch({ yield: 1, operators: 1, 'classical-bounds': 1 })
  assert(frontier.has('operators') && frontier.has('syntax'))
  assert(!frontier.has('symmetry') && !frontier.has('grammar'))
  assert(!frontier.has('twelve-digit-frontier'))
  const expanded = revealedResearch({ yield: 1, expansion: 1, 'classical-bounds': 1 })
  assert(expanded.has('expansion') && expanded.has('anomaly') && expanded.has('twelve-digit-frontier'))
  assert(!expanded.has('arithmetic'))
})

test('every Classical study and repeatable rank can be earned through manual rolls', () => {
  const targets = research.filter(item => item.region === 0 && item.id !== 'expansion')
  const probes = [121212, 12321, 55, 1212]
  let game = newGame(true)
  for (let i = 0; i < 500 && targets.some(item => (game.purchases[item.id] ?? 0) < (item.max ?? 1)); i++) {
    game = manualRoll(game, () => probes[i % probes.length])
    for (const item of targets) game = purchase(game, item.id)
  }
  game = purchase(game, 'expansion')
  for (const item of research.filter(item => item.region === 0)) assert.equal(game.purchases[item.id], item.max ?? 1, item.id)
  assert(clusterProgress(game.purchases).filter(cluster => cluster.region === 0).every(cluster => cluster.mastered === cluster.total))
  assert.deepEqual(importSave(exportSave(game), true), game)
})

test('prerequisite validation rejects conflicting doctrines and undiscoverable badges', () => {
  const root = researchById.get('yield')!
  const magnitude = { ...researchById.get('magnitude-focus')!, requires: node('yield') }
  const rarity = { ...researchById.get('rarity-focus')!, requires: node('yield') }
  const optional = { ...researchById.get('patronage')!, requires: all(node(magnitude.id), node(rarity.id)) }
  assert.throws(() => validateResearch([root, magnitude, rarity, optional]), /Unreachable/)
  assert.throws(() => validateResearch([root, { ...optional, requires: all(node('yield'), found('perfect')) }]), /Unreachable/)
  assert.throws(() => validateResearch([root, { ...optional, requires: countOf(2, 'yield') }]), /Invalid research prerequisite/)
  assert.throws(() => validateResearch([root, { ...optional, requires: countOf(2, 'yield', 'yield') }]), /Invalid research prerequisite/)
  assert.doesNotThrow(() => validateResearch([root, magnitude, rarity, { ...optional, requires: countOf(1, magnitude.id, rarity.id) }]))
  const unavailable = { ...optional, unavailable: 'Missing notation' }
  assert.equal(researchStatus(unavailable, { purchases: {}, families: 0 }, 10n ** 20n), 'unsupported')
})

test('either Classical review route can complete synthesis with real study dependencies', () => {
  const gate = researchById.get('classical-synthesis')!
  const owned = Object.fromEntries([...researchRoute(gate.id)].map(id => [id, 1]))
  const state = { families: 7, purchases: { ...owned, 'classical-bounds': 0, 'distribution-audit': 0 } }
  assert(!meets(gate.requires, state))
  for (const id of ['classical-bounds', 'distribution-audit']) {
    assert(meets(gate.requires, { ...state, purchases: { ...state.purchases, [id]: 1 } }))
  }
  const distribution = effectsOf({ expansion: 1 }).generator
  assert.deepEqual(replay(distribution, 'expanded', 0n).expression, integer(1_000_001n))
  assert.deepEqual(replay(distribution, 'expanded', 8_999_999n).expression, integer(10_000_000n))
  assert.throws(() => replay(distribution, 'expanded', 9_000_000n), /ticket/)
  assert.throws(() => replay(effectsOf({}).generator, 'expanded', 0n), /not enabled/)
})

test('weighted terminal draws sum all aliases and yield exact conditional badge odds', () => {
  const state = effectsOf({ 'decimal-zero-luck': 1, 'decimal-seven-luck': 1 }).generator
  const odds = (ticket: bigint) => replay(state, 'classical', ticket).probability
  assert.deepEqual(odds(0n), odds(16n * 1_000_001n))
  assert.deepEqual(replay(state, 'classical', 16n * 1_000_001n).expression, integer(0n))
  const sum = Array.from({ length: 10 }, (_, i) => multiplyProbability(odds(BigInt(i)), fraction(i ? 100_000n : 100_001n, 1n)))
    .reduce(addProbability, fraction(0n, 1n))
  assert.deepEqual(sum, fraction(1n, 1n))
  assert.deepEqual(badgeReference('even', state.terminal), fraction(8_200_018n, 16_500_018n))
  const rolled = manualRoll({ ...newGame(), purchases: { 'decimal-zero-luck': 1 } }, () => 1001)
  const rarity = rolled.recent[0].generation!.event
  assert.deepEqual(rarity.probability, badgeReference('palindrome', rolled.recent[0].generation!.configuration.terminal))
})

test('number theory and digit studies award only verified badges', () => {
  const effects = effectsOf({ 'fundamental-theorem': 1, 'squarefree-sieve': 1, 'amicable-pairs': 1, 'arithmetic-of-digits': 1, 'pair-recurrence': 1 })
  const badges = (value: bigint) => evaluateAttributes(integer(value), initialFamilies, true, false, effects.properties).map(entry => entry.id)
  assert(badges(220n).includes('amicable'))
  assert(badges(30n).includes('sphenic') && badges(30n).includes('squareFree'))
  assert(!badges(60n).includes('squareFree'))
  assert(!badges(10_000_030n).includes('squareFree'))
  assert(!badges(220n).includes('polydigit'))
  assert(badges(128n).includes('polydigit'))
  assert(badges(1212n).includes('repeatedPair') && !badges(111n).includes('repeatedPair'))
  assert(!evaluateAttributes(integer(220n), initialFamilies).some(badge => badge.id === 'amicable'))
  assert.deepEqual(inspectInteger(360n, new Set(['factorization', 'divisor-count', 'divisor-sum'])),
    [['Prime factors', '2^3 × 3^2 × 5'], ['Positive divisors', '24'], ['Proper-divisor sum', '810']])
})

test('discovery challenges track actual manual rolls and enlarge archives after research', () => {
  const word = seededWords(22)
  let game = newGame(true)
  for (let i = 0; i < 110; i++) {
    game = manualRoll(game, word)
    for (const id of ['yield', 'discovery-ledger', 'rolling-register']) game = purchase(game, id)
  }
  assert.equal(game.recent.length, 105)
  assert.equal(game.sourceCounts.classical, game.rolls)
  const initial = game.observations.repeatedPair
  assert.equal(initial, undefined)
  for (const id of ['place-value', 'repetition', 'motifs', 'pair-recurrence']) {
    assert(Object.keys(game.purchases).length)
    game = purchase(game, id)
  }
  const challenge = researchById.get('repeated-motifs-proof')!
  assert(!meets(challenge.requires, progress(game), true))
  game = manualRoll(game, () => 1212)
  assert.equal(game.observations.repeatedPair?.first, 111)
  assert(meets(challenge.requires, progress(game), true))
  game = purchase(game, challenge.id)
  assert.equal(game.purchases[challenge.id], 1)
  assert.equal(game.rolls, 111)
  assert.deepEqual(importSave(exportSave(game), true), game)
})

test('discounts debit and refund actual prices, permanent purchases and observations survive a doctrine respec', () => {
  const starting = Object.fromEntries([...classicalRoute()].map(id => [id, 1]))
  let game = manualRoll({ ...newGame(), purchases: starting, balance: 50_000n, lifetime: 50_000n }, () => 0)
  for (const id of ['efficiency-focus', 'economy-lab-doctrine']) game = purchase(game, id)
  assert.equal(purchase(game, 'magnitude-focus'), game)
  const item = researchById.get('eight-digit-integers')!
  const paid = purchaseCost(item, game.purchases)
  assert.equal(paid, rankCost(item, 0) * 9n / 10n)
  game = purchase(game, item.id)
  assert.deepEqual(game.payments[item.id], [paid])
  game = toggleBookmark(game, item.id)
  const refunded = refund(game, 'efficiency-focus')
  assert.equal(refunded.purchases[item.id], 1)
  assert.equal(refunded.purchases['efficiency-focus'], undefined)
  assert.equal(refunded.purchases['economy-lab-doctrine'], undefined)
  assert.equal(refunded.balance - game.balance, 9000n)
  assert.deepEqual(refunded.observations, game.observations)
  assert.deepEqual(refunded.recent, game.recent)
  assert.deepEqual(refunded.bookmarks, [item.id])
  assert.equal(refund(refunded, 'efficiency-focus'), refunded)
})

test('schema 5 preserves an old gateway, original price, and range', () => {
  const ids = [...new Set([...researchRoute('synthesis'), ...researchRoute('classical-review'), 'expansion'])]
  const word = seededWords(10)
  let classical = newGame(true)
  for (let i = 0; i < 60; i++) classical = manualRoll(classical, word)
  const saved = JSON.parse(exportSave(classical))
  saved.schema = 5
  saved.purchases = Object.fromEntries(ids.map(id => [id, 1]))
  saved.balance = String(classical.lifetime - ids.reduce((sum, id) => {
    const item = researchById.get(id)!
    return sum + rankCost(item, 0, true, item.previousCost ?? item.cost)
  }, 0n))
  const migrated = importSave(JSON.stringify(saved), true)
  assert(migrated.legacyRange && migrated.retainedResearch.includes('expansion'))
  assert.equal(migrated.balance.toString(), saved.balance)
  assert.equal(effectsOf(migrated.purchases, migrated.legacyRange).generator.expansionDigits, undefined)
  assert.deepEqual(importSave(exportSave(migrated), true), migrated)
})

test('atlas positions and viewport culling handle a 1,400-study fixture', () => {
  const extraCount = 1400 - research.length
  const anchor = researchById.get('busy-state-frontier')!
  const suffixes = Array.from({ length: extraCount }, (_, index) => index.toString(26).replace(/[0-9a-p]/g, letter =>
    String.fromCharCode(97 + parseInt(letter, 26))))
  const synthetic = suffixes.map((suffix, index) => ({ ...anchor, id: 'fixture-' + suffix,
    title: 'Fixture study ' + suffix, cluster: 'Fixture cluster ' + Math.floor(index / 60),
    requires: node(index % 20 ? 'fixture-' + suffixes[index - 1] : anchor.id),
  }))
  const start = performance.now()
  const layout = buildAtlases([...research, ...synthetic])
  const last = layout[7]
  assert.equal(layout.reduce((sum, era) => sum + era.positions.size, 0), 1400)
  const visible = [...last.positions.values()].filter(point => overlaps(
    { left: point.x - 89, right: point.x + 89, top: point.y - 31, bottom: point.y + 31 },
    { left: 0, right: 1440, top: 0, bottom: 900 },
  ))
  assert(visible.length < 140)
  assert(performance.now() - start < 2000)
  for (const era of atlases) for (const study of era.items) for (const id of dependencies(study.requires)) {
    const prerequisite = era.positions.get(id)
    if (prerequisite) assert(prerequisite.y < era.positions.get(study.id)!.y)
  }
})
