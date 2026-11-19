import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Bookmark, Check, ChevronRight, Crosshair, LockKeyhole, Minus, Plus, RotateCcw, Search, X, Zap } from 'lucide-react'
import { badgeRule } from '../game/attributes'
import { progress, type Game } from '../game/game'
import { integerText } from '../game/math'
import { milestones } from '../game/progression'
import { dependencies, disciplines, eras, familyGoal, meets, owns, purchaseCost, research, researchById, researchEra, researchStatus, revealedResearch, startingStudy, type Requirement } from '../game/research'
import { atlases, nodeHeight, nodeWidth, overlaps, type Point } from './research-layout'
import { useResearchCamera, type Camera } from './research-camera'
import { studyNotes } from './study-notes'

const states = {
  complete: 'Researched', locked: 'Prerequisites unmet', exclusive: 'Another doctrine is active', unsupported: 'Engine support pending',
  unaffordable: 'Needs EP', available: 'Available',
}
const eraGate = ['expansion', 'arithmetic', 'power-towers', 'hyperoperations', 'conway-chains', 'ordinal-hierarchy', 'extreme-googology']
const milestoneIds = new Set<string>(milestones)
const moves: Record<string, [number, number]> = { ArrowLeft: [55, 0], ArrowRight: [-55, 0], ArrowUp: [0, 55], ArrowDown: [0, -55] }

function Requirements({ condition, game, revealed, onSelect }: {
  condition: Requirement; game: Game; revealed: ReadonlySet<string>; onSelect: (id: string) => void
}) {
  const complete = meets(condition, progress(game), game.lab)
  if ('items' in condition) return <div className="requirement-group">
    <small>{condition.kind === 'count' ? `At least ${condition.amount} of` : condition.kind === 'all' ? 'All of' : 'Any one of'}</small>
    {condition.items.map((item, index) => <Requirements key={index} condition={item} game={game} revealed={revealed} onSelect={onSelect} />)}
  </div>
  return <div className={'requirement' + (complete ? ' met' : '')}>{complete ? <Check size={14} /> : <LockKeyhole size={13} />}
    {condition.kind === 'node' && (revealed.has(condition.id)
      ? <button className="text-button" onClick={() => onSelect(condition.id)}>{researchById.get(condition.id)?.title}<ChevronRight size={13} /></button>
      : <span>Undiscovered study</span>)}
    {condition.kind === 'families' && <span>{Object.keys(game.discoveries).length} / {familyGoal(condition.amount, game.lab)} badge families observed</span>}
    {condition.kind === 'lifetime' && <span>{integerText(game.lifetime)} / {integerText(game.lab ? (condition.amount + 3199n) / 3200n : condition.amount)} lifetime EP</span>}
    {condition.kind === 'badge' && <span>{game.observations[condition.id]?.count ?? 0} / {game.lab ? 1 : condition.amount} observed · {badgeRule(condition.id).name}</span>}
  </div>
}

function centered(width: number, height: number, point: Point, scale: number, details = false): Camera {
  const narrow = width <= 720
  return { x: width * (details && !narrow ? 0.39 : 0.5) - point.x * scale,
    y: height * (narrow ? (details ? 0.38 : 0.4) : 0.49) - point.y * scale, scale }
}

