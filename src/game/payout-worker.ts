import type { RewardEffects } from './economy'
import { otherPayoutTables } from './ep-rarity'

self.onmessage = (event: MessageEvent<RewardEffects>) => self.postMessage(otherPayoutTables(event.data))
