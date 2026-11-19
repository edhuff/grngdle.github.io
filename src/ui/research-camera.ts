import { useCallback, useEffect, useRef, useState } from 'react'
import type { Point } from './research-layout'

export type Camera = Point & { scale: number }

const initialCamera: Camera = { x: 0, y: 0, scale: 0.85 }
const zoomDuration = 140

export function useResearchCamera(reducedEffects: boolean) {
  const [view, setView] = useState(initialCamera)
  const camera = useRef(view)
  const animation = useRef<{ frame: number; scale: number } | null>(null)

  const stopZoom = useCallback(() => {
    if (animation.current) cancelAnimationFrame(animation.current.frame)
    animation.current = null
    return camera.current
  }, [])

  function render(next: Camera) {
    camera.current = next
    setView(next)
  }

  function move(next: Camera | ((current: Camera) => Camera)) {
    const current = stopZoom()
    render(typeof next === 'function' ? next(current) : next)
  }

  const zoom = useCallback((factor: number, anchor: Point) => {
    const previousTarget = animation.current?.scale ?? camera.current.scale
    const scale = Math.max(0.08, Math.min(1.7, previousTarget * factor))
    if (scale === previousTarget) return

    const from = stopZoom()
    const target = {
      scale,
      x: anchor.x - (anchor.x - from.x) * scale / from.scale,
      y: anchor.y - (anchor.y - from.y) * scale / from.scale,
    }
    if (reducedEffects || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.current = target
      setView(target)
      return
    }

    const start = performance.now()
    const active = { frame: 0, scale }
    function step(now: number) {
      const elapsed = Math.max(0, Math.min(1, (now - start) / zoomDuration))
      const eased = 1 - (1 - elapsed) ** 3
      // Interpolate all three values together to keep the anchor stationary.
      const next = elapsed === 1 ? target : {
        x: from.x + (target.x - from.x) * eased,
        y: from.y + (target.y - from.y) * eased,
        scale: from.scale + (scale - from.scale) * eased,
      }
      camera.current = next
      setView(next)
      if (elapsed < 1) active.frame = requestAnimationFrame(step)
      else animation.current = null
    }
    animation.current = active
    active.frame = requestAnimationFrame(step)
  }, [reducedEffects, stopZoom])

  useEffect(() => () => { stopZoom() }, [stopZoom])

  return { view, move, stopZoom, zoom }
}
