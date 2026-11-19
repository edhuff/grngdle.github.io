import { integerFacts } from './research-properties'
import type { Feature } from './research/model'

export function inspectInteger(value: bigint, features: ReadonlySet<Feature>): [string, string][] {
  const facts: [string, string][] = []
  const add = (name: string, result: string) => facts.push([name, result])
  if (features.has('factorization') || features.has('divisor-count') || features.has('divisor-sum')) {
    const result = integerFacts(value)
    if (features.has('factorization')) add('Prime factors', result.factors === null ? 'Unknown within the analysis bound'
      : result.factors.map(([p, e]) => String(p) + (e > 1 ? '^' + e : '')).join(' × ') || 'Unit')
    if (features.has('divisor-count')) add('Positive divisors', result.divisorCount?.toString() ?? 'Unknown within the analysis bound')
    if (features.has('divisor-sum')) add('Proper-divisor sum', result.divisorSum === null ? 'Unknown within the analysis bound' : String(result.divisorSum - value))
  }
  const digits = (value < 0n ? -value : value).toString()
  if (features.has('digit-sum')) add('Decimal digit sum', String([...digits].reduce((sum, digit) => sum + Number(digit), 0)))
  if (features.has('digit-inventory')) {
    const counts = Array<number>(10).fill(0)
    for (const digit of digits) counts[Number(digit)]++
    add('Digit counts', counts.map((count, digit) => digit + ' → ' + count).join(' · '))
  }
  if (features.has('decimal-reversal')) add('Reversed decimal digits', [...digits].reverse().join(''))
  if (features.has('numeral-bases')) {
    const sign = value < 0n ? '−' : ''
    const absolute = value < 0n ? -value : value
    add('Binary', sign + '0b' + absolute.toString(2))
    add('Hexadecimal', sign + '0x' + absolute.toString(16).toUpperCase())
  }
  if (features.has('residue-table')) add('Residues', [3n, 7n, 8n, 11n, 13n].map(m => `mod ${m} → ${(value % m + m) % m}`).join(' · '))
  if (value !== 0n && features.has('decimal-bounds')) add('Decimal magnitude', `10^${digits.length - 1} ≤ |n| < 10^${digits.length}`)
  if (value >= 0n && features.has('sequence-indices')) {
    for (const [label, start, next] of [['Fibonacci', 0n, 1n], ['Lucas', 2n, 1n]] as const) {
      const indices: number[] = []
      for (let a: bigint = start, b: bigint = next, index = 0; index < 2 || a <= value; [a, b] = [b, a + b], index++) {
        if (a === value) indices.push(index)
      }
      if (indices.length) add(label + ' indices', indices.join(', '))
    }
  }
  return facts
}
