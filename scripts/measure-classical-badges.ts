import { writeFileSync } from 'node:fs'
import { badgeIds, badgeRule, evaluateAttributes, initialFamilies, type BadgeId } from '../src/game/attributes'
import { CLASSICAL_MAX } from '../src/game/generator'
import { integer } from '../src/game/math'
import { researchProperties, type PropertyId } from '../src/game/research-properties'

const counts = new Map<BadgeId, number[]>(badgeIds.map(id => [id, Array<number>(10).fill(0)]))
const signatures = new Map<bigint, number>()
const bitFor = new Map(badgeIds.filter(id => badgeRule(id).family !== 'structure' && id !== 'longInteger')
  .map((id, index) => [id, 1n << BigInt(index + 4)]))
const properties = new Set(Object.keys(researchProperties) as PropertyId[])
for (let n = 0n; n <= CLASSICAL_MAX; n++) {
  const digit = Number(n % 10n)
  const badges = evaluateAttributes(integer(n), [...initialFamilies, 'rhythm', 'powers'], false, false, properties)
  let key = BigInt(digit)
  for (const badge of badges) {
    counts.get(badge.id)![digit]++
    const bit = bitFor.get(badge.id)
    if (bit === undefined) throw new Error('Missing signature bit for ' + badge.id)
    key |= bit
  }
  signatures.set(key, (signatures.get(key) ?? 0) + 1)
}
const rows = [...counts].filter(([, hits]) => hits.some(Boolean)).map(([id, hits]) => `  ${id}: [${hits.join(', ')}],`)
writeFileSync('src/game/generation/classical-frequencies.ts',
  '// Exact exhaustive counts by terminal digit over 0–1,000,000. Regenerate with npm run measure:badges.\n' +
  'export const classicalFrequencies: Readonly<Record<string, readonly number[] | undefined>> = {\n' + rows.join('\n') + '\n}\n')

// Sort by badge mask and then digit. Compact the key deltas and counts as
// variable-length integers, so the exact histogram requires no runtime sweep.
if (bitFor.size > 60) throw new Error('Classical badge signatures exceed 64 bits')
const bytes: number[] = []
function append(value: bigint) {
  while (value >= 128n) {
    bytes.push(Number(value & 127n) | 128)
    value >>= 7n
  }
  bytes.push(Number(value))
}
let previous = 0n
for (const key of [...signatures.keys()].sort((a, b) => a < b ? -1 : a > b ? 1 : 0)) {
  append(key - previous)
  append(BigInt(signatures.get(key)!))
  previous = key
}
const encoded = Buffer.from(bytes).toString('base64').match(/.{1,120}/g) ?? []
writeFileSync('src/game/generation/classical-signatures.ts',
  '// Exact badge combinations by final digit. Regenerate with npm run measure:badges.\n' +
  'export const signatureBadges = ' + JSON.stringify([...bitFor.keys()]) + ' as const\n' +
  'export const signatureCount = ' + signatures.size + '\n' +
  'export const packedSignatures =\n  ' + encoded.map(line => JSON.stringify(line)).join(' +\n  ') + '\n')
console.log(signatures.size + ' Classical badge and digit combinations')
