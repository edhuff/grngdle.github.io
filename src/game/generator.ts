import { fraction, integer, type Expression } from './math'

export const CLASSICAL_MAX = 1_000_000n
export const GENERATOR_VERSION = 1
export type WordSource = () => number
export type GeneratorOptions = {
  wide: boolean
  vast: boolean
  arithmetic: boolean
  nesting: boolean
  anomaly: number
  specialization: 'magnitude' | 'rarity' | 'efficiency' | null
}

const browserWords = new Uint32Array(1)
export const cryptoWord: WordSource = () => crypto.getRandomValues(browserWords)[0]

export function seededWords(seed: number): WordSource {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = Math.imul(state ^ state >>> 15, state | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return (value ^ value >>> 14) >>> 0
  }
}

export function uniformBelow(limit: bigint, word: WordSource): bigint {
  if (limit < 1n) throw new RangeError('Empty sampling range')
  if (limit === 1n) return 0n
  const bits = (limit - 1n).toString(2).length
  const words = Math.ceil(bits / 32)
  const mask = (1n << BigInt(bits)) - 1n
  for (;;) {
    let candidate = 0n
    for (let index = 0; index < words; index++) candidate = (candidate << 32n) | BigInt(word())
    candidate &= mask
    if (candidate < limit) return candidate
  }
}

type Band = { id: 'classical' | 'expanded' | 'vast' | 'arithmetic' | 'nested'; weight: bigint; outcomes: bigint }
export const EXPANDED_MAX = 10n ** 12n
export const VAST_MAX = 10n ** 24n
export const DISTRIBUTION_TOTAL = 100n

export function generatorBands(options: GeneratorOptions): Band[] {
  const anomaly = BigInt(Math.max(0, Math.min(6, options.anomaly)))
  const operands = options.specialization === 'magnitude' ? 998n : 98n
  const bias = options.specialization === 'rarity' ? 4n : 0n
  const reach = options.specialization === 'magnitude' ? 4n : 0n
  const bands: Band[] = []
  if (options.wide) bands.push({ id: 'expanded', weight: 22n + anomaly + reach, outcomes: EXPANDED_MAX - CLASSICAL_MAX })
  if (options.vast) bands.push({ id: 'vast', weight: 4n + anomaly + bias, outcomes: VAST_MAX - EXPANDED_MAX })
  if (options.arithmetic) bands.push({ id: 'arithmetic', weight: 12n + bias, outcomes: 2n * operands ** 2n })
  if (options.nesting) bands.push({ id: 'nested', weight: 3n + bias, outcomes: 4n * operands ** 3n })
  const classical = DISTRIBUTION_TOTAL - bands.reduce((sum, band) => sum + band.weight, 0n)
  return [{ id: 'classical', weight: classical, outcomes: CLASSICAL_MAX + 1n }, ...bands]
}

export function generate(options: GeneratorOptions, word: WordSource = cryptoWord) {
  const bands = generatorBands(options)
  const [first] = bands
  let selected = first
  if (bands.length > 1) {
    let draw = uniformBelow(DISTRIBUTION_TOTAL, word)
    for (const band of bands) {
      if (draw < band.weight) {
        selected = band
        break
      }
      draw -= band.weight
    }
  }
  let expression: Expression
  if (selected.id === 'classical') expression = integer(uniformBelow(selected.outcomes, word))
  else if (selected.id === 'expanded') expression = integer(CLASSICAL_MAX + 1n + uniformBelow(selected.outcomes, word))
  else if (selected.id === 'vast') expression = integer(EXPANDED_MAX + 1n + uniformBelow(selected.outcomes, word))
  else {
    const width = options.specialization === 'magnitude' ? 998n : 98n
    const operand = () => integer(2n + uniformBelow(width, word))
    const operator = () => uniformBelow(2n, word) === 0n ? 'add' : 'multiply'
    const left: Expression = selected.id === 'nested'
      ? { kind: operator(), left: operand(), right: operand() }
      : operand()
    expression = { kind: operator(), left, right: operand() }
  }
  return {
    expression,
    probability: fraction(selected.weight, DISTRIBUTION_TOTAL * selected.outcomes),
    source: selected.id,
    version: GENERATOR_VERSION,
  }
}
