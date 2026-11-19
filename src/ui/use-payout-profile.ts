import { useEffect, useState } from 'react'
import type { RewardEffects } from '../game/economy'
import { buildPayoutProfile, cachePayoutProfile, hasPayoutProfile, type otherPayoutTables, type PayoutProfile } from '../game/ep-rarity'

export function usePayoutProfile(effects: RewardEffects, active: boolean) {
  const [prepared, setPrepared] = useState<RewardEffects>()
  const { wide, vast, advanced } = effects.generator
  const preparing = active && !!(wide || vast || advanced) && prepared !== effects && !hasPayoutProfile(effects)

  useEffect(() => {
    if (!preparing) return
    let worker: Worker | undefined
    function finish(profile: PayoutProfile) {
      cachePayoutProfile(effects, profile)
      setPrepared(effects)
    }
    function fallback() {
      worker?.terminate()
      finish(buildPayoutProfile(effects))
    }
    try {
      worker = new Worker(new URL('../game/payout-worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<ReturnType<typeof otherPayoutTables>>) => finish(buildPayoutProfile(effects, event.data))
      worker.onerror = fallback
      worker.postMessage(effects)
    } catch {
      fallback()
    }
    return () => worker?.terminate()
  }, [effects, preparing])

  return preparing
}
