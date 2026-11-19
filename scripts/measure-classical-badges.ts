import { writeFileSync } from 'node:fs'
import { badgeIds, evaluateAttributes, initialFamilies, type BadgeId } from '../src/game/attributes'
import { CLASSICAL_MAX } from '../src/game/generator'
import { integer } from '../src/game/math'
import { researchProperties, type PropertyId } from '../src/game/research-properties'

const counts = new Map<BadgeId, number[]>(badgeIds.map(id => [id, Array<number>(10).fill(0)]))
const properties = new Set(Object.keys(researchProperties) as PropertyId[])
for (let n = 0n; n <= CLASSICAL_MAX; n++) {
  const digit = Number(n % 10n)
  const badges = evaluateAttributes(integer(n), [...initialFamilies, 'rhythm', 'powers'], false, false, properties)
  for (const badge of badges) counts.get(badge.id)![digit]++
}
const rows = [...counts].filter(([, hits]) => hits.some(Boolean)).map(([id, hits]) => `  ${id}: [${hits.join(', ')}],`)
writeFileSync('src/game/generation/classical-frequencies.ts',
  '// Exact exhaustive counts by terminal digit over 0–1,000,000. Regenerate with npm run measure:badges.\n' +
  'export const classicalFrequencies: Readonly<Record<string, readonly number[] | undefined>> = {\n' + rows.join('\n') + '\n}\n')
