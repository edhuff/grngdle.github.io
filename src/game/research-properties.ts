type Test = (value: bigint, digits: string, facts: IntegerFacts) => boolean

export type IntegerFacts = {
  factors: [bigint, number][] | null
  divisorCount: bigint | null
  divisorSum: bigint | null
}

/** Complete factorization for bounded inputs, or explicit unknown. */
export function integerFacts(value: bigint): IntegerFacts {
  const unknown = { factors: null, divisorCount: null, divisorSum: null }
  if (value < 1n || value > 10_000_000n) return unknown
  const factors: [bigint, number][] = []
  let remainder = value
  for (let prime = 2n; prime * prime <= remainder; prime += prime === 2n ? 1n : 2n) {
    if (remainder % prime !== 0n) continue
    let exponent = 0
    while (remainder % prime === 0n) {
      remainder /= prime
      exponent++
    }
    factors.push([prime, exponent])
  }
  if (remainder > 1n) factors.push([remainder, 1])
  let divisorCount = 1n
  let divisorSum = 1n
  for (const [p, e] of factors) {
    divisorCount *= BigInt(e + 1)
    divisorSum *= (p ** BigInt(e + 1) - 1n) / (p - 1n)
  }
  return { factors, divisorCount, divisorSum }
}

function power(value: bigint, exponent: bigint) {
  if (value < 0n) return false
  let lower = 0n
  let upper = 1n << BigInt(Math.ceil(value.toString(2).length / Number(exponent)))
  while (upper - lower > 1n) {
    const middle = (upper + lower) / 2n
    if (middle ** exponent <= value) lower = middle
    else upper = middle
  }
  return lower ** exponent === value
}

const multiple = (n: bigint): Test => value => value % n === 0n
const sum = (digits: string) => [...digits].reduce((total, d) => total + Number(d), 0)
const reversed = (digits: string) => [...digits].reverse().join('')
const windowMatches = (digits: string, length: number, test: (part: string) => boolean) => {
  for (let i = 0; i + length <= digits.length; i++) if (test(digits.slice(i, i + length))) return true
  return false
}
const properSum = (value: bigint, facts: IntegerFacts) => facts.divisorSum === null ? null : facts.divisorSum - value

type Property = { name: string; description: string; family: 'divisibility' | 'powers' | 'prime' | 'landmarks' | 'digits' | 'rhythm' | 'mirror' | 'sequence'; base: bigint; test: Test; needsFactors?: true }
const property = (name: string, description: string, family: Property['family'], base: bigint, test: Test, needsFactors?: true): Property =>
  ({ name, description, family, base, test, needsFactors })

