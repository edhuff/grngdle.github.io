import { distribution, type GeneratorOptions } from '../generator'
import { compareValues } from '../math/analysis'
import type { Expression } from '../math/ast'
import { evaluate, type Rational } from '../math/evaluate'
import { addProbability, compareProbability, fraction, multiplyProbability, type Fraction } from '../math/probability'

export type ValueOdds = { status: 'exact'; probability: Fraction }
  | { status: 'unknown'; atLeast: Fraction; reason: 'value' | 'support' }

function countSmall(at: (ticket: bigint) => Expression, width: bigint, target: Rational) {
  let matches = 0n
  let complete = true
  for (let ticket = 0n; ticket < width; ticket++) {
    const result = evaluate(at(ticket), 128)
    if (result.status !== 'exact') complete = false
    else if (compareValues(result.value, target) === 'equal') matches++
  }
  return { matches, complete }
}

export function equivalentOdds(configuration: GeneratorOptions, expression: Expression, ownProbability: Fraction): ValueOdds {
  const value = evaluate(expression)
  if (value.status !== 'exact') return { status: 'unknown', atLeast: ownProbability, reason: 'value' }
  let sum = fraction(0n, 1n)
  let complete = true
  const { bands, total } = distribution(configuration)
  for (const band of bands) {
    const weight = fraction(band.weight, total)
    if (band.domain.valueOdds) sum = addProbability(sum, multiplyProbability(weight, band.domain.valueOdds(value.value)))
    else if (band.id === 'nested' && (value.value.denominator !== 1n || value.value.numerator < 6n ||
      value.value.numerator > (configuration.specialization === 'magnitude' ? 999n : 99n) ** 3n)) continue
    else if (band.domain.tickets <= 256n) {
      const result = countSmall(band.domain.at, band.domain.tickets, value.value)
      complete = complete && result.complete
      sum = addProbability(sum, multiplyProbability(weight, fraction(result.matches, band.domain.tickets)))
    } else complete = false
  }
  if (complete) return { status: 'exact', probability: sum }
  return { status: 'unknown', atLeast: compareProbability(sum, ownProbability) < 0 ? ownProbability : sum, reason: 'support' }
}
