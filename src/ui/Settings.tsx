import { useRef, useState } from 'react'
import { type Game, type Settings } from '../game/game'
import { exportSave, importSave } from '../game/save'

export function SettingsView({ game, onSettings, onImport, onReset }: {
  game: Game; onSettings: (settings: Settings) => void; onImport: (game: Game) => void; onReset: () => void
}) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [reset, setReset] = useState(false)
  const [replacement, setReplacement] = useState<Game>()
  const upload = useRef<HTMLInputElement>(null)

  function download() {
    const url = URL.createObjectURL(new Blob([exportSave(game)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = game.lab ? 'grngdle-lab-save.json' : 'grngdle-save.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setError(false)
    setMessage('Save exported.')
  }

  async function read(file: File) {
    try {
      if (file.size > 1_000_000) throw new Error('The save file exceeds 1 MB.')
      setReplacement(importSave(await file.text(), game.lab))
      setError(false)
      setMessage('')
    } catch (cause) {
      setReplacement(undefined)
      setError(true)
      setMessage(cause instanceof Error ? cause.message : 'The save could not be read.')
    }
  }

  const options: { key: keyof Settings; title: string; hint: string }[] = [
    { key: 'animations', title: 'Animated roll', hint: 'Briefly cycle the digits into place.' },
    { key: 'reducedEffects', title: 'Reduce visual effects', hint: 'Remove the display highlight and extra motion.' },
    { key: 'showBadgeOdds', title: 'Show badge frequencies', hint: 'Display badge frequencies measured in the Classical integer range.' },
  ]
  return <>
    <header className="page-heading"><h1>Settings</h1></header>
    <div className="settings-layout">
      <section className="settings-panel">
        <h2>Display preferences</h2>
        {options.map(item => <label className="setting-row" key={item.key}>
          <span><strong>{item.title}</strong><small>{item.hint}</small></span>
          <input type="checkbox" className="switch" checked={game.settings[item.key]} onChange={event => onSettings({ ...game.settings, [item.key]: event.target.checked })} />
        </label>)}
      </section>
      <section className="settings-panel">
        <h2>Save data</h2>
        <p>Progress is saved in this browser. Export a copy to back it up or move it to another browser.</p>
        <div className="button-row"><button className="secondary-button" onClick={download}>Export save</button>
          <button className="secondary-button" onClick={() => upload.current?.click()}>Import save</button></div>
        <input ref={upload} type="file" accept=".json,application/json" aria-label="Select save file" hidden onChange={event => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void read(file)
        }} />
        {replacement && <div className="confirm-box"><strong>Replace this save?</strong><p>The imported save has {replacement.rolls.toLocaleString()} manual rolls.</p>
          <div className="button-row"><button className="primary-button" onClick={() => {
            onImport(replacement)
            setReplacement(undefined)
            setMessage('Save imported.')
          }}>Replace save</button><button className="secondary-button" onClick={() => setReplacement(undefined)}>Cancel</button></div></div>}
        {message && <p role="status" className={error ? 'form-error' : 'earned'}>{message}</p>}
      </section>
      <section className="settings-panel reset-panel">
        <h2>Reset progression</h2>
        <p>Reset deletes your local roll history, EP, and research.</p>
        {reset ? <div className="confirm-box"><strong>Delete all local progress?</strong><div className="button-row">
          <button className="danger-button" onClick={() => { onReset(); setReset(false); setReplacement(undefined); setError(false); setMessage('Progress reset.') }}>Delete progress</button>
          <button className="secondary-button" onClick={() => setReset(false)}>Cancel</button></div></div>
          : <button className="danger-button" onClick={() => setReset(true)}>Reset game</button>}
      </section>
    </div>
  </>
}