export const researchProperties = {
  eight: property('Octal Multiple', 'Positive multiple of 8', 'divisibility', 1n, n => n > 0n && n % 8n === 0n),
  eleven: property('Elevens', 'Divisible by 11', 'divisibility', 1n, multiple(11n)),
  thirteen: property('Thirteens', 'Divisible by 13', 'divisibility', 1n, multiple(13n)),
  coprimeThirty: property('Coprime to 30', 'Shares no factor with 30', 'divisibility', 1n, n => n % 2n !== 0n && n % 3n !== 0n && n % 5n !== 0n),
  centeredResidue: property('Central Residue', 'Remainder 5 modulo 12', 'divisibility', 2n, n => (n % 12n + 12n) % 12n === 5n),
  cube: property('Perfect Cube', 'Cube of an integer', 'powers', 4n, n => power(n < 0n ? -n : n, 3n)),
  fourthPower: property('Fourth Power', 'Fourth power of an integer', 'powers', 5n, n => power(n, 4n)),
  triangular: property('Triangular', 'Sum of consecutive integers from 1 to k, including the empty sum', 'landmarks', 3n, n => n >= 0n && power(8n * n + 1n, 2n)),
  pronic: property('Pronic', 'Product of consecutive nonnegative integers', 'landmarks', 3n, n => n >= 0n && power(4n * n + 1n, 2n)),
  mersenne: property('Mersenne Form', 'One below a positive power of two greater than one', 'powers', 5n, n => n > 0n && (n & (n + 1n)) === 0n),
  semiprime: property('Semiprime', 'Exactly two prime factors counted with multiplicity', 'prime', 1n, (_, __, f) => f.factors?.reduce((s, [, e]) => s + e, 0) === 2, true),
  squareFree: property('Squarefree', 'Integer greater than one with no repeated prime factors', 'prime', 1n, (n, _, f) => n > 1n && !!f.factors?.every(([, e]) => e === 1), true),
  powerful: property('Powerful Number', 'Integer greater than one in which every prime factor occurs at least twice', 'powers', 4n, (n, _, f) => n > 1n && !!f.factors?.every(([, e]) => e >= 2), true),
  smooth: property('5-Smooth', 'Positive composite with no prime factors greater than five', 'prime', 4n, (_, __, f) => !!f.factors?.length && f.factors.every(([p]) => p <= 5n) && (f.factors.length > 1 || f.factors[0][1] > 1), true),
  sixDivisors: property('Six Divisors', 'Exactly six positive divisors', 'prime', 3n, (_, __, f) => f.divisorCount === 6n, true),
  abundant: property('Abundant', 'Proper divisors sum to more than the value', 'prime', 1n, (n, _, f) => (properSum(n, f) ?? 0n) > n && n > 0n, true),
  perfect: property('Perfect Number', 'Equals the sum of its proper divisors', 'landmarks', 8n, (n, _, f) => n > 0n && properSum(n, f) === n, true),
  amicable: property('Amicable', 'Forms a distinct positive pair linked by proper-divisor sums', 'landmarks', 7n, (n, _, f) => {
    const m = properSum(n, f)
    return m !== null && m > 0n && m !== n && properSum(m, integerFacts(m)) === n
  }, true),
  sphenic: property('Sphenic', 'Product of three distinct primes', 'prime', 2n, (_, __, f) => f.factors?.length === 3 && f.factors.every(([, e]) => e === 1), true),
  harshad: property('Harshad', 'Positive number divisible by its decimal digit sum', 'digits', 1n, (n, d) => n > 0n && n % BigInt(sum(d)) === 0n),
  automorphic: property('Automorphic', 'Its square ends in all its original digits', 'powers', 5n, (n, d) => n > 9n && n * n % 10n ** BigInt(d.length) === n),
  lucas: property('Lucas Number', 'Occurs in the sequence 2, 1, 3, 4, 7, …', 'landmarks', 5n, n => {
    for (let a = 2n, b = 1n; a <= n || a === 2n; [a, b] = [b, a + b]) if (a === n) return true
    return false
  }),
  palChunk: property('Inner Mirror', 'Contains a proper three-digit palindrome', 'mirror', 2n, (_, d) => d.length > 3 && windowMatches(d, 3, p => p[0] === p[2] && p[0] !== p[1])),
  endpoints: property('Matching Ends', 'First and last digits match in a nonpalindrome', 'mirror', 1n, (_, d) => d.length > 2 && d[0] === d.at(-1) && d !== reversed(d)),
  zeroPair: property('Zero Pair', 'Contains adjacent zeros', 'digits', 1n, (_, d) => d.includes('00')),
  alternating: property('Parity Alternation', 'Every adjacent digit pair alternates in parity', 'rhythm', 2n, (_, d) => d.length >= 4 && [...d].every((x, i) => !i || Number(x) % 2 !== Number(d[i - 1]) % 2)),
  permutation: property('No Repeats', 'At least four digits, all distinct', 'digits', 1n, (_, d) => d.length >= 4 && new Set(d).size === d.length),
  palindromePair: property('Paired Mirrors', 'Two nonoverlapping palindromic blocks of three digits', 'mirror', 4n, (_, d) => {
    let first = -3
    for (let i = 0; i + 3 <= d.length; i++) {
      if (d[i] !== d[i + 2]) continue
      if (first >= 0 && i - first >= 3) return true
      if (first < 0) first = i
    }
    return false
  }),
  repeatedPair: property('Echoing Pair', 'A two-digit block recurs without overlap', 'rhythm', 2n, (_, d) => {
    const seen = new Map<string, number>()
    for (let i = 0; i < d.length - 1; i++) {
      const pair = d.slice(i, i + 2)
      const first = seen.get(pair)
      if (first === undefined) seen.set(pair, i)
      else if (i - first > 1) return true
    }
    return false
  }),
  interleaved: property('Interleaved Tracks', 'Two distinct digits alternate throughout the number', 'rhythm', 4n, (_, d) => d.length >= 4 && d[0] !== d[1] && [...d].every((x, i) => x === d[i % 2])),
  rising: property('Strict Ascent', 'At least three digits in strictly increasing order', 'sequence', 2n, (_, d) => d.length >= 3 && [...d].every((x, i) => !i || x > d[i - 1])),
  falling: property('Strict Descent', 'At least three digits in strictly decreasing order', 'sequence', 2n, (_, d) => d.length >= 3 && [...d].every((x, i) => !i || x < d[i - 1])),
  twoStep: property('Double Step', 'Contains three consecutive positions stepping by two', 'sequence', 2n, (_, d) => windowMatches(d, 3, ([a, b, c]) => Math.abs(Number(a) - Number(b)) === 2 && Number(a) + Number(c) === 2 * Number(b))),
  balanced: property('Balanced Halves', 'Even-length decimal with equal digit sums on both sides', 'digits', 2n, (_, d) => d.length > 2 && d.length % 2 === 0 && sum(d.slice(0, d.length / 2)) === sum(d.slice(d.length / 2))),
  reverseMultiple: property('Reversible Seven', 'The decimal and its reversal are both divisible by seven', 'mirror', 3n, (n, d) => d.length > 2 && n % 7n === 0n && BigInt(reversed(d)) % 7n === 0n),
  centreFour: property('Double Centre', 'Contains a four-digit palindrome with two distinct digits', 'mirror', 3n, (_, d) => windowMatches(d, 4, p => p[0] === p[3] && p[1] === p[2] && p[0] !== p[1])),
  lengths: property('Even Decimal Length', 'At least four digits and an even length', 'digits', 1n, (_, d) => d.length >= 4 && d.length % 2 === 0),
  alternatingSum: property('Alternating Balance', 'Alternating digit sums are exactly equal', 'rhythm', 2n, (_, d) => d.length >= 4 && [...d].reduce((s, x, i) => s + (i % 2 ? -1 : 1) * Number(x), 0) === 0),
  polydigit: property('Self-Dividing', 'Positive multidigit number divisible by each digit, with no zeros', 'digits', 3n, (n, d) => n > 9n && !d.includes('0') && [...new Set(d)].every(x => n % BigInt(x) === 0n)),
} satisfies Record<string, Property>

export type PropertyId = keyof typeof researchProperties
