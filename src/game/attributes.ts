import { depth, fraction, magnitude, type Expression, type Fraction } from './math'
import { children } from './math/ast'
import { classicalFrequencies } from './generation/classical-frequencies'
import { ordinalDepth } from './math/ordinal'
import { integerFacts, researchProperties, type PropertyId } from './research-properties'

export type BadgeFamily = 'parity' | 'divisibility' | 'digits' | 'prime' | 'sequence' | 'mirror' | 'rhythm' | 'powers' | 'structure' | 'landmarks'
type BadgeRule = { name: string; family: BadgeFamily; description: string; count?: number; base: bigint }
const rules = {
  ...researchProperties,
  even: { name: 'Even', family: 'parity', description: 'Divisible by 2', count: 500001, base: 1n },
  odd: { name: 'Odd', family: 'parity', description: 'Leaves remainder 1 when divided by 2', count: 500000, base: 1n },
  three: { name: 'Triple', family: 'divisibility', description: 'Divisible by 3', count: 333334, base: 1n },
  five: { name: 'Quinary', family: 'divisibility', description: 'Divisible by 5', count: 200001, base: 1n },
  seven: { name: 'Lucky Seven', family: 'divisibility', description: 'Divisible by 7', count: 142858, base: 1n },
  prime: { name: 'Prime', family: 'prime', description: 'Has exactly two positive divisors', count: 78498, base: 2n },
  repeat: { name: 'Double Take', family: 'digits', description: 'Contains adjacent identical digits', count: 402130, base: 1n },
  palindrome: { name: 'Palindrome', family: 'mirror', description: 'At least two digits and reads the same both ways', count: 1989, base: 3n },
  consecutive: { name: 'Stepping Stones', family: 'sequence', description: 'Contains three digits stepping by +1 or −1', count: 58287, base: 2n },
  fibonacci: { name: 'Fibonacci', family: 'landmarks', description: 'A member of the Fibonacci sequence', count: 30, base: 5n },
  constant: { name: 'Constant Echo', family: 'landmarks', description: 'The first six digits of π, e, or φ', count: 3, base: 10n },
  uniform: { name: 'Repdigit', family: 'digits', description: 'At least two digits, all identical', count: 45, base: 4n },
  rhythm: { name: 'Digit Rhythm', family: 'rhythm', description: 'Made from two or more copies of the same multi-digit unit', count: 1071, base: 3n },
  square: { name: 'Perfect Square', family: 'powers', description: 'The square of a nonnegative integer', count: 1001, base: 3n },
  addition: { name: 'Addition', family: 'structure', description: 'An expression with addition at the root', base: 5n },
  product: { name: 'Product', family: 'structure', description: 'An expression with multiplication at the root', base: 5n },
  nested: { name: 'Expression Depth', family: 'structure', description: 'A mathematical operation containing another operation', base: 3n },
  difference: { name: 'Difference', family: 'structure', description: 'Subtraction at the root', base: 4n },
  quotient: { name: 'Quotient', family: 'structure', description: 'Division at the root', base: 5n },
  factorial: { name: 'Factorial', family: 'structure', description: 'Factorial at the root', base: 5n },
  exponent: { name: 'Exponentiation', family: 'structure', description: 'Exponentiation at the root', base: 5n },
  tower: { name: 'Tower height', family: 'structure', description: 'Number of terms in a right-associated tower', base: 6n },
  hyperRank: { name: 'Hyperoperation rank', family: 'structure', description: 'Rank in the finite hyperoperation hierarchy', base: 6n },
  tetrationHeight: { name: 'Tetration height', family: 'structure', description: 'Height of a tetration stack', base: 5n },
  arrows: { name: 'Knuth arrow count', family: 'structure', description: 'Number of up-arrows', base: 7n },
  chain: { name: 'Conway chain length', family: 'structure', description: 'Number of entries in the outer Conway chain', base: 8n },
  ordinal: { name: 'Ordinal index depth', family: 'structure', description: 'Depth of the ordinal index in Cantor normal form', base: 9n },
  busy: { name: 'Busy Beaver states', family: 'structure', description: 'Number of working states', base: 9n },
  ackermann: { name: 'Ackermann rank', family: 'structure', description: 'First argument of the Ackermann–Péter function', base: 9n },
  repeatedOperand: { name: 'Repeated operands', family: 'structure', description: 'Repeated integer operands at the same level', base: 2n },
  longInteger: { name: 'Digit length', family: 'digits', description: 'Length of an extended integer', base: 4n },
} satisfies Record<string, BadgeRule>

