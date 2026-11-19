import assert from 'node:assert/strict'
import test from 'node:test'
import { badgeRule } from '../src/game/attributes'
import { analyze, compareExpressions, lowerBound } from '../src/game/math/analysis'
import { integer, type Expression } from '../src/game/math/ast'
import { evaluate, finiteFastGrowing, magnitude, simplify } from '../src/game/math/evaluate'
import { notation, ordinalText } from '../src/game/math/render'
import { addOrdinals, compareOrdinals, finiteOrdinal, fundamentalSequence, isCanonicalOrdinal, multiplyOrdinals, omegaPower } from '../src/game/math/ordinal'
import { addProbability, compareProbability, fraction } from '../src/game/math/probability'
import { advancedFamilies, familyDefaults, type GeneratorOptions } from '../src/game/generation/config'
import { advancedDomains } from '../src/game/generation/families'
import { equivalentOdds } from '../src/game/generation/odds'
import { distribution, generate, GENERATOR_VERSION, replay, seededWords } from '../src/game/generator'
import { manualRoll, newGame, purchase, rollRarity } from '../src/game/game'
import { effectsOf, research } from '../src/game/research'
import { exportSave, importSave } from '../src/game/save'

const power = (a: bigint, b: bigint): Expression => ({ kind: 'power', left: integer(a), right: integer(b) })
const hyper = (rank: bigint, base: bigint, height: bigint): Expression => ({ kind: 'hyper', rank, base, height })
const chain = (...terms: bigint[]): Expression => ({ kind: 'chain', terms: terms.map(integer) })
const base = effectsOf({}).generator
const full = effectsOf(Object.fromEntries(research.filter(item => !item.refundable || item.id === 'efficiency-focus')
  .map(item => [item.id, 1]))).generator

test('exact signed and rational arithmetic, factorials and giant-power refusal', () => {
  const difference = { kind: 'subtract', left: integer(2n), right: integer(5n) } as const
  const divide = { kind: 'divide', left: difference, right: integer(6n) } as const
  assert.equal(magnitude(difference), -3n)
  assert.deepEqual(evaluate(divide), { status: 'exact', value: { numerator: -1n, denominator: 2n } })
  assert.deepEqual(simplify(divide), { kind: 'divide', left: integer(-1n), right: integer(2n) })
  assert.equal(magnitude({ kind: 'factorial', operand: integer(50n) }), 30414093201713378043612608166064768844377641568960512000000000000n)
  assert.equal(magnitude({ kind: 'factorial', operand: integer(0n) }), 1n)
  assert.deepEqual(evaluate({ kind: 'divide', left: integer(1n), right: integer(0n) }), { status: 'unknown', reason: 'domain' })
  assert.equal(analyze(power(0n, 0n)).integer, 'unknown')
  assert.equal(analyze({ kind: 'factorial', operand: integer(-(10n ** 500n)) }).positive, 'unknown')
  assert.equal(magnitude(power(2n, 100n)), 2n ** 100n)
  assert.equal(evaluate(power(2n, 10n ** 120n)).status, 'unknown')
  assert.equal(notation(integer(10n ** 500n)), '…')
  let deep: Expression = integer(2n)
  for (let index = 0; index < 70; index++) deep = { kind: 'factorial', operand: deep }
  assert(notation(deep).includes('…'))
  assert.equal(analyze(deep).truncated, true)
})

