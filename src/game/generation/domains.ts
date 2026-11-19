import { integer, type Expression } from '../math/ast'
import { fraction, type Fraction } from '../math/probability'
import type { Rational } from '../math/evaluate'

export type AttributeEvent = { label: string; probability: Fraction }
export type Domain = {
  tickets: bigint
  outcomes: bigint
  at: (ticket: bigint) => Expression
  odds?: (ticket: bigint, expression: Expression) => Fraction
  event?: (ticket: bigint) => AttributeEvent
  valueOdds?: (value: Rational) => Fraction
}

export function product(radices: bigint[], build: (choices: bigint[]) => Expression): Domain {
  const outcomes = radices.reduce((total, size) => total * size, 1n)
  return {
    outcomes, tickets: outcomes,
    at(ticket) {
      return build(radices.map(size => {
        const choice = ticket % size
        ticket /= size
        return choice
      }))
    },
  }
}

export function integerRange(low: bigint, high: bigint): Domain {
  const outcomes = high - low + 1n
  return {
    outcomes, tickets: outcomes,
    at: n => integer(low + n),
    valueOdds: value => fraction(value.denominator === 1n && value.numerator >= low && value.numerator <= high ? 1n : 0n, outcomes),
  }
}

// Disjoint syntax grammars. Each ticket denotes one ordered AST.
export function variants(choices: { label: string; domain: Domain }[]): Domain {
  const outcomes = choices.reduce((sum, item) => sum + item.domain.outcomes, 0n)
  function locate(ticket: bigint) {
    for (const item of choices) {
      if (ticket < item.domain.tickets) return { item, ticket }
      ticket -= item.domain.tickets
    }
    throw new RangeError('Invalid expression ticket')
  }
  return {
    tickets: outcomes, outcomes,
    at(ticket) {
      const selected = locate(ticket)
      return selected.item.domain.at(selected.ticket)
    },
    event(ticket) {
      const { item } = locate(ticket)
      return { label: item.label, probability: fraction(item.domain.outcomes, outcomes) }
    },
  }
}

export function digitStrings(maxLength: number, zeroWeight: number): Domain {
  // 25-digit values above 10^24 start at 10^24 + 1. We use lengths >= 26
  // so all lengths admit the same independent first-digit construction.
  const minLength = 26
  const lengths = BigInt(maxLength - minLength + 1)
  const total = BigInt(zeroWeight + 9)
  const leadingChoices = 9n
  const outcomes = 10n ** BigInt(maxLength) - 10n ** BigInt(minLength - 1)
  const tickets = lengths * leadingChoices * total ** BigInt(maxLength - 1)
  const lengthOf = (ticket: bigint) => minLength + Number(ticket % lengths)
  function odds(value: Rational) {
    if (value.denominator !== 1n || value.numerator <= 0n) return fraction(0n, 1n)
    const digits = value.numerator.toString()
    if (digits.length < minLength || digits.length > maxLength) return fraction(0n, 1n)
    const zeros = digits.split('0').length - 1
    return fraction(BigInt(zeroWeight) ** BigInt(zeros), lengths * leadingChoices * total ** BigInt(digits.length - 1))
  }
  return {
    outcomes, tickets,
    at(ticket) {
      const length = lengthOf(ticket)
      ticket /= lengths
      let value = 1n + ticket % leadingChoices
      ticket /= leadingChoices
      for (let place = 1; place < length; place++) {
        const draw = ticket % total
        const digit = draw < BigInt(zeroWeight) ? 0n : draw - BigInt(zeroWeight) + 1n
        value = value * 10n + digit
        ticket /= total
      }
      return integer(value)
    },
    odds: (_, expression) => odds({ numerator: expression.kind === 'integer' ? expression.value : 0n, denominator: 1n }),
    event: ticket => ({ label: lengthOf(ticket) + '-digit integer', probability: fraction(1n, lengths) }),
    valueOdds: odds,
  }
}

export const baseTerminalTickets = 16n

export function terminalTicketPool(high: bigint, extras: readonly number[] = []) {
  const endings = Array.from({ length: 10 }, (_, index) => {
    const digit = BigInt(index)
    return { digit, extra: BigInt(extras[index] ?? 0), count: high >= digit ? (high - digit) / 10n + 1n : 0n }
  })
  const tickets = endings.reduce((sum, item) => sum + (baseTerminalTickets + item.extra) * item.count, 0n)
  return { endings, tickets }
}

/** The base and bonus tickets may denote the same integer, so report their sum. */
export function terminalWeighted(high: bigint, extras: readonly number[]): Domain {
  const outcomes = high + 1n
  const { endings, tickets } = terminalTicketPool(high, extras)
  function odds(value: Rational) {
    if (value.denominator !== 1n || value.numerator < 0n || value.numerator > high) return fraction(0n, 1n)
    return fraction(baseTerminalTickets + endings[Number(value.numerator % 10n)].extra, tickets)
  }
  return {
    tickets, outcomes,
    at(ticket) {
      if (ticket < baseTerminalTickets * outcomes) return integer(ticket % outcomes)
      ticket -= baseTerminalTickets * outcomes
      for (const item of endings) {
        const width = item.extra * item.count
        if (ticket < width) return integer(item.digit + 10n * (ticket % item.count))
        ticket -= width
      }
      throw new RangeError('Invalid classical ticket')
    },
    odds: (_, expression) => odds({ numerator: expression.kind === 'integer' ? expression.value : 0n, denominator: 1n }),
    valueOdds: odds,
  }
}