export type BadgeId = keyof typeof rules
export type Badge = { id: BadgeId; reward: bigint; level?: number; metric?: bigint }
export const badgeRule = (id: BadgeId): BadgeRule => rules[id]
export const badgeIds = Object.keys(rules) as BadgeId[]

const sieveLimit = 1_000_000
let composites: Uint8Array | undefined
function sieve() {
  if (composites) return composites
  composites = new Uint8Array(sieveLimit + 1)
  composites[0] = composites[1] = 1
  for (let candidate = 2; candidate * candidate <= sieveLimit; candidate++) {
    if (composites[candidate]) continue
    for (let multiple = candidate * candidate; multiple <= sieveLimit; multiple += candidate) composites[multiple] = 1
  }
  return composites
}

function powMod(base: bigint, exponent: bigint, modulus: bigint) {
  let result = 1n
  for (let power = exponent; power > 0n; power >>= 1n) {
    if (power & 1n) result = result * base % modulus
    base = base * base % modulus
  }
  return result
}

export function isPrime(value: bigint): boolean | null {
  if (value < 2n) return false
  if (value <= BigInt(sieveLimit)) return sieve()[Number(value)] === 0
  if (value % 2n === 0n) return false
  if (value >= 2n ** 64n) return null
  // These witnesses make Miller–Rabin deterministic below 2^64.
  let odd = value - 1n
  let twos = 0
  while (odd % 2n === 0n) {
    odd /= 2n
    twos++
  }
  return [2n, 325n, 9375n, 28178n, 450775n, 9780504n, 1795265022n].every(witness => {
    if (witness % value === 0n) return true
    let result = powMod(witness % value, odd, value)
    if (result === 1n || result === value - 1n) return true
    for (let step = 1; step < twos; step++) {
      result = result * result % value
      if (result === value - 1n) return true
    }
    return false
  })
}

function isSquare(value: bigint) {
  if (value < 2n) return value >= 0n
  let upper = 1n << BigInt(Math.ceil(value.toString(2).length / 2))
  for (;;) {
    const next = (upper + value / upper) / 2n
    if (next >= upper) return upper * upper === value
    upper = next
  }
}

const fibonacci = new Set<bigint>()
for (let a = 0n, b = 1n; a < 10n ** 25n; [a, b] = [b, a + b]) fibonacci.add(a)
const constants = new Set([314159n, 271828n, 161803n])
const consecutive = /012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210/

const referenceOdds = new Map<BadgeId, Fraction>()
for (const id of badgeIds) {
  const count = classicalFrequencies[id]?.reduce((sum, hits) => sum + hits, 0) ?? 0
  if (count) referenceOdds.set(id, fraction(BigInt(count), 1_000_001n))
}

const weightedReferences = new WeakMap<readonly number[], Map<BadgeId, Fraction | null>>()

export function badgeReference(id: BadgeId, terminal?: readonly number[]): Fraction | null {
  const baseline = referenceOdds.get(id)
  if (!terminal || !baseline) return baseline ?? null
  let profile = weightedReferences.get(terminal)
  if (!profile) {
    profile = new Map()
    weightedReferences.set(terminal, profile)
  }
  const cached = profile.get(id)
  if (cached !== undefined) return cached
  const count = classicalFrequencies[id]!.reduce((sum, hits, digit) => sum + hits * (16 + terminal[digit]), 0)
  const total = terminal.reduce((sum, weight, digit) => sum + (16 + weight) * (digit ? 100_000 : 100_001), 0)
  const probability = fraction(BigInt(count), BigInt(total))
  profile.set(id, probability)
  return probability
}

