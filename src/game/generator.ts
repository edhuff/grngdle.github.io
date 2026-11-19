import { integer, type Expression } from './math/ast'
import type { Rational } from './math/evaluate'
import { fraction, multiplyProbability } from './math/probability'
import { advancedFamilies, snapshot, type AdvancedFamily, type GeneratorOptions } from './generation/config'
import { integerRange, product, type Domain } from './generation/domains'
import { advancedDomains } from './generation/families'
import { cryptoWord, uniformBelow, type WordSource } from './generation/random'

export { seededWords, uniformBelow, type WordSource } from './generation/random'
export { type GeneratorOptions } from './generation/config'

export const CLASSICAL_MAX = 1_000_000n
export const EXPANDED_MAX = 10n ** 12n
export const VAST_MAX = 10n ** 24n
export const DISTRIBUTION_TOTAL = 100n
export const GENERATOR_VERSION = 2

export type Source = 'classical' | 'expanded' | 'vast' | 'arithmetic' | 'nested' | AdvancedFamily
type BandSummary = { id: Source; weight: bigint; outcomes: bigint }
export type Band = BandSummary & { domain: Domain }
export const sourceNames: Record<Source, string> = {
  classical: 'Classical integer', expanded: 'Expanded integer', vast: 'Arbitrary precision',
  arithmetic: 'Sum or product', nested: 'Nested expression', digits: 'Extended digit strings',
  subtraction: 'Subtraction', division: 'Division', factorials: 'Factorial', powers: 'Exponentiation',
  towers: 'Power towers', tetration: 'Tetration', hyperoperations: 'Finite hyperoperations',
  arrows: 'Knuth up-arrows', chains: 'Conway chains', hierarchy: 'Fast-growing hierarchy',
  busy: 'Busy Beaver', ackermann: 'Ackermann–Péter',
}

function arithmeticDomain(max: bigint, nested: boolean): Domain {
  const width = max - 1n
  const kind = (choice: bigint) => choice === 0n ? 'add' : 'multiply'
  if (nested) {
    return {
      ...product([2n, 2n, width, width, width], ([root, branch, a, b, c]) => ({
        kind: kind(root), left: { kind: kind(branch), left: integer(a + 2n), right: integer(b + 2n) }, right: integer(c + 2n),
      })),
      event: ticket => ({ label: ticket % 2n ? 'Nested product' : 'Nested sum', probability: fraction(1n, 2n) }),
    }
  }
  const domain = product([2n, width, width], ([operator, a, b]) => ({ kind: kind(operator), left: integer(a + 2n), right: integer(b + 2n) }))
  return {
    ...domain,
    event: ticket => ({ label: ticket % 2n ? 'Ordered product' : 'Ordered sum', probability: fraction(1n, 2n) }),
    valueOdds(value: Rational) {
      const n = value.numerator
      if (value.denominator !== 1n || n < 4n || n > max * max) return fraction(0n, 1n)
      const low = n - max > 2n ? n - max : 2n
      const high = n - 2n < max ? n - 2n : max
      let count = high >= low ? high - low + 1n : 0n
      for (let a = 2n; a <= max && a * a <= n; a++) {
        if (n % a === 0n && n / a <= max) count += a * a === n ? 1n : 2n
      }
      return fraction(count, domain.outcomes)
    },
  }
}

export function distribution(options: GeneratorOptions) {
  const anomaly = BigInt(Math.min(6, options.anomaly))
  const max = options.specialization === 'magnitude' ? 999n : 99n
  const bias = options.specialization === 'rarity' ? 4n : 0n
  const reach = options.specialization === 'magnitude' ? 4n : 0n
  const bands: Band[] = []
  function add(id: Source, weight: bigint, domain: Domain) {
    bands.push({ id, weight, outcomes: domain.outcomes, domain })
  }

  if (options.wide) add('expanded', 22n + anomaly + reach, integerRange(CLASSICAL_MAX + 1n, EXPANDED_MAX))
  if (options.vast) add('vast', 4n + anomaly + bias, integerRange(EXPANDED_MAX + 1n, VAST_MAX))
  if (options.arithmetic) add('arithmetic', 12n + bias, arithmeticDomain(max, false))
  if (options.nesting) add('nested', 3n + bias, arithmeticDomain(max, true))
  const weight = DISTRIBUTION_TOTAL - bands.reduce((sum, band) => sum + band.weight, 0n)
  const classical = integerRange(0n, CLASSICAL_MAX)
  bands.unshift({ id: 'classical', weight, outcomes: classical.outcomes, domain: classical })
  for (const id of advancedFamilies) {
    const params = options.advanced?.[id]
    if (params) add(id, BigInt(params.weight), advancedDomains[id](params))
  }
  return { bands, total: bands.reduce((sum, band) => sum + band.weight, 0n) }
}

export function generatorBands(options: GeneratorOptions): BandSummary[] {
  return distribution(snapshot(options)).bands.map(({ id, weight, outcomes }) => ({ id, weight, outcomes }))
}

function materialize(band: Band, total: bigint, ticket: bigint) {
  if (ticket < 0n || ticket >= band.domain.tickets) throw new RangeError('Invalid expression ticket')
  const expression: Expression = band.domain.at(ticket)
  const bandOdds = fraction(band.weight, total)
  const probability = multiplyProbability(bandOdds, band.domain.odds?.(ticket, expression) ?? fraction(1n, band.outcomes))
  const shape = band.domain.event?.(ticket)
  const event = {
    label: shape?.label ?? sourceNames[band.id],
    scope: 'Current pool' as const,
    probability: shape ? multiplyProbability(bandOdds, shape.probability) : bandOdds,
  }
  return { expression, probability, event, source: band.id, version: GENERATOR_VERSION }
}

export function replay(options: GeneratorOptions, source: Source, ticket: bigint) {
  const { bands, total } = distribution(snapshot(options))
  const band = bands.find(item => item.id === source)
  if (!band) throw new RangeError('Generator family was not enabled')
  return materialize(band, total, ticket)
}

export function generate(options: GeneratorOptions, word: WordSource = cryptoWord) {
  const configuration = snapshot(options)
  const { bands, total } = distribution(configuration)
  let chosen = bands[0]
  if (bands.length > 1) {
    let draw = uniformBelow(total, word)
    for (const band of bands) {
      if (draw < band.weight) {
        chosen = band
        break
      }
      draw -= band.weight
    }
  }
  const ticket = uniformBelow(chosen.domain.tickets, word)
  return { ...materialize(chosen, total, ticket), configuration, ticket }
}
