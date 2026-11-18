import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BarChart3, BookOpen, CircleCheck, Dices, GitBranch, Settings2, Zap } from 'lucide-react'
import { manualRoll, newGame, purchase, refund, type Game } from './game/game'
import { GENERATOR_VERSION } from './game/generator'
import { integerText } from './game/math'
import { loadLocal, saveLocal } from './game/save'
import { Play } from './ui/Play'
import { ResearchView } from './ui/Research'
import { Collection, Statistics } from './ui/Records'
import { SettingsView } from './ui/Settings'
import { Mark } from './ui/shared'
import './style.css'

const lab = import.meta.env.DEV && import.meta.env.MODE === 'lab'
const pages = [
  { name: 'Play', icon: Dices },
  { name: 'Research', icon: GitBranch },
  { name: 'Collection', icon: BookOpen },
  { name: 'Statistics', icon: BarChart3 },
  { name: 'Settings', icon: Settings2 },
] as const
type Page = typeof pages[number]['name']

function App() {
  const [loaded] = useState(() => loadLocal(lab))
  const [game, setGame] = useState(loaded.game)
  const current = useRef(game)
  const [page, setPage] = useState<Page>('Play')
  const [warning, setWarning] = useState(loaded.warning)
  const [rolling, setRolling] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current) }, [])

  function commit(next: Game) {
    if (next === current.current) return
    current.current = next
    const stored = saveLocal(next)
    setWarning(stored ? undefined : 'Local storage is unavailable. Export your save in Settings.')
    setGame(next)
  }

  function clickRoll() {
    if (timeout.current !== null) return
    const state = current.current
    commit(manualRoll(state))
    if (state.settings.animations && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRolling(true)
      timeout.current = setTimeout(() => {
        timeout.current = null
        setRolling(false)
      }, 595)
    }
  }

  function open(page: Page) {
    setPage(page)
    window.scrollTo({ top: 0 })
  }

  return <div className={'app' + (game.settings.reducedEffects ? ' reduced-effects' : '')}>
    <header className="app-header"><div className="header-inner">
      <button className="brand" onClick={() => open('Play')} aria-label="gRNGdle home"><Mark /><span><strong>gRNGdle</strong><small>THE NUMBER LAB</small></span></button>
      <nav aria-label="Main navigation">{pages.map(item => <button key={item.name} aria-current={page === item.name ? 'page' : undefined} onClick={() => open(item.name)}>
        <item.icon size={17} /><span>{item.name}</span></button>)}</nav>
      <div className="wallet" aria-label={'EP balance ' + integerText(game.balance)}><Zap size={17} fill="currentColor" /><strong>{integerText(game.balance)}</strong><span>EP</span></div>
    </div></header>
    <main>
      {lab && <div className="notice">Developer lab · Reduced research costs and roll gates · Isolated save</div>}
      {warning && <div className="notice" role="alert">{warning}</div>}
      {page === 'Play' && <Play game={game} rolling={rolling} onRoll={clickRoll} onResearch={() => open('Research')} onCollection={() => open('Collection')} />}
      {page === 'Research' && <ResearchView game={game} onBuy={id => commit(purchase(current.current, id))} onRefund={id => commit(refund(current.current, id))} />}
      {page === 'Collection' && <Collection game={game} />}
      {page === 'Statistics' && <Statistics game={game} />}
      {page === 'Settings' && <SettingsView game={game} onSettings={settings => commit({ ...current.current, settings })} onImport={commit} onReset={() => commit(newGame(lab))} />}
      <footer className="app-footer"><span><CircleCheck size={13} /> {warning ? 'Save needs attention' : 'Local save enabled'}</span><span>Generator v{GENERATOR_VERSION}</span></footer>
    </main>
  </div>
}

createRoot(document.getElementById('root')!).render(<App />)
