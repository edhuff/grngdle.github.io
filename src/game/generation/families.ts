import { integer, type Expression } from '../math/ast'
import { addOrdinals, finiteOrdinal, omegaPower } from '../math/ordinal'
import { fraction } from '../math/probability'
import { digitStrings, product, variants, type Domain } from './domains'
import type { AdvancedFamily, FamilyParameters } from './config'

function binary(kind: 'subtract' | 'divide', size: bigint): Domain {
  return {
    ...product([size, size], ([a, b]) => ({ kind, left: integer(a + 2n), right: integer(b + 2n) })),
    valueOdds({ numerator, denominator }) {
      if (kind === 'subtract') {
        const offset = numerator < 0n ? -numerator : numerator
        return fraction(denominator === 1n && offset < size ? size - offset : 0n, size ** 2n)
      }
      if (numerator <= 0n) return fraction(0n, size ** 2n)
      const largestTerm = numerator > denominator ? numerator : denominator
      const last = (size + 1n) / largestTerm
      const first = numerator === 1n || denominator === 1n ? 2n : 1n
      return fraction(last >= first ? last - first + 1n : 0n, size ** 2n)
    },
  }
}

function towerChoices(maxHeight: number, width: bigint) {
  return Array.from({ length: maxHeight - 2 }, (_, index) => {
    const height = index + 3
    return {
      label: 'Power tower of height ' + height,
      domain: product(Array<bigint>(height).fill(width), choices => ({ kind: 'tower', terms: choices.map(a => integer(a + 2n)) })),
    }
  })
}

export const advancedDomains: Record<AdvancedFamily, (params: FamilyParameters) => Domain> = {
  digits: p => digitStrings(p.complexity, p.digitBias),
  subtraction: p => binary('subtract', BigInt(p.operandMax - 1)),
  division: p => binary('divide', BigInt(p.operandMax - 1)),
  factorials: p => product([BigInt(p.operandMax - 1)], ([n]) => ({ kind: 'factorial', operand: integer(n + 2n) })),
  powers(p) {
    const width = BigInt(p.operandMax - 1)
    return variants(Array.from({ length: p.complexity }, (_, index) => ({
      label: index === 0 ? 'Simple power' : 'Nested exponent depth ' + (index + 1),
      domain: product(Array<bigint>(index + 2).fill(width), choices => choices.map(a => integer(a + 2n))
        .reduceRight((right, left): Expression => ({ kind: 'power', left, right }))),
    })))
  },
  towers: p => variants(towerChoices(p.complexity, BigInt(p.operandMax - 1))),
  tetration(p) {
    const heights = BigInt(p.complexity)
    return {
      ...product([heights, BigInt(p.operandMax - 1)], ([height, base]) => ({ kind: 'hyper', rank: 4n, base: base + 2n, height: height + 2n })),
      event: ticket => ({ label: 'Tetration height ' + (ticket % heights + 2n), probability: fraction(1n, heights) }),
    }
  },
  hyperoperations(p) {
    const width = BigInt(p.operandMax - 1)
    return variants(Array.from({ length: p.complexity }, (_, level) => ({
      label: 'Hyperoperation rank ' + (level + 5),
      domain: product([width, width], ([base, height]) => ({ kind: 'hyper', rank: BigInt(level + 5), base: base + 2n, height: height + 2n })),
    })))
  },
  arrows(p) {
    const ranks = 10n ** BigInt(p.complexity)
    const width = BigInt(p.operandMax - 1)
    return {
      ...product([ranks, width, width], ([rank, base, height]) => ({
        kind: 'arrow', rank: rank + 1n, base: base + 2n, height: height + 2n,
      })),
      event: ticket => ({ label: 'Knuth arrow count ' + (ticket % ranks + 1n), probability: fraction(1n, ranks) }),
    }
  },
  chains(p) {
    const width = BigInt(p.operandMax - 1)
    const forms = Array.from({ length: p.complexity - 2 }, (_, index) => {
      const length = index + 3
      return { label: 'Conway chain of length ' + length,
        domain: product(Array<bigint>(length).fill(width), choices => ({ kind: 'chain', terms: choices.map(n => integer(n + 2n)) })) }
    })
    if (p.complexity >= 4) forms.push({ label: 'Nested Conway chain', domain: product(Array<bigint>(5).fill(width), choices => {
      const terms = choices.map(n => integer(n + 2n))
      return { kind: 'chain', terms: [{ kind: 'chain', terms: terms.slice(0, 3) }, ...terms.slice(3)] }
    }) })
    return variants(forms)
  },
  hierarchy(p) {
    const width = BigInt(p.operandMax)
    const polynomial = product([BigInt(p.complexity), width, width, width], ([exponent, coefficient, tail, argument]) => ({
      kind: 'fgh',
      index: addOrdinals([{ exponent: finiteOrdinal(exponent + 1n), coefficient: coefficient + 1n }], finiteOrdinal(tail)),
      argument,
    }))
    return variants([
      { label: 'Finite fast-growing index', domain: product([width, width], ([rank, argument]) =>
        ({ kind: 'fgh', index: finiteOrdinal(rank), argument })) },
      { label: 'Ordinal polynomial index', domain: polynomial },
      { label: 'Iterated omega index', domain: product([BigInt(p.complexity), width], ([rank, argument]) =>
        ({ kind: 'fgh', index: omegaPower(omegaPower(finiteOrdinal(rank + 1n))), argument })) },
    ])
  },
  busy(p) {
    const width = BigInt(p.operandMax)
    return variants((['steps', 'ones'] as const).map(variant => ({
      label: variant === 'steps' ? 'Busy Beaver steps' : 'Busy Beaver ones',
      domain: product([width], ([states]) => ({ kind: 'busy', variant, states: states + 1n })),
    })))
  },
  ackermann: p => product([BigInt(p.complexity + 1), BigInt(p.operandMax + 1)], ([rank, argument]) => ({
    kind: 'ackermann', rank, argument,
  })),
}
