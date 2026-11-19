import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { toggleBookmark, manualRoll, newGame, purchase, refund, type Game } from './game/game'
import { integerText } from './game/math'
import { effectsOf } from './game/research'
import { loadLocal, saveLocal } from './game/save'
import { Play } from './ui/Play'
import { ResearchView } from './ui/Research'
import { Collection, Statistics } from './ui/Records'
import { SettingsView } from './ui/Settings'
import { Mark } from './ui/shared'
import { usePayoutProfile } from './ui/use-payout-profile'
import './style.css'

const lab = import.meta.env.DEV && import.meta.env.MODE === 'lab'
const pages = ['Play', 'Research', 'Collection', 'Statistics', 'Settings'] as const
type Page = typeof pages[number]
const rollRevealMs = 300

function App() {
  const [loaded] = useState(() => loadLocal(lab))
  const [game, setGame] = useState(loaded.game)
  const current = useRef(game)
  const [page, setPage] = useState<Page>('Play')
  const [researchFocus, setResearchFocus] = useState<string>()
  const [warning, setWarning] = useState(loaded.warning)
  const [rolling, setRolling] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const preparingOdds = usePayoutProfile(effectsOf(game.purchases, game.legacyRange), page === 'Play')

  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current) }, [])

  function commit(next: Game) {
    if (next === current.current) return
    current.current = next
    const stored = saveLocal(next)
    setWarning(stored ? undefined : 'Local storage is unavailable. Export your save in Settings.')
    setGame(next)
  }

  function clickRoll() {
    if (timeout.current !== null || preparingOdds) return
    const state = current.current
    commit(manualRoll(state))
    if (state.settings.animations && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRolling(true)
      timeout.current = setTimeout(() => {
        timeout.current = null
        setRolling(false)
      }, rollRevealMs)
    }
  }

  function open(page: Page, focus?: string) {
    setPage(page)
    setResearchFocus(focus)
    window.scrollTo({ top: 0 })
  }

  return <div className={'app' + (page === 'Research' ? ' research-app' : '') + (game.settings.reducedEffects ? ' reduced-effects' : '')}>
    <header className="app-header"><div className="header-inner">
      <button className="brand" onClick={() => open('Play')} aria-label="gRNGdle home"><Mark /><strong>gRNGdle</strong></button>
      <nav aria-label="Main navigation">{pages.map(item => <button key={item} aria-current={page === item ? 'page' : undefined} onClick={() => open(item)}>{item}</button>)}</nav>
      <div className="wallet" aria-label={'EP balance ' + integerText(game.balance)}><strong>{integerText(game.balance)}</strong><span>EP</span></div>
    </div></header>
    <main className={page === 'Research' ? 'research-main' : page === 'Play' ? 'play-main' : 'secondary-main'}>
      {lab && <div className="notice">Developer lab · Reduced research costs and badge requirements · Isolated save</div>}
      {warning && <div className="notice" role="alert">{warning}</div>}
      {page === 'Play' && <Play game={game} rolling={rolling} preparingOdds={preparingOdds} onRoll={clickRoll} onResearch={id => open('Research', id)} />}
      {page === 'Research' && <ResearchView game={game} initialFocus={researchFocus} onBuy={id => commit(purchase(current.current, id))} onRefund={id => commit(refund(current.current, id))} onBookmark={id => commit(toggleBookmark(current.current, id))} />}
      {page === 'Collection' && <Collection game={game} />}
      {page === 'Statistics' && <Statistics game={game} />}
      {page === 'Settings' && <SettingsView game={game} onSettings={settings => commit({ ...current.current, settings })} onImport={commit} onReset={() => commit(newGame(lab))} />}
    </main>
  </div>
}

createRoot(document.getElementById('root')!).render(<App />)
