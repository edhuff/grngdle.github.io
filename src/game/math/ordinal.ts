// Cantor normal form for ordinals below epsilon_0. The empty sum is zero.
export type Ordinal = readonly { exponent: Ordinal; coefficient: bigint }[]

export const zeroOrdinal: Ordinal = []
export const finiteOrdinal = (n: bigint): Ordinal => {
  if (n < 0n) throw new RangeError('Negative ordinal')
  return n === 0n ? [] : [{ exponent: [], coefficient: n }]
}

export function compareOrdinals(a: Ordinal, b: Ordinal): -1 | 0 | 1 {
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    const order = compareOrdinals(a[index].exponent, b[index].exponent)
    if (order !== 0) return order
    if (a[index].coefficient !== b[index].coefficient) return a[index].coefficient < b[index].coefficient ? -1 : 1
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1
}

export function omegaPower(exponent: Ordinal): Ordinal {
  return [{ exponent, coefficient: 1n }]
}

export function addOrdinals(a: Ordinal, b: Ordinal): Ordinal {
  if (b.length === 0) return a
  const head = b[0]
  const result: Ordinal[number][] = []
  for (const term of a) {
    const order = compareOrdinals(term.exponent, head.exponent)
    if (order < 0) break
    if (order === 0) return [...result, { ...head, coefficient: term.coefficient + head.coefficient }, ...b.slice(1)]
    result.push(term)
  }
  return [...result, ...b]
}

export function multiplyOrdinals(a: Ordinal, b: Ordinal): Ordinal {
  if (!a.length || !b.length) return zeroOrdinal
  let product: Ordinal = zeroOrdinal
  for (const term of b) {
    const part = term.exponent.length
      ? [{ exponent: addOrdinals(a[0].exponent, term.exponent), coefficient: term.coefficient }]
      : [{ ...a[0], coefficient: a[0].coefficient * term.coefficient }, ...a.slice(1)]
    product = addOrdinals(product, part)
  }
  return product
}

export function predecessor(value: Ordinal): Ordinal | null {
  const tail = value.at(-1)
  if (!tail || tail.exponent.length) return null
  return tail.coefficient === 1n ? value.slice(0, -1)
    : [...value.slice(0, -1), { ...tail, coefficient: tail.coefficient - 1n }]
}

export function fundamentalSequence(limit: Ordinal, n: bigint): Ordinal {
  const tail = limit.at(-1)
  if (!tail?.exponent.length || n < 0n) throw new RangeError('Expected a nonzero limit ordinal and natural index')
  const prefix = tail.coefficient === 1n ? limit.slice(0, -1)
    : [...limit.slice(0, -1), { ...tail, coefficient: tail.coefficient - 1n }]
  const previous = predecessor(tail.exponent)
  return [...prefix, previous === null
    ? { exponent: fundamentalSequence(tail.exponent, n), coefficient: 1n }
    : { exponent: previous, coefficient: n + 1n }]
}

export function ordinalDepth(value: Ordinal): number {
  return value.reduce((max, term) => Math.max(max, 1 + ordinalDepth(term.exponent)), 0)
}

export function isCanonicalOrdinal(value: Ordinal): boolean {
  let remaining = 512
  function visit(ordinal: Ordinal, depth: number): boolean {
    if (depth > 32 || ordinal.length > remaining) return false
    remaining -= ordinal.length
    for (let index = 0; index < ordinal.length; index++) {
      const term = ordinal[index]
      if (term.coefficient <= 0n || !visit(term.exponent, depth + 1)) return false
      if (index && compareOrdinals(ordinal[index - 1].exponent, term.exponent) <= 0) return false
    }
    return true
  }
  return visit(value, 0)
}