test('towers are right-associated and finite hyperoperations match known identities', () => {
  const tower = { kind: 'tower', terms: [integer(2n), integer(3n), integer(2n)] } as const
  assert.equal(magnitude(tower), 512n)
  assert.equal(notation(tower), '2 ^ 3 ^ 2')
  assert.equal(magnitude(hyper(0n, 2n, 4n)), 5n)
  assert.equal(magnitude(hyper(1n, 2n, 4n)), 6n)
  assert.equal(magnitude(hyper(4n, 2n, 4n)), 65536n)
  assert.equal(magnitude(hyper(5n, 2n, 3n)), 65536n)
  assert.equal(magnitude(hyper(6n, 2n, 2n)), 4n)
  const arrow = { kind: 'arrow', rank: 10n ** 100n, base: 2n, height: 2n } as const
  assert.equal(magnitude(arrow), 4n)
  assert.match(notation(arrow), /^2 ↑\^\{1000/)
  const huge = hyper(5n, 3n, 6n)
  assert.equal(evaluate(huge).status, 'unknown')
  assert.equal(compareExpressions(huge, integer(2n ** 900n)), 'greater')
  assert.equal(compareExpressions(huge, hyper(6n, 3n, 6n)), 'unknown')
})

test('Conway chain recurrence, truncation, and nesting', () => {
  assert.equal(magnitude(chain(3n, 3n, 1n, 9n)), 27n)
  assert.equal(magnitude(chain(3n, 1n, 9n)), 3n)
  assert.equal(magnitude(chain(2n, 2n, 3n)), 4n)
  assert.equal(magnitude(chain(2n, 3n, 2n)), 16n)
  assert.equal(magnitude({ kind: 'chain', terms: [chain(2n, 2n), integer(2n)] }), 16n)
  assert.equal(notation({ kind: 'chain', terms: [chain(2n, 2n), integer(2n)] }), '(2 → 2) → 2')
  assert.equal(evaluate(chain(4n, 4n, 4n, 4n, 4n)).status, 'unknown')
})

test('canonical ordinal arithmetic, limits and fast-growing functions', () => {
  const one = finiteOrdinal(1n)
  const omega = omegaPower(one)
  const omegaSquared = omegaPower(finiteOrdinal(2n))
  assert.equal(compareOrdinals(addOrdinals(one, omega), omega), 0)
  assert.equal(compareOrdinals(addOrdinals(omega, one), omega), 1)
  assert.equal(compareOrdinals(multiplyOrdinals(omega, omega), omegaSquared), 0)
  assert.equal(ordinalText(multiplyOrdinals(addOrdinals(omega, one), finiteOrdinal(3n))), 'ω·3 + 1')
  assert.equal(ordinalText(fundamentalSequence(omega, 3n)), '4')
  assert.equal(ordinalText(fundamentalSequence(omegaSquared, 2n)), 'ω·3')
  assert.equal(ordinalText(fundamentalSequence(omegaPower(omega), 1n)), 'ω^(2)')
  assert(isCanonicalOrdinal(addOrdinals(omega, one)))
  assert(!isCanonicalOrdinal([...one, ...omega]))
  assert.equal(magnitude(finiteFastGrowing(0n, 4n)), 5n)
  assert.equal(magnitude(finiteFastGrowing(1n, 4n)), 9n)
  assert.equal(magnitude(finiteFastGrowing(2n, 2n)), 23n)
  assert.equal(magnitude({ kind: 'fgh', index: omega, argument: 1n }), 7n)
  const symbolic = { kind: 'fgh', index: omegaPower(omega), argument: 5n } as const
  assert.equal(evaluate(symbolic).status, 'unknown')
  assert.equal(analyze(symbolic).positive, 'proven')
})

test('extreme functions expose documented exact cases and certified unknowns', () => {
  assert.equal(magnitude({ kind: 'ackermann', rank: 3n, argument: 4n }), 125n)
  assert.equal(magnitude({ kind: 'ackermann', rank: 4n, argument: 1n }), 65533n)
  assert.equal(magnitude({ kind: 'busy', variant: 'steps', states: 4n }), 107n)
  assert.equal(magnitude({ kind: 'busy', variant: 'ones', states: 4n }), 13n)
  const unknown = { kind: 'busy', variant: 'steps', states: 10n } as const
  assert.equal(notation(unknown), 'S(10)')
  assert.deepEqual(evaluate(unknown), { status: 'unknown', reason: 'unestablished' })
  assert.equal(lowerBound(unknown), 107n)
  assert.equal(analyze(unknown).even, 'unknown')
  assert.equal(compareExpressions(unknown, { ...unknown }), 'equal')
  assert.equal(compareExpressions(unknown, integer(100n)), 'greater')
  assert.equal(compareExpressions(unknown, integer(10n ** 50n)), 'unknown')
  assert.deepEqual(simplify({ kind: 'add', left: unknown, right: integer(0n) }), unknown)
})

test('every band has positive weight, a deterministic replay, and normalized probability', () => {
  const { bands, total } = distribution(full)
  assert.equal(bands.length, 5 + advancedFamilies.length)
  assert.deepEqual(bands.reduce((sum, band) => addProbability(sum, fraction(band.weight, total)), fraction(0n, 1n)), fraction(1n, 1n))
  assert.deepEqual(generate(full, seededWords(1729)), generate(full, seededWords(1729)))
  for (const band of bands) {
    const first = replay(full, band.id, 0n)
    const last = replay(full, band.id, band.domain.tickets - 1n)
    assert.equal(first.version, GENERATOR_VERSION)
    assert(first.probability.numerator > 0n)
    assert(notation(last.expression).length < 1100)
    const evaluated = evaluate(last.expression)
    assert.notEqual(evaluated.status === 'unknown' && evaluated.reason, 'domain', band.id)
    if (band.id !== 'digits') assert.deepEqual(last.probability, fraction(band.weight, total * band.outcomes))
    assert(compareProbability(first.probability, first.event.probability) <= 0)
    assert.throws(() => replay(full, band.id, band.domain.tickets), /ticket/)
  }
})

test('maximum research tuning is stable across purchase order', () => {
  const ranked = research.filter(item => !item.refundable || item.id === 'magnitude-focus')
    .map(item => [item.id, item.max ?? 1] as const)
  const first = effectsOf(Object.fromEntries(ranked)).generator
  const reversed = effectsOf(Object.fromEntries([...ranked].reverse())).generator
  assert.deepEqual(first, reversed)
  assert.equal(first.advanced?.digits?.complexity, 136)
  assert.equal(first.advanced?.arrows?.complexity, 22)
  const { bands } = distribution(first)
  for (const id of ['digits', 'arrows'] as const) {
    const band = bands.find(item => item.id === id)!
    const result = replay(first, id, band.domain.tickets - 1n)
    assert(result.probability.denominator > BigInt(Number.MAX_SAFE_INTEGER))
    assert(compareProbability(result.probability, result.event.probability) < 0)
  }
})

test('weighted digit domains and exact equivalent-value probabilities', () => {
  const config: GeneratorOptions = { ...base, advanced: { digits: { ...familyDefaults.digits, complexity: 26, digitBias: 3 } } }
  const digit = replay(config, 'digits', 0n)
  assert.deepEqual(digit.expression, integer(10n ** 25n))
  assert.deepEqual(digit.probability, fraction(5n * 3n ** 25n, 105n * 9n * 12n ** 25n))
  assert.deepEqual(equivalentOdds(config, digit.expression, digit.probability), { status: 'exact', probability: digit.probability })
  const both = { ...base, arithmetic: true }
  const theSum = replay(both, 'arithmetic', 0n)
  // Integer 4, 2+2, and 2×2.
  const expected = addProbability(fraction(88n, 100n * 1_000_001n), fraction(24n, 100n * 2n * 98n ** 2n))
  assert.deepEqual(equivalentOdds(both, theSum.expression, theSum.probability), { status: 'exact', probability: expected })

  const division = advancedDomains.division({ ...familyDefaults.division, operandMax: 9 })
  assert.deepEqual(division.valueOdds!({ numerator: 2n, denominator: 1n }), fraction(3n, 64n))
  assert.deepEqual(division.valueOdds!({ numerator: 2n, denominator: 3n }), fraction(3n, 64n))
  const busy = replay(full, 'busy', 9n)
  assert.deepEqual(equivalentOdds(full, busy.expression, busy.probability), { status: 'unknown', atLeast: busy.probability, reason: 'value' })
})

test('all advanced families unlock via paid research and preserve legacy EP', () => {
  const initial = newGame()
  assert.equal(purchase(initial, 'extreme-googology'), initial)
  assert.deepEqual(distribution(effectsOf(initial.purchases).generator).bands.map(band => band.id), ['classical'])
  let game = newGame(true)
  const word = seededWords(234)
  const choices = research.filter(node => (!node.refundable || node.id === 'efficiency-focus') && node.id !== 'anomaly')
  for (let index = 0; index < 2000 && !game.purchases['extreme-googology']; index++) {
    game = manualRoll(game, word)
    for (const node of choices) if (!game.purchases[node.id]) game = purchase(game, node.id)
  }
  assert(game.purchases['extreme-googology'])
  const options = effectsOf(game.purchases).generator
  assert.equal(options.advanced?.arrows?.complexity, familyDefaults.arrows.complexity + 3)
  const { bands } = distribution(options)
  assert.equal(bands.length, 18)
  const before = game
  const offsetTo = (source: string) => bands.slice(0, bands.findIndex(band => band.id === source)).reduce((sum, band) => sum + band.weight, 0n)
  const busy = [Number(offsetTo('busy')), 9]
  game = manualRoll(game, () => busy.shift()!)
  const latest = game.recent[0]
  assert.equal(game.rolls, before.rolls + 1)
  assert.equal(latest.source, 'busy')
  assert(latest.badges.some(badge => badge.id === 'busy' && badge.metric === 10n))
  assert(latest.badges.every(badge => badgeRule(badge.id).family === 'structure'))
  assert.equal(game.balance - before.balance, latest.earned)
  assert.deepEqual(importSave(exportSave(game), true), game)
})

test('historical v1 rolls stay readable and v2 rejects changed tickets and odds', () => {
  const first = manualRoll(newGame(), () => 13)
  const raw = JSON.parse(exportSave(first))
  raw.schema = 4
  raw.distribution.Legendary = 0
  raw.distribution.Common = 1
  for (const list of ['recent', 'rarest', 'highest', 'largest']) {
    raw[list][0].generatorVersion = 1
    delete raw[list][0].generation
  }
  const migrated = importSave(JSON.stringify(raw))
  assert.equal(migrated.recent[0].generatorVersion, 1)
  assert.equal(rollRarity(migrated.recent[0]).name, 'Common')
  assert.equal(migrated.recent[0].earned, 13n)
  const mixed = manualRoll(migrated, () => 314159)
  assert.equal(mixed.recent[0].generatorVersion, 2)
  assert.equal(mixed.recent[0].generation?.event.label, 'Constant Echo')
  assert.deepEqual(importSave(exportSave(mixed)), mixed)
  const altered = JSON.parse(exportSave(mixed))
  altered.recent[0].generation.ticket = '1'
  assert.throws(() => importSave(JSON.stringify(altered)), /Malformed/)
  altered.recent[0].generation.ticket = '314159'
  altered.recent[0].generation.event.probability = { numerator: '1', denominator: '2' }
  assert.throws(() => importSave(JSON.stringify(altered)), /Malformed/)
})
