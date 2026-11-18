import { depth, fraction, type Expression, type Fraction } from './math'

export type BadgeFamily = 'parity' | 'divisibility' | 'digits' | 'prime' | 'sequence' | 'mirror' | 'rhythm' | 'powers' | 'structure' | 'landmarks'
type BadgeRule = { name: string; family: BadgeFamily; description: string; count?: number; base: bigint }
const rules = {
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
} satisfies Record<string, BadgeRule>

export type BadgeId = keyof typeof rules
export type Badge = { id: BadgeId; reward: bigint; level?: number }
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
  if (value < 2n) return true
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

export function badgeReference(id: BadgeId): Fraction | null {
  const count = badgeRule(id).count
  return count === undefined ? null : fraction(BigInt(count), 1_000_001n)
}

export function rewardFor(id: BadgeId, level = 1, probability = badgeReference(id)) {
  const rule = badgeRule(id)
  let rarityBonus = 0n
  if (probability?.numerator) {
    for (let bound = probability.numerator * 10n; bound <= probability.denominator; bound *= 10n) rarityBonus++
  }
  return rule.base + rarityBonus + BigInt(level - 1)
}

export const initialFamilies: readonly BadgeFamily[] = ['parity', 'divisibility', 'digits', 'prime', 'sequence', 'mirror', 'landmarks']

export function evaluateAttributes(expression: Expression, families: readonly BadgeFamily[]): Badge[] {
  const result: Badge[] = []
  const add = (id: BadgeId, level?: number) => result.push({ id, reward: rewardFor(id, level), ...(level ? { level } : {}) })
  if (expression.kind !== 'integer') {
    add(expression.kind === 'add' ? 'addition' : 'product')
    const nesting = depth(expression)
    if (nesting > 1) add('nested', nesting)
    return result
  }
  const value = expression.value
  const digits = value.toString()
  add(value % 2n === 0n ? 'even' : 'odd')
  if (value % 3n === 0n) add('three')
  if (value % 5n === 0n) add('five')
  if (value % 7n === 0n) add('seven')
  if (isPrime(value)) add('prime')
  if (/(\d)\1/.test(digits)) add('repeat')
  if (digits.length > 1 && digits === [...digits].reverse().join('')) add('palindrome')
  if (consecutive.test(digits)) add('consecutive')
  if (fibonacci.has(value)) add('fibonacci')
  if (constants.has(value)) add('constant')
  if (digits.length > 1 && [...digits].every(digit => digit === digits[0])) add('uniform')
  if (families.includes('rhythm') && /^(\d{2,}?)\1+$/.test(digits)) add('rhythm')
  if (families.includes('powers') && isSquare(value)) add('square')
  return result
}
