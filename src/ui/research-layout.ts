import { dependencies, research, startingStudy } from '../game/research'
import { classicalClusters } from '../game/research/classical'
import type { ResearchNode } from '../game/research/model'

export const nodeWidth = 178
export const nodeHeight = 62
export type Point = { x: number; y: number }
export type Box = { left: number; top: number; right: number; bottom: number }

function edgePath(from: Point, to: Point) {
  const y1 = from.y + nodeHeight / 2
  const y2 = to.y - nodeHeight / 2
  const middle = (y1 + y2) / 2
  return `M${from.x},${y1} C${from.x},${middle} ${to.x},${middle} ${to.x},${y2}`
}

export function buildAtlases(nodes: readonly ResearchNode[]) {
  const researchById = new Map(nodes.map(item => [item.id, item]))
  const regionSizes = Array.from({ length: 8 }, (_, region) => nodes.filter(item => item.region === region))
  const depths = new Map<string, number>()
  function depth(item: ResearchNode): number {
    const cached = depths.get(item.id)
    if (cached !== undefined) return cached
    const parents = dependencies(item.requires).map(id => researchById.get(id)!).filter(parent => parent.region === item.region)
    const rank = parents.length ? 1 + Math.max(...parents.map(depth)) : 0
    depths.set(item.id, rank)
    return rank
  }

  return regionSizes.map((items, region) => {
    const groups = region === 0 ? [...classicalClusters] : [...new Set(items.map(item => item.cluster!))]
    // Each stage spans all clusters. This keeps cross-cluster prerequisites flowing forward.
    const positions = new Map<string, Point>()
    const lanes = groups.map(name => {
      const stages = new Map<number, ResearchNode[]>()
      for (const item of items.filter(item => item.cluster === name)) {
        const rank = depth(item)
        const group = stages.get(rank) ?? []
        group.push(item)
        stages.set(rank, group)
      }
      return { name, stages }
    })
    const stageCount = Math.max(0, ...items.map(depth)) + 1
    // Move the founding study to the center of the opening branches.
    const openingLane = groups.indexOf('EP Economics')
    const laneWidths = lanes.map(lane => 46 + Math.min(3, Math.max(1, ...[...lane.stages.values()].map(group => group.length))) * 202)
    const laneOffsets = laneWidths.map((_, index) => 18 + laneWidths.slice(0, index).reduce((sum, width) => sum + width, 0))
    const lanesWithBoxes = lanes.map((lane, index) => ({ ...lane, left: laneOffsets[index], width: laneWidths[index] }))
    let y = 125
    for (let rank = 0; rank < stageCount; rank++) {
      let rows = 1
      for (const lane of lanesWithBoxes) {
        const group = lane.stages.get(rank) ?? []
        const columns = Math.min(3, group.length)
        rows = Math.max(rows, Math.ceil(group.length / 3))
        group.forEach((item, index) => {
          const row = Math.floor(index / 3)
          const count = Math.min(columns, group.length - row * 3)
          const x = lane.left + lane.width / 2 + (index % 3 - (count - 1) / 2) * 202
          positions.set(item.id, { x, y: y + row * 77 + (index % 2 ? 7 : 0) })
        })
      }
      y += rows * 90 + 22
    }
    if (openingLane >= 0 && positions.has(startingStudy) && positions.has('place-value') && positions.has('catalog')) {
      const start = positions.get(startingStudy)!
      const place = positions.get('place-value')!
      const catalog = positions.get('catalog')!
      start.x = (place.x + catalog.x) / 2
    }

    const edges = items.flatMap(item => dependencies(item.requires).flatMap(from => {
      const a = positions.get(from)
      const b = positions.get(item.id)!
      if (!a) return []
      return [{
        from, to: item.id, path: edgePath(a, b),
        bounds: { left: Math.min(a.x, b.x), right: Math.max(a.x, b.x), top: a.y, bottom: b.y },
        crossCluster: researchById.get(from)?.cluster !== item.cluster,
      }]
    }))
    return { items, positions, edges, groups: lanesWithBoxes, width: 36 + laneWidths.reduce((sum, width) => sum + width, 0), height: y }
  })
}

export const atlases = buildAtlases(research)

export function overlaps(a: Box, b: Box) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top
}
