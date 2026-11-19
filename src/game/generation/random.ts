export type WordSource = () => number

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
  for (let attempt = 0; attempt < 256; attempt++) {
    let candidate = 0n
    for (let index = 0; index < words; index++) candidate = (candidate << 32n) | BigInt(word())
    candidate &= mask
    if (candidate < limit) return candidate
  }
  throw new Error('Random source failed rejection sampling')
}
