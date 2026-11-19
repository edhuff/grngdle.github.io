export const nodeWidth = 164
export const nodeHeight = 56

export type Point = { x: number; y: number }

const positions: Record<string, [number, number]> = {
  yield: [720, 55],
  'place-value': [333, 145], catalog: [760, 145], odds: [1050, 145], compound: [1280, 145],
  radix: [196, 238], repetition: [444, 238], notation: [628, 238], squares: [840, 238], distribution: [1050, 238], fieldwork: [1280, 238],
  boundaries: [115, 333], measurement: [299, 333], motifs: [482, 333], operators: [677, 333],
  classifier: [870, 333], variance: [1050, 333], synergy: [1280, 333],
  horizon: [115, 430], bounds: [302, 430], symmetry: [490, 430], atlas: [875, 430], 'tail-model': [1050, 430], 'peer-review': [1280, 430],
  invariants: [302, 520], 'pattern-model': [490, 520], syntax: [686, 520], capital: [1280, 520],
  verification: [302, 613], grammar: [686, 613],
  synthesis: [473, 716], 'classical-review': [1020, 716],
  expansion: [720, 822],
  anomaly: [380, 931], 'magnitude-focus': [605, 931], 'rarity-focus': [833, 931], 'efficiency-focus': [1060, 931],
  arithmetic: [720, 1040], nesting: [720, 1144], vast: [720, 1248],
}

export function positionOf(id: string): Point {
  const point = positions[id]
  if (!point) throw new Error('Missing research position for ' + id)
  return { x: point[0], y: point[1] }
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

export function progressionPath(from: Point, to: Point, points: Point[]) {
  const halfWidth = nodeWidth / 2
  const halfHeight = nodeHeight / 2
  const gutter = 8
  const fromPort = { x: from.x, y: from.y + halfHeight }
  const toPort = { x: to.x, y: to.y - halfHeight }
  const middle = (fromPort.y + toPort.y) / 2
  const curve = `M${fromPort.x},${fromPort.y} C${from.x},${middle} ${to.x},${middle} ${toPort.x},${toPort.y}`
  const steps = Math.ceil(Math.max(Math.abs(to.x - from.x), toPort.y - fromPort.y) / 6)
  const obstacles = points.filter(point => (point.x !== from.x || point.y !== from.y) && (point.x !== to.x || point.y !== to.y))
  let blocked = false
  for (let index = 1; index < steps; index++) {
    const t = index / steps
    const rest = 1 - t
    const x = from.x * (rest ** 3 + 3 * rest ** 2 * t) + to.x * (3 * rest * t ** 2 + t ** 3)
    const y = fromPort.y * rest ** 3 + middle * 3 * rest * t + toPort.y * t ** 3
    if (obstacles.some(point => Math.abs(point.x - x) < halfWidth + gutter && Math.abs(point.y - y) < halfHeight + gutter)) {
      blocked = true
      break
    }
  }
  if (!blocked) return curve

  const start = { x: fromPort.x, y: fromPort.y + gutter }
  const end = { x: toPort.x, y: toPort.y - gutter }

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

  return best ? roundedPath([fromPort, ...best, toPort]) : curve
}
