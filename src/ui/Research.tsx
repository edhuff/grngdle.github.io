import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Check, ChevronRight, Crosshair, LockKeyhole, Minus, Plus, RotateCcw, X, Zap } from 'lucide-react'
import { progress, type Game } from '../game/game'
import { integerText } from '../game/math'
import { milestones } from '../game/progression'
import {
  dependencies, disciplines, familyGoal, meets, owns, rankCost, research, researchById, researchEra, researchStatus, startingStudy, type Requirement,
} from '../game/research'
import { nodeHeight, nodeWidth, positionOf, progressionPath, type Point } from './research-layout'

const states = {
  complete: 'Researched', locked: 'Prerequisites unmet', exclusive: 'Specialization active', unaffordable: 'Needs EP', available: 'Available',
}
const milestoneIds = new Set<string>(milestones)

function Requirements({ condition, game, onSelect }: { condition: Requirement; game: Game; onSelect: (id: string) => void }) {
  const complete = meets(condition, progress(game), game.lab)
  if (condition.kind === 'all' || condition.kind === 'any') return <div className="requirement-group">
    <small>{condition.kind === 'all' ? 'All of' : 'Any one of'}</small>
    {condition.items.map((item, index) => <Requirements key={index} condition={item} game={game} onSelect={onSelect} />)}
  </div>
  return <div className={'requirement' + (complete ? ' met' : '')}>{complete ? <Check size={14} /> : <LockKeyhole size={13} />}
    {condition.kind === 'node'
      ? <button className="text-button" onClick={() => onSelect(condition.id)}>{researchById.get(condition.id)?.title}<ChevronRight size={13} /></button>
      : condition.kind === 'families' && <span>{Object.keys(game.discoveries).length} / {familyGoal(condition.amount, game.lab)} discovered badge families</span>}
  </div>
}

type Camera = Point & { scale: number }
const moves: Record<string, [number, number]> = { ArrowLeft: [55, 0], ArrowRight: [-55, 0], ArrowUp: [0, 55], ArrowDown: [0, -55] }

function centered(canvas: HTMLDivElement, point: Point, scale: number, details: boolean): Camera {
  const narrow = canvas.clientWidth <= 720
  const x = canvas.clientWidth * (narrow || !details ? 0.5 : 0.39)
  const y = canvas.clientHeight * (narrow ? (details ? 0.32 : 0.23) : 0.50)
  return { x: x - point.x * scale, y: y - point.y * scale, scale }
}

function revealAtCurrentZoom(canvas: HTMLDivElement, point: Point, camera: Camera): Camera {
  const mobile = canvas.clientWidth <= 720
  const edge = 15
  const rightWindow = mobile ? 0 : Math.min(310, canvas.clientWidth * 0.4) + 20
  const bottom = mobile ? canvas.clientHeight * 0.51 : canvas.clientHeight - edge
  const halfWidth = nodeWidth * camera.scale / 2
  const halfHeight = nodeHeight * camera.scale / 2
  const x = camera.x + point.x * camera.scale
  const y = camera.y + point.y * camera.scale
  const visibleX = Math.max(edge + halfWidth, Math.min(canvas.clientWidth - rightWindow - edge - halfWidth, x))
  const visibleY = Math.max(82 + halfHeight, Math.min(bottom - halfHeight, y))
  return { ...camera, x: camera.x + visibleX - x, y: camera.y + visibleY - y }
}

