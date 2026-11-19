import { distribution, generate, seededWords } from '../src/game/generator'
import { effectsOf, research } from '../src/game/research'
import { compareProbability, fraction } from '../src/game/math'

const samples = Number(process.argv[2] ?? 60_000)
if (!Number.isSafeInteger(samples) || samples < 20_000) throw new Error('Supply at least 20,000 offline samples')
const purchases = Object.fromEntries(research.filter(node => !node.refundable || node.id === 'magnitude-focus').map(node => [node.id, 1]))
const options = effectsOf(purchases).generator
const { bands, total } = distribution(options)
const observed = new Map(bands.map(band => [band.id, 0]))
const word = seededWords(0x524e47)
for (let index = 0; index < samples; index++) {
  const item = generate(options, word)
  observed.set(item.source, observed.get(item.source)! + 1)
  if (compareProbability(item.probability, item.event.probability) > 0) throw new Error('Expression odds exceed the containing event')
}
let chiSquare = 0
console.table(bands.map(band => {
  const expected = samples * Number(band.weight) / Number(total)
  const count = observed.get(band.id)!
  chiSquare += (count - expected) ** 2 / expected
  const exact = fraction(band.weight, total)
  return { family: band.id, odds: exact.numerator + '/' + exact.denominator, expected: expected.toFixed(1), observed: count }
}))
console.log('Family frequencies χ² ' + chiSquare.toFixed(2) + ' with ' + (bands.length - 1) + ' degrees of freedom.')
if (chiSquare > 44 || [...observed.values()].some(count => count === 0)) process.exitCode = 1