export function ResearchView({ game, initialFocus, onBuy, onRefund, onBookmark }: {
  game: Game; initialFocus?: string; onBuy: (id: string) => void; onRefund: (id: string) => void; onBookmark: (id: string) => void
}) {
  const unlocked = researchEra(game.purchases)
  const revealed = useMemo(() => revealedResearch(game.purchases), [game.purchases])
  const focus = initialFocus && revealed.has(initialFocus) ? initialFocus : undefined
  const [region, setRegion] = useState(focus ? researchById.get(focus)!.region! : unlocked)
  const [selection, setSelection] = useState(focus)
  const [global, setGlobal] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [confirmation, setConfirmation] = useState<'buy' | 'refund'>()
  const { view, move, stopZoom, zoom } = useResearchCamera(game.settings.reducedEffects)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [dragging, setDragging] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointer: number; origin: Point; camera: Point } | null>(null)
  const current = useMemo(() => progress(game), [game])
  const graph = atlases[region]
  const regionStudies = useMemo(() => graph.items.filter(item => revealed.has(item.id)), [graph, revealed])
  const regionClusters = useMemo(() => {
    if (regionStudies.length <= 1) return []
    const clusters = new Map<string, { first: Point; bottom: number }>()
    for (const item of regionStudies) {
      const point = graph.positions.get(item.id)!
      const bounds = clusters.get(item.cluster!)
      clusters.set(item.cluster!, {
        first: bounds && bounds.first.y < point.y ? bounds.first : point,
        bottom: Math.max(bounds?.bottom ?? 0, point.y),
      })
    }
    return graph.groups.flatMap(group => {
      const bounds = clusters.get(group.name)
      return bounds ? [{ ...group, ...bounds }] : []
    })
  }, [graph, regionStudies])
  const selected = selection && revealed.has(selection) ? researchById.get(selection) : undefined
  const notes = useMemo(() => selected ? studyNotes(selected, game.purchases) : [], [selected, game.purchases])
  const rank = selected ? owns(game.purchases, selected.id) : 0
  const status = selected ? researchStatus(selected, current, game.balance, game.lab) : undefined
  const price = selected ? purchaseCost(selected, game.purchases, game.lab) : 0n
  const completed = graph.items.filter(item => owns(game.purchases, item.id)).length
  const visible = { left: (-view.x - 120) / view.scale, top: (-view.y - 100) / view.scale,
    right: (size.width - view.x + 120) / view.scale, bottom: (size.height - view.y + 100) / view.scale }
  const selectedPoint = selected ? graph.positions.get(selected.id) : undefined
  const selectedOnScreen = selectedPoint && selectedPoint.x * view.scale + view.x >= 0 &&
    selectedPoint.x * view.scale + view.x <= size.width && selectedPoint.y * view.scale + view.y >= 0 &&
    selectedPoint.y * view.scale + view.y <= size.height
  const term = query.trim().toLowerCase()

  function matches(item: typeof research[number]) {
    if (!revealed.has(item.id)) return false
    if (filter === 'bookmarks' && !game.bookmarks.includes(item.id)) return false
    if (filter === 'available' && researchStatus(item, current, game.balance, game.lab) !== 'available') return false
    if (filter.startsWith('discipline-') && item.discipline !== Number(filter.slice(11))) return false
    return !term || [item.title, item.cluster ?? '', item.description].some(text => text.toLowerCase().includes(term))
  }
  const searchResults = term || filter !== 'all'
    ? research.filter(matches).sort((a, b) => Number(b.region === region) - Number(a.region === region)).slice(0, 45) : []

  function zoomFromCenter(factor: number) {
    const canvas = viewport.current
    if (canvas && !drag.current) zoom(factor, { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 })
  }

  function show(point: Point, scale: number, details = false) {
    const canvas = viewport.current
    if (canvas) move(centered(canvas.clientWidth, canvas.clientHeight, point, scale, details))
  }

  function select(id: string) {
    if (!revealed.has(id)) return
    setSelection(id)
    setConfirmation(undefined)
  }

  function showStudyOnMap(id: string) {
    const item = researchById.get(id)!
    setGlobal(false)
    setRegion(item.region!)
    show(atlases[item.region!].positions.get(id)!, view.scale, true)
  }

  function showRegion(index: number) {
    const atlas = atlases[index]
    const studies = atlas.items.filter(item => revealed.has(item.id))
    if (!studies.length) return
    setGlobal(false)
    setRegion(index)
    setSelection(undefined)
    setConfirmation(undefined)
    const opening = index === 0 ? startingStudy
      : studies.find(item => dependencies(item.requires).some(id => owns(game.purchases, id) && researchById.get(id)?.region !== index))?.id
    show(atlas.positions.get(opening ?? studies[0].id)!, 0.77)
  }

  function fit() {
    const canvas = viewport.current
    if (!canvas || !regionStudies.length) return
    setGlobal(false)
    setSelection(undefined)
    setConfirmation(undefined)
    const points = regionStudies.map(item => graph.positions.get(item.id)!)
    const left = Math.min(...points.map(point => point.x)) - nodeWidth / 2
    const right = Math.max(...points.map(point => point.x)) + nodeWidth / 2
    const top = Math.min(...points.map(point => point.y)) - nodeHeight / 2
    const bottom = Math.max(...points.map(point => point.y)) + nodeHeight / 2
    const width = canvas.clientWidth - 32
    const header = canvas.clientWidth <= 720 ? 124 : 76
    const height = canvas.clientHeight - header - 64
    const scale = Math.max(0.08, Math.min(1, width / (right - left), height / (bottom - top)))
    move({
      x: canvas.clientWidth / 2 - (left + right) * scale / 2,
      y: header + height / 2 - (top + bottom) * scale / 2,
      scale,
    })
  }

  useLayoutEffect(() => {
    const canvas = viewport.current!
    setSize({ width: canvas.clientWidth, height: canvas.clientHeight })
    if (focus) show(graph.positions.get(focus)!, 0.77, true)
    else showRegion(region)
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const canvas = viewport.current!
    if (global) return
    function wheel(event: WheelEvent) {
      event.preventDefault()
      if (drag.current) return
      const rect = canvas.getBoundingClientRect()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1
      const delta = Math.max(-160, Math.min(160, event.deltaY * unit))
      zoom(Math.exp(-delta / 390), { x: event.clientX - rect.left, y: event.clientY - rect.top })
    }
    canvas.addEventListener('wheel', wheel, { passive: false })
    return () => canvas.removeEventListener('wheel', wheel)
  }, [global, zoom])

  function startPan(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || drag.current || (event.target as Element).closest('button') || global) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointer: event.pointerId, origin: { x: event.clientX, y: event.clientY }, camera: stopZoom() }
    setDragging(true)
  }

  function movePan(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (start?.pointer !== event.pointerId) return
    move(previous => ({ ...previous, x: start.camera.x + event.clientX - start.origin.x, y: start.camera.y + event.clientY - start.origin.y }))
  }

  function stopPan(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointer !== event.pointerId) return
    drag.current = null
    setDragging(false)
  }

  function closeDetails() {
    setSelection(undefined)
    setConfirmation(undefined)
    if (!global) viewport.current?.focus({ preventScroll: true })
  }

  return <section className="research-map" aria-label="Research graph" onKeyDown={event => {
    if (event.key === 'Escape') {
      if (confirmation) setConfirmation(undefined)
      else if (query) setQuery('')
      else if (selected) closeDetails()
    }
  }}>
    <div className={'map-viewport' + (dragging ? ' dragging' : '')} ref={viewport} tabIndex={global ? -1 : 0}
      aria-label="Research canvas. Use arrow keys to pan and plus or minus to zoom."
      onPointerDown={startPan} onPointerMove={movePan} onPointerUp={stopPan} onPointerCancel={stopPan} onLostPointerCapture={stopPan}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return
        const offset = moves[event.key]
        if (offset) {
          event.preventDefault()
          move(previous => ({ ...previous, x: previous.x + offset[0], y: previous.y + offset[1] }))
        }
        if (event.key === '+' || event.key === '-') {
          event.preventDefault()
          zoomFromCenter(event.key === '+' ? 1.2 : 1 / 1.2)
        }
      }}>
      {!global && <div className={'map-world' + (view.scale <= 0.37 ? ' zoomed-out' : '')}
        style={{ width: graph.width, height: graph.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
        {regionClusters.map(group => <div key={group.name} className="atlas-cluster"
          style={{ left: group.left, width: group.width, height: group.bottom + nodeHeight / 2 + 12 }}>
          <button onClick={() => show(group.first, 0.62)}>{group.name}</button>
        </div>)}
        <svg className="map-edges" width={graph.width} height={graph.height} aria-hidden="true">
          {graph.edges.filter(edge => revealed.has(edge.from) && revealed.has(edge.to) &&
            (!edge.crossCluster || edge.to === selected?.id) && overlaps(edge.bounds, visible)).map(edge => {
            const active = edge.to === selected?.id
            return <path key={edge.from + '/' + edge.to} d={edge.path} data-from={edge.from} data-to={edge.to}
              className={(edge.crossCluster ? 'edge-prerequisite' : 'edge-progression') + (active ? ' edge-highlight' : '')} />
          })}
        </svg>
        {regionStudies.map(item => {
          const point = graph.positions.get(item.id)!
          const major = item.type === 'Gateway' || item.type === 'Keystone' || item.id === startingStudy
          if (!overlaps({ left: point.x - nodeWidth / 2, right: point.x + nodeWidth / 2, top: point.y - nodeHeight / 2, bottom: point.y + nodeHeight / 2 }, visible)) return null
          const state = researchStatus(item, current, game.balance, game.lab)
          const level = owns(game.purchases, item.id)
          const discipline = disciplines[item.discipline]
          const mastered = state === 'complete' && (item.max || item.type === 'Keystone')
          return <div key={item.id} className="map-point" style={{
            left: point.x - nodeWidth / 2, top: point.y - nodeHeight / 2, width: nodeWidth, height: nodeHeight, '--discipline': discipline.color,
          } as CSSProperties}>
            <button aria-pressed={selection === item.id} title={item.title + ' · ' + states[state]} data-node={item.id}
              className={`map-node state-${state} node-${item.type?.toLowerCase()}${major ? ' map-milestone' : ''}${mastered ? ' mastered' : ''}${filter !== 'all' && !matches(item) ? ' filtered-node' : ''}`}
              onClick={() => select(item.id)}>
              <strong>{item.title}</strong>
              <span className="map-node-meta">
                <small className="map-node-type" title={discipline.name}>{discipline.short}</small>
                <small className="map-node-cost">{mastered ? 'Mastered' : state === 'complete' ? 'Researched' : integerText(purchaseCost(item, game.purchases, game.lab)) + ' EP'}{item.max ? ' · ' + level + '/' + item.max : ''}</small>
              </span>
              {state === 'complete' ? <Check size={15} /> : (state === 'locked' || state === 'exclusive' || state === 'unsupported') && <LockKeyhole size={13} />}
            </button>
          </div>
        })}
      </div>}
    </div>

    {global && <div className="atlas-global" aria-label="Era overview">
      {eras.map((name, index) => {
        const gate = researchById.get(eraGate[index])
        const open = atlases[index].items.some(item => revealed.has(item.id))
        const count = atlases[index].items.filter(item => owns(game.purchases, item.id)).length
        return <article key={name} className={open ? 'revealed-era' : ''}>
          <button disabled={!open} onClick={() => showRegion(index)}>
            <span>{open ? count > 0 && count === atlases[index].items.length ? <Check size={17} /> : <Crosshair size={17} /> : <LockKeyhole size={16} />}</span>
            <strong>{name}</strong><small>{count} / {atlases[index].items.length} studied</small>
          </button>
          {gate && revealed.has(gate.id) && <button className="atlas-gateway-link" onClick={() => select(gate.id)}>{gate.title}<ChevronRight size={13} /></button>}
        </article>
      })}
    </div>}

    <header className="map-toolbar">
      <div><h1>Research map</h1><p>{global ? `${Object.keys(game.purchases).length} / ${research.length} studied` : `${eras[region]} · ${completed} / ${graph.items.length}`}</p></div>
      <div className="atlas-tools">
        <button className="secondary-button" aria-pressed={global} onClick={() => {
          if (global) showRegion(region)
          else { stopZoom(); setGlobal(true); setSelection(undefined); setConfirmation(undefined) }
        }}>{global ? 'Region' : 'Eras'}</button>
        <select aria-label="Inspect research" value="" onChange={event => select(event.target.value)}>
          <option value="" disabled>Inspect research</option>
          {[startingStudy, ...milestones, 'magnitude-focus', 'rarity-focus', 'efficiency-focus'].filter(id => revealed.has(id)).map(id =>
            <option key={id} value={id}>{researchById.get(id)?.title}</option>)}
        </select>
      </div>
    </header>

    <div className="atlas-search">
      <label><Search size={15} /><input type="search" aria-label="Search research" placeholder="Find a study" value={query}
        onChange={event => setQuery(event.target.value)} /></label>
      <select aria-label="Filter research" value={filter} onChange={event => setFilter(event.target.value)}>
        <option value="all">All studies</option><option value="available">Affordable</option><option value="bookmarks">Bookmarks</option>
        {disciplines.map((discipline, index) => <option key={discipline.short} value={'discipline-' + index}>{discipline.short}</option>)}
      </select>
      {(term || filter !== 'all') && <div className="atlas-results" aria-label="Research search results">
        {searchResults.length === 0 && <p>No revealed studies found.</p>}
        {searchResults.map(item => <button key={item.id} onClick={() => { select(item.id); setQuery(''); setFilter('all') }}>
          <span>{item.title}</span><small>{eras[item.region!]}</small>
        </button>)}
      </div>}
    </div>

    {selected && status && <aside className="node-detail" aria-label="Research details" key={selected.id}>
      <button className="inspector-close" aria-label="Close research details" onClick={closeDetails}><X size={19} /></button>
      <span className="discipline-label" style={{ color: disciplines[selected.discipline].color }}>{disciplines[selected.discipline].name} · {selected.type}</span>
      <h2>{selected.title}</h2>
      <p>{selected.description}</p>
      {notes.length > 0 && <div className="study-notes">{notes.map(note => <p key={note}>{note}</p>)}</div>}
      <span className={'research-state state-' + status}>{status === 'complete' && selected.max ? 'Mastered' : states[status]}{selected.max ? ' · Rank ' + rank + ' / ' + selected.max : ''}</span>
      {selected.unavailable && <p>{selected.unavailable}</p>}
      {selected.doctrine && status === 'exclusive' && <p>Refund your active doctrine to choose this path.</p>}
      {(global || !selectedOnScreen) && <button className="secondary-button" onClick={() => showStudyOnMap(selected.id)}>
        <Crosshair size={15} /> Show on map
      </button>}
      {selected.type === 'Gateway' && rank > 0 && selected.region! < unlocked && <button className="secondary-button" onClick={() => showRegion(selected.region! + 1)}>
        Open {eras[selected.region! + 1]}<ChevronRight size={15} />
      </button>}
      {selected.requires && <div className="node-requirements"><h3>Prerequisites</h3><Requirements condition={selected.requires} game={game} revealed={revealed} onSelect={select} /></div>}
      {confirmation ? <div className="atlas-confirm">
        <p>{confirmation === 'buy' ? `Spend ${integerText(price)} EP to unlock this gateway?` : 'Refund this doctrine investment and affected doctrine studies? Permanent studies will stay available.'}</p>
        <button className="primary-button" onClick={() => {
          if (confirmation === 'buy') onBuy(selected.id)
          else onRefund(selected.id)
          setConfirmation(undefined)
        }}>{confirmation === 'buy' ? 'Confirm gateway' : 'Confirm refund'}</button>
        <button className="secondary-button" onClick={() => setConfirmation(undefined)}>Cancel</button>
      </div> : <>
        {status !== 'complete' && <button className="primary-button" disabled={status !== 'available'} onClick={() => {
          if (milestoneIds.has(selected.id)) setConfirmation('buy')
          else onBuy(selected.id)
        }}><Zap size={16} /> Research · {integerText(price)} EP</button>}
        {selected.refundable && rank > 0 && <button className="secondary-button" onClick={() => setConfirmation('refund')}><RotateCcw size={15} /> Refund doctrine investment</button>}
        <button className="secondary-button" aria-pressed={game.bookmarks.includes(selected.id)} onClick={() => onBookmark(selected.id)}>
          <Bookmark size={14} /> {game.bookmarks.includes(selected.id) ? 'Remove bookmark' : 'Bookmark study'}
        </button>
      </>}
    </aside>}

    {!global && <div className="map-controls">
      <button title="Zoom out" aria-label="Zoom out" onClick={() => zoomFromCenter(1 / 1.22)}><Minus size={17} /></button>
      <span aria-label="Map zoom">{Math.round(view.scale * 100)}%</span>
      <button title="Zoom in" aria-label="Zoom in" onClick={() => zoomFromCenter(1.22)}><Plus size={17} /></button>
      <button title="Fit graph" aria-label="Fit graph" onClick={fit}><Crosshair size={16} /></button>
    </div>}
  </section>
}