export function ResearchView({ game, initialFocus, onBuy, onRefund }: {
  game: Game; initialFocus?: string; onBuy: (id: string) => void; onRefund: (id: string) => void
}) {
  const [selection, setSelection] = useState(initialFocus)
  const [view, setView] = useState<Camera>({ x: 0, y: 0, scale: 0.85 })
  const [dragging, setDragging] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointer: number; origin: Point; camera: Point } | null>(null)
  const current = progress(game)
  const era = researchEra(game.purchases)
  const graph = useMemo(() => {
    const shown = research.filter(item => (item.era ?? 0) <= era)
      .sort((a, b) => {
        const first = positionOf(a.id)
        const second = positionOf(b.id)
        return first.y - second.y || first.x - second.x
      })
    const ids = new Set(shown.map(item => item.id))
    const points = shown.map(item => positionOf(item.id))
    const edges = shown.flatMap(item => dependencies(item.requires).filter(id => ids.has(id)).map(id => ({
      from: id,
      to: item.id,
      line: progressionPath(positionOf(id), positionOf(item.id), points),
    })))
    return {
      shown, ids, edges,
      width: Math.max(...points.map(item => item.x)) + nodeWidth / 2 + 22,
      height: Math.max(...points.map(item => item.y)) + nodeHeight / 2 + 22,
    }
  }, [era])
  const edges = graph.edges.map(edge => ({ ...edge, active: edge.from === selection || edge.to === selection }))
    .sort((a, b) => Number(a.active) - Number(b.active))
  const selected = selection ? researchById.get(selection) : undefined
  const rank = selected ? owns(game.purchases, selected.id) : 0
  const status = selected ? researchStatus(selected, current, game.balance, game.lab) : undefined

  function overview(canvas: HTMLDivElement): Camera {
    const top = canvas.clientWidth <= 720 ? 100 : 95
    const bottom = 42
    const scale = Math.max(0.13, Math.min(1, (canvas.clientWidth - 30) / graph.width, (canvas.clientHeight - top - bottom) / graph.height))
    return { x: (canvas.clientWidth - graph.width * scale) / 2, y: top, scale }
  }

  function select(id: string, jump = false) {
    const canvas = viewport.current
    if (!canvas || !graph.ids.has(id)) return
    const point = positionOf(id)
    setSelection(id)
    setView(previous => jump || previous.scale < 0.65
      ? centered(canvas, point, jump ? 1 : 0.9, true)
      : revealAtCurrentZoom(canvas, point, previous))
  }

  function closeDetails() {
    setSelection(undefined)
    viewport.current?.focus()
  }

  function fit() {
    const canvas = viewport.current
    if (!canvas) return
    setSelection(undefined)
    setView(overview(canvas))
  }

  function zoom(factor: number, x?: number, y?: number) {
    const canvas = viewport.current
    if (!canvas) return
    const localX = x ?? canvas.clientWidth / 2
    const localY = y ?? canvas.clientHeight / 2
    setView(previous => {
      const scale = Math.max(0.13, Math.min(1.65, previous.scale * factor))
      return { scale, x: localX - (localX - previous.x) * scale / previous.scale, y: localY - (localY - previous.y) * scale / previous.scale }
    })
  }

  useLayoutEffect(() => {
    const canvas = viewport.current
    if (!canvas) return
    const starter = initialFocus && graph.ids.has(initialFocus) ? initialFocus : undefined
    if (canvas.clientWidth <= 720) {
      setView(centered(canvas, positionOf(starter ?? startingStudy), 0.92, !!starter))
    } else {
      const fitCamera = overview(canvas)
      setView(starter ? revealAtCurrentZoom(canvas, positionOf(starter), fitCamera) : fitCamera)
    }
    function wheel(event: WheelEvent) {
      event.preventDefault()
      const rect = canvas!.getBoundingClientRect()
      zoom(Math.exp(-Math.max(-150, Math.min(150, event.deltaY)) / 400), event.clientX - rect.left, event.clientY - rect.top)
    }
    canvas.addEventListener('wheel', wheel, { passive: false })
    return () => canvas.removeEventListener('wheel', wheel)
    // Keep the camera stable when purchases reveal extra nodes.
  }, [])

  function startPan(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || drag.current || (event.target as Element).closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointer: event.pointerId, origin: { x: event.clientX, y: event.clientY }, camera: view }
    setDragging(true)
  }

  function movePan(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (start?.pointer !== event.pointerId) return
    setView(previous => ({ ...previous, x: start.camera.x + event.clientX - start.origin.x, y: start.camera.y + event.clientY - start.origin.y }))
  }

  function stopPan(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointer !== event.pointerId) return
    drag.current = null
    setDragging(false)
  }

  return <section className="research-map" aria-label="Research graph" onKeyDown={event => {
    if (event.key === 'Escape' && selected) closeDetails()
  }}>
    <div className={'map-viewport' + (dragging ? ' dragging' : '')} ref={viewport} tabIndex={0}
      aria-label="Research canvas. Use arrow keys to pan and plus or minus to zoom."
      onPointerDown={startPan} onPointerMove={movePan} onPointerUp={stopPan} onPointerCancel={stopPan} onLostPointerCapture={stopPan}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return
        const offset = moves[event.key]
        if (offset) {
          event.preventDefault()
          setView(previous => ({ ...previous, x: previous.x + offset[0], y: previous.y + offset[1] }))
        }
        if (event.key === '+' || event.key === '-') zoom(event.key === '+' ? 1.2 : 1 / 1.2)
      }}>
      <div className="map-world" style={{ width: graph.width, height: graph.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
        <svg className="map-edges" width={graph.width} height={graph.height} aria-hidden="true">
          {edges.map(edge => <path key={edge.from + '/' + edge.to} d={edge.line} data-from={edge.from} data-to={edge.to}
            className={edge.active ? 'edge-highlight' : selection ? 'edge-muted' : undefined} />)}
        </svg>
        {graph.shown.map(item => {
          const state = researchStatus(item, current, game.balance, game.lab)
          const level = owns(game.purchases, item.id)
          const point = positionOf(item.id)
          const discipline = disciplines[item.discipline]
          return <div key={item.id} className="map-point" style={{
            left: point.x - nodeWidth / 2, top: point.y - nodeHeight / 2, width: nodeWidth, height: nodeHeight, '--discipline': discipline.color,
          } as CSSProperties}>
            <button aria-pressed={selection === item.id} title={item.title + ' · ' + states[state]}
              className={'map-node state-' + state + (milestoneIds.has(item.id) ? ' map-milestone' : '')}
              onClick={() => select(item.id)}
              onFocus={event => {
                if (!event.target.matches(':focus-visible')) return
                const canvas = viewport.current
                if (!canvas) return
                const x = view.x + point.x * view.scale
                const y = view.y + point.y * view.scale
                if (x < 100 || x > canvas.clientWidth - 100 || y < 90 || y > canvas.clientHeight - 50) {
                  setView(previous => centered(canvas, point, Math.max(0.85, previous.scale), !!selection))
                }
              }}>
              <strong>{item.title}</strong>
              <span className="map-node-meta">
                <small className="map-node-type" title={discipline.name}>{discipline.short}</small>
                <small className="map-node-cost">{state === 'complete' ? 'Researched' : integerText(rankCost(item, level, game.lab)) + ' EP'}{item.max ? ' · ' + level + '/' + item.max : ''}</small>
              </span>
              {state === 'complete' ? <Check size={15} /> : (state === 'locked' || state === 'exclusive') && <LockKeyhole size={13} />}
            </button>
          </div>
        })}
      </div>
    </div>

    <header className="map-toolbar">
      <div><h1>Research map</h1><p>{Object.keys(game.purchases).length} / {graph.shown.length} researched</p></div>
      <select aria-label="Jump to research" value="" onChange={event => select(event.target.value, true)}>
        <option value="" disabled>Jump to research</option>
        {[startingStudy, ...milestones].filter(id => graph.ids.has(id)).map(id =>
          <option key={id} value={id}>{researchById.get(id)?.title}</option>)}
      </select>
    </header>

    {selected && status && <aside className="node-detail" aria-label="Research details" key={selected.id}>
      <button className="inspector-close" aria-label="Close research details" onClick={closeDetails}><X size={19} /></button>
      <span className="discipline-label">{disciplines[selected.discipline].name}</span>
      <h2>{selected.title}</h2>
      <p>{selected.description}</p>
      <span className={'research-state state-' + status}>{states[status]}{selected.max ? ' · Rank ' + rank + ' / ' + selected.max : ''}</span>
      {selected.requires && <div className="node-requirements"><h3>Prerequisites</h3><Requirements condition={selected.requires} game={game} onSelect={id => select(id, true)} /></div>}
      {status !== 'complete' && <button className="primary-button" disabled={status !== 'available'} onClick={() => onBuy(selected.id)}>
        <Zap size={16} /> Research · {integerText(rankCost(selected, rank, game.lab))} EP
      </button>}
      {selected.refundable && rank > 0 && <button className="secondary-button" onClick={() => onRefund(selected.id)}><RotateCcw size={15} /> Refund specialization</button>}
    </aside>}

    <div className="map-controls">
      <button title="Zoom out" aria-label="Zoom out" onClick={() => zoom(1 / 1.22)}><Minus size={17} /></button>
      <span aria-label="Map zoom">{Math.round(view.scale * 100)}%</span>
      <button title="Zoom in" aria-label="Zoom in" onClick={() => zoom(1.22)}><Plus size={17} /></button>
      <button title="Fit graph" aria-label="Fit graph" onClick={fit}><Crosshair size={16} /></button>
    </div>
  </section>
}
