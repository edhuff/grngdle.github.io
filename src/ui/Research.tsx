import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Check, ChevronRight, Crosshair, FlaskConical, GitBranch, Hand, LockKeyhole, Minus, Plus, RotateCcw, Zap } from 'lucide-react'
import { progress, type Game } from '../game/game'
import { integerText } from '../game/math'
import { milestones } from '../game/progression'
import {
  dependencies, disciplines, eras, familyGoal, meets, owns, rankCost, research, researchById, researchEra, researchStatus, rollGoal, type Requirement, type ResearchNode,
} from '../game/research'

const column = 200
const rowGap = 114
const width = column * disciplines.length
const nodeWidth = 164
const nodeHeight = 68
const left = (item: ResearchNode) => 18 + item.discipline * column
const top = (item: ResearchNode) => 61 + item.row * rowGap

const states = {
  complete: 'Researched', locked: 'Prerequisites unmet', exclusive: 'Specialization active', unaffordable: 'Needs EP', available: 'Available',
}

function Requirements({ condition, game, onSelect }: { condition: Requirement; game: Game; onSelect: (id: string) => void }) {
  const complete = meets(condition, progress(game), game.lab)
  if (condition.kind === 'all' || condition.kind === 'any') return <div className="requirement-group">
    <small>{condition.kind === 'all' ? 'ALL OF' : 'ANY ONE OF'}</small>
    {condition.items.map((item, index) => <Requirements key={index} condition={item} game={game} onSelect={onSelect} />)}
  </div>
  return <div className={'requirement' + (complete ? ' met' : '')}>{complete ? <Check size={13} /> : <LockKeyhole size={12} />}
    {condition.kind === 'node'
      ? <button className="text-button" onClick={() => onSelect(condition.id)}>{researchById.get(condition.id)?.title}<ChevronRight size={12} /></button>
      : condition.kind === 'rolls'
        ? <span>{game.rolls.toLocaleString()} / {rollGoal(condition.amount, game.lab).toLocaleString()} manual rolls</span>
        : condition.kind === 'families' && <span>{Object.keys(game.discoveries).length} / {familyGoal(condition.amount, game.lab)} discovered badge families</span>}
  </div>
}

