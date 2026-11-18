export const nodeWidth = 164
export const nodeHeight = 56

export type Point = { x: number; y: number }

const positions: Record<string, [number, number]> = {
  journal: [125, 90], archive: [330, 65], inspection: [535, 75], registry: [770, 91],
  yield: [140, 180], compound: [345, 190], synergy: [575, 210], capital: [830, 220],
  catalog: [105, 285], squares: [325, 290], classifier: [550, 316], atlas: [815, 340],
  repetition: [165, 405], motifs: [365, 397], symmetry: [600, 425], 'pattern-model': [850, 451],
  odds: [100, 511], distribution: [303, 495], variance: [545, 535], 'tail-model': [835, 565],
  'place-value': [155, 618], radix: [365, 602], boundaries: [600, 637], horizon: [850, 666],
  notation: [108, 726], operators: [325, 719], syntax: [535, 746], grammar: [790, 762],
  measurement: [155, 832], bounds: [390, 820], invariants: [635, 847], verification: [875, 875],
  fieldwork: [770, 161], 'peer-review': [960, 145], synthesis: [1135, 260], 'classical-review': [1325, 337],
  expansion: [1510, 474], arithmetic: [1735, 437], nesting: [1960, 437], vast: [1760, 618],
  anomaly: [1508, 661],
  'magnitude-focus': [1484, 808], 'rarity-focus': [1700, 843], 'efficiency-focus': [1920, 799],
}

export function positionOf(id: string): Point {
  const point = positions[id]
  if (!point) throw new Error('Missing research position for ' + id)
  return { x: point[0], y: point[1] }
}

const expansionJunctionX = 1230
const expansionY = positionOf('expansion').y
const junctionBend = 12

function inletBend(sourceY: number) {
  return Math.max(0, Math.min(24, Math.abs(sourceY - expansionY) - junctionBend))
}

export function expansionJunction(sources: Point[]) {
  const x = expansionJunctionX
  const y = expansionY
  const inlets = sources.map(point => point.y + Math.sign(y - point.y) * inletBend(point.y))
  const top = Math.min(y, ...inlets)
  const bottom = Math.max(y, ...inlets)
  const trunk = [
    top < y ? `M${x},${top} V${y - junctionBend} Q${x},${y} ${x + junctionBend},${y}` : '',
    bottom > y ? `M${x},${bottom} V${y + junctionBend} Q${x},${y} ${x + junctionBend},${y}` : '',
  ].filter(Boolean).join(' ')
  return {
    trunk,
    exit: `M${x + junctionBend},${y} H${positionOf('expansion').x - nodeWidth / 2}`,
  }
}

export function expansionLink(from: Point) {
  const x = expansionJunctionX
  const radius = inletBend(from.y)
  const start = `M${from.x + nodeWidth / 2},${from.y}`
  if (from.y === expansionY) return `${start} H${x + junctionBend}`
  const joinY = from.y + Math.sign(expansionY - from.y) * radius
  return `${start} H${x - radius} Q${x},${from.y} ${x},${joinY}`
}

export function overviewPath(from: Point, to: Point) {
  const start = from.x + nodeWidth / 2
  const end = to.x - nodeWidth / 2
  const middle = (start + end) / 2
  return `M${start},${from.y} C${middle},${from.y} ${middle},${to.y} ${end},${to.y}`
}

function roundedPath(route: Point[]) {
  const points = route.filter((point, index) =>
    index === 0 || point.x !== route[index - 1].x || point.y !== route[index - 1].y)
  const segments = [`M${points[0].x},${points[0].y}`]

  for (let index = 1; index < points.length - 1; index++) {
    const [previous, corner, next] = [points[index - 1], points[index], points[index + 1]]
    if ((previous.x === corner.x && next.x === corner.x) ||
        (previous.y === corner.y && next.y === corner.y)) continue

    const incoming = Math.hypot(previous.x - corner.x, previous.y - corner.y)
    const outgoing = Math.hypot(next.x - corner.x, next.y - corner.y)
    const radius = Math.min(22, incoming / 2, outgoing / 2)
    const before = {
      x: corner.x + (previous.x - corner.x) * radius / incoming,
      y: corner.y + (previous.y - corner.y) * radius / incoming,
    }
    const after = {
      x: corner.x + (next.x - corner.x) * radius / outgoing,
      y: corner.y + (next.y - corner.y) * radius / outgoing,
    }
    segments.push(`L${before.x},${before.y} Q${corner.x},${corner.y} ${after.x},${after.y}`)
  }

  const last = points[points.length - 1]
  segments.push(`L${last.x},${last.y}`)
  return segments.join(' ')
}

export function focusPath(from: Point, to: Point, points: Point[]) {
  const halfWidth = nodeWidth / 2
  const halfHeight = nodeHeight / 2
  const gutter = 8
  const horizontal = Math.abs(to.x - from.x) > nodeWidth + gutter * 2
  const travel = Math.sign(horizontal ? to.x - from.x : to.y - from.y) || 1
  const offset = (point: Point, length: number): Point => horizontal
    ? { x: point.x + length * travel, y: point.y }
    : { x: point.x, y: point.y + length * travel }
  const boundary = horizontal ? halfWidth : halfHeight
  const start = offset(from, boundary + gutter)
  const end = offset(to, -(boundary + gutter))

  const segmentIsClear = (a: Point, b: Point) => !points.some(node =>
    Math.min(a.x, b.x) < node.x + halfWidth + gutter &&
    Math.max(a.x, b.x) > node.x - halfWidth - gutter &&
    Math.min(a.y, b.y) < node.y + halfHeight + gutter &&
    Math.max(a.y, b.y) > node.y - halfHeight - gutter
  )

  let best: Point[] | undefined
  let distance = Infinity
  const consider = (corners: Point[]) => {
    const path = [start, ...corners, end].filter((point, index, all) =>
      index === 0 || point.x !== all[index - 1].x || point.y !== all[index - 1].y)
    let score = 18 * path.length
    for (let index = 1; index < path.length; index++) {
      const a = path[index - 1]
      const b = path[index]
      if (!segmentIsClear(a, b)) return
      score += Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
    }
    if (score < distance) {
      distance = score
      best = path
    }
  }
  const xChannels = [...new Set(points.flatMap(({ x }) => [x - halfWidth - gutter, x + halfWidth + gutter]))]
  const yChannels = [...new Set(points.flatMap(({ y }) => [y - halfHeight - gutter, y + halfHeight + gutter]))]
  for (const x of [(start.x + end.x) / 2, start.x, end.x, ...xChannels]) {
    consider([{ x, y: start.y }, { x, y: end.y }])
  }
  for (const y of [(start.y + end.y) / 2, start.y, end.y, ...yChannels]) {
    consider([{ x: start.x, y }, { x: end.x, y }])
  }
  if (!best) {
    for (const x of xChannels) {
      for (const y of yChannels) {
        consider([{ x, y: start.y }, { x, y }, { x: end.x, y }])
        consider([{ x: start.x, y }, { x, y }, { x, y: end.y }])
      }
    }
  }

  const route = [offset(from, boundary), ...(best ?? [start, { x: end.x, y: start.y }, end]), offset(to, -boundary)]
  return roundedPath(route)
}