export function rewardFor(id: BadgeId, level = 1, probability = badgeReference(id), metric?: bigint) {
  const rule = badgeRule(id)
  let rarityBonus = 0n
  if (probability?.numerator) {
    for (let bound = probability.numerator * 10n; bound <= probability.denominator; bound *= 10n) rarityBonus++
  }
  return rule.base + rarityBonus + BigInt(level - 1) + (metric === undefined ? 0n : BigInt(metric.toString().length - 1))
}

export const initialFamilies: readonly BadgeFamily[] = ['parity', 'divisibility', 'digits', 'prime', 'sequence', 'mirror', 'landmarks']

export function evaluateAttributes(expression: Expression, families: readonly BadgeFamily[], includeExact = false, legacyShape = false, properties: ReadonlySet<PropertyId> = new Set()): Badge[] {
  const result: Badge[] = []
  const add = (id: BadgeId, level?: number, metric?: bigint) => result.push({
    id, reward: rewardFor(id, level, undefined, metric),
    ...(level ? { level } : {}), ...(metric === undefined ? {} : { metric }),
  })
  const values = children(expression).flatMap(term => term.kind === 'integer' ? [term.value] : [])
  switch (expression.kind) {
    case 'integer': break
    case 'add': add('addition'); break
    case 'multiply': add('product'); break
    case 'subtract': add('difference'); break
    case 'divide': add('quotient'); break
    case 'factorial': add('factorial'); break
    case 'power': add('exponent'); break
    case 'tower': add('tower', undefined, BigInt(expression.terms.length)); break
    case 'hyper':
      add('hyperRank', undefined, expression.rank)
      if (expression.rank === 4n) add('tetrationHeight', undefined, expression.height)
      break
    case 'arrow': add('arrows', undefined, expression.rank); break
    case 'chain': add('chain', undefined, BigInt(expression.terms.length)); break
    case 'fgh': add('ordinal', undefined, BigInt(ordinalDepth(expression.index))); break
    case 'busy': add('busy', undefined, expression.states); break
    case 'ackermann': add('ackermann', undefined, expression.rank); break
  }
  const nesting = depth(expression)
  if (nesting > 1) add('nested', nesting)
  if (includeExact && !legacyShape && values.length > new Set(values).size) add('repeatedOperand')
  if (expression.kind !== 'integer' && !includeExact) return result
  const value = expression.kind === 'integer' ? expression.value : magnitude(expression)
  if (value === null) return result
  const digits = (value < 0n ? -value : value).toString()
  if (includeExact && digits.length >= 26 && expression.kind === 'integer') add('longInteger', undefined, BigInt(digits.length))
  add(value % 2n === 0n ? 'even' : 'odd')
  if (value % 3n === 0n) add('three')
  if (value % 5n === 0n) add('five')
  if (value % 7n === 0n) add('seven')
  if (isPrime(value)) add('prime')
  if (/(\d)\1/.test(digits)) add('repeat')
  if (digits.length > 1 && digits === [...digits].reverse().join('')) add('palindrome')
  if (consecutive.test(digits)) add('consecutive')
  if (fibonacci.has(value) || (value >= 10n ** 25n &&
      (isSquare(5n * value * value + 4n) || isSquare(5n * value * value - 4n)))) add('fibonacci')
  if (constants.has(value)) add('constant')
  if (digits.length > 1 && [...digits].every(digit => digit === digits[0])) add('uniform')
  if (families.includes('rhythm') && /^(\d{2,}?)\1+$/.test(digits)) add('rhythm')
  if (families.includes('powers') && isSquare(value)) add('square')
  let facts: ReturnType<typeof integerFacts> | undefined
  const unknown = { factors: null, divisorCount: null, divisorSum: null }
  for (const id of properties) {
    const rule = researchProperties[id]
    if ('needsFactors' in rule && rule.needsFactors) facts ??= integerFacts(value)
    if (rule.test(value, digits, facts ?? unknown)) add(id)
  }
  return result
}