export function ResearchView({ game, onBuy, onRefund }: { game: Game; onBuy: (id: string) => void; onRefund: (id: string) => void }) {
  const [selection, setSelection] = useState(() => {
    if (!owns(game.purchases, 'yield')) return 'yield'
    return milestones.find(item => !owns(game.purchases, item.id))?.id ?? 'vast'
  })
  const [view, setView] = useState({ x: -600, y: 16, scale: 0.84 })
  const [dragging, setDragging] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; fromX: number; fromY: number } | null>(null)
  const current = progress(game)
  const era = researchEra(game.purchases)
  const shown = research.filter(item => (item.era ?? 0) <= era)
  const height = top(shown.reduce((a, b) => a.row >= b.row ? a : b)) + nodeHeight + 22
  const shownIds = new Set(shown.map(item => item.id))
  const selected = researchById.get(selection)!
  const rank = owns(game.purchases, selection)
  const status = researchStatus(selected, current, game.balance, game.lab)

  function focus(id: string) {
    const item = researchById.get(id)
    const canvas = viewport.current
    if (!item || !canvas) return
    setSelection(id)
    setView(previous => ({
      x: canvas.clientWidth / 2 - (left(item) + nodeWidth / 2) * previous.scale,
      y: canvas.clientHeight * 0.38 - (top(item) + nodeHeight / 2) * previous.scale,
      scale: previous.scale,
    }))
  }

  function fit() {
    const canvas = viewport.current
    if (!canvas) return
    const scale = Math.min(1, (canvas.clientWidth - 20) / width, (canvas.clientHeight - 20) / height)
    setView({ x: (canvas.clientWidth - width * scale) / 2, y: 10, scale })
  }

  function changeZoom(factor: number, localX?: number, localY?: number) {
    const canvas = viewport.current
    if (!canvas) return
    const x = localX ?? canvas.clientWidth / 2
    const y = localY ?? canvas.clientHeight / 2
    setView(previous => {
      const scale = Math.max(0.13, Math.min(1.6, previous.scale * factor))
      return { scale, x: x - (x - previous.x) * scale / previous.scale, y: y - (y - previous.y) * scale / previous.scale }
    })
  }

  useEffect(() => {
    const canvas = viewport.current
    if (!canvas) return
    const item = researchById.get(selection)!
    setView({ x: canvas.clientWidth / 2 - (left(item) + nodeWidth / 2) * 0.84, y: item.row ? canvas.clientHeight * 0.52 - (top(item) + nodeHeight / 2) * 0.84 : 15, scale: 0.84 })
    function wheel(event: WheelEvent) {
      event.preventDefault()
      const rect = canvas!.getBoundingClientRect()
      changeZoom(Math.exp(-Math.max(-150, Math.min(150, event.deltaY)) / 400), event.clientX - rect.left, event.clientY - rect.top)
    }
    canvas.addEventListener('wheel', wheel, { passive: false })
    return () => canvas.removeEventListener('wheel', wheel)
    // Center the initial node once. Later purchases shouldn't move the canvas.
  }, [])

  function startPan(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as Element).closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, fromX: view.x, fromY: view.y }
    setDragging(true)
  }

  function movePan(event: PointerEvent<HTMLDivElement>) {
    const origin = drag.current
    if (origin) setView(previous => ({ ...previous, x: origin.fromX + event.clientX - origin.x, y: origin.fromY + event.clientY - origin.y }))
  }

  function stopPan() {
    drag.current = null
    setDragging(false)
  }

  return <>
    <div className="page-heading"><div><span className="era-pill"><i /> {eras[era]}</span><h1>Research map<span>.</span></h1>
      <p>Spend EP on studies that expand what a roll can become.</p></div></div>
    <div className="research-layout">
      <section className="panel map-panel" aria-label="Research graph">
        <div className="map-toolbar">
          <div className="map-title"><GitBranch size={16} /> Research network <span className="count-pill">{Object.keys(game.purchases).length} / {shown.length}</span></div>
          <select aria-label="Jump to discipline" value="" onChange={event => {
            const item = research.find(item => item.discipline === Number(event.target.value))
            if (item) focus(item.id)
          }}><option value="" disabled>Jump to discipline</option>{disciplines.map((entry, index) => <option key={entry.name} value={index}>{entry.name}</option>)}</select>
        </div>
        <div className={'map-viewport' + (dragging ? ' dragging' : '')} ref={viewport} tabIndex={0}
          aria-label="Research canvas. Use arrow keys to pan and plus or minus to zoom."
          onPointerDown={startPan} onPointerMove={movePan} onPointerUp={stopPan} onPointerCancel={stopPan} onLostPointerCapture={stopPan}
          onKeyDown={event => {
            if (event.target !== event.currentTarget) return
            const moves: Record<string, [number, number]> = { ArrowLeft: [45, 0], ArrowRight: [-45, 0], ArrowUp: [0, 45], ArrowDown: [0, -45] }
            const offset = moves[event.key]
            if (offset) {
              event.preventDefault()
              setView(previous => ({ ...previous, x: previous.x + offset[0], y: previous.y + offset[1] }))
            }
            if (event.key === '+' || event.key === '-') changeZoom(event.key === '+' ? 1.2 : 1 / 1.2)
          }}>
          <div className="map-world" style={{ width, height, transform: 'translate(' + view.x + 'px, ' + view.y + 'px) scale(' + view.scale + ')' }}>
            {disciplines.map((entry, index) => <div className="map-lane" key={entry.name}
              style={{ left: index * column + 12, '--discipline': entry.color } as CSSProperties}>{entry.short}</div>)}
            <svg className="map-edges" width={width} height={height} aria-hidden="true">
              {shown.flatMap(item => dependencies(item.requires).filter(id => shownIds.has(id)).map(id => {
                const from = researchById.get(id)!
                const x1 = left(from) + nodeWidth / 2
                const y1 = top(from) + nodeHeight
                const x2 = left(item) + nodeWidth / 2
                const y2 = top(item)
                const bend = Math.max(26, (y2 - y1) / 2)
                return <path key={id + '/' + item.id} d={`M${x1},${y1} C${x1},${y1 + bend} ${x2},${y2 - bend} ${x2},${y2}`}
                  className={selection === item.id || selection === id ? 'edge-highlight' : owns(game.purchases, id) ? 'edge-unlocked' : ''} />
              }))}
            </svg>
            {shown.map(item => {
              const state = researchStatus(item, current, game.balance, game.lab)
              const level = owns(game.purchases, item.id)
              const Icon = state === 'complete' ? Check : state === 'locked' || state === 'exclusive' ? LockKeyhole : FlaskConical
              return <button key={item.id} aria-pressed={selection === item.id} title={item.title + ' · ' + states[state]}
                className={'map-node state-' + state} onClick={() => setSelection(item.id)}
                style={{ left: left(item), top: top(item), width: nodeWidth, height: nodeHeight, '--discipline': disciplines[item.discipline].color } as CSSProperties}>
                <Icon size={15} /><span><strong>{item.title}</strong>
                  <small>{state === 'complete' ? 'Complete' : integerText(rankCost(item, level, game.lab)) + ' EP'}{item.max ? ' · ' + level + '/' + item.max : ''}</small>
                </span>
              </button>
            })}
          </div>
          <div className="map-controls">
            <button title="Zoom out" aria-label="Zoom out" onClick={() => changeZoom(1 / 1.22)}><Minus size={17} /></button>
            <span>{Math.round(view.scale * 100)}%</span>
            <button title="Zoom in" aria-label="Zoom in" onClick={() => changeZoom(1.22)}><Plus size={17} /></button>
            <button title="Fit graph" aria-label="Fit graph" onClick={fit}><Crosshair size={16} /></button>
          </div>
        </div>
        <div className="map-footer"><span><Hand size={14} /> Drag to pan · Scroll to zoom</span><span><i /> Available <i /> Researched <i /> Locked</span></div>
      </section>
      <aside className="panel node-detail" style={{ '--discipline': disciplines[selected.discipline].color } as CSSProperties}>
        <span className="eyebrow discipline-label">{disciplines[selected.discipline].name}</span>
        <h2>{selected.title}</h2>
        <p>{selected.description}</p>
        <span className={'research-state state-' + status}>{states[status]}{selected.max ? ' · Rank ' + rank + ' / ' + selected.max : ''}</span>
        {selected.requires && <div className="node-requirements"><h3>Prerequisites</h3><Requirements condition={selected.requires} game={game} onSelect={focus} /></div>}
        {status !== 'complete' && <button className="primary-button" disabled={status !== 'available'} onClick={() => onBuy(selected.id)}>
          <Zap size={16} /> Research · {integerText(rankCost(selected, rank, game.lab))} EP
        </button>}
        {selected.refundable && rank > 0 && <button className="secondary-button" onClick={() => onRefund(selected.id)}><RotateCcw size={15} /> Refund specialization</button>}
        {era < 2 && <div className="node-note"><LockKeyhole size={15} /><span>More regions appear as you unlock new mathematical forms.</span></div>}
      </aside>
    </div>
  </>
}
