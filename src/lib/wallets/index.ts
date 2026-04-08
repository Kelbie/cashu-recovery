import type { WalletModule } from './types'
import { sovran } from './sovran'
import { cashuMe } from './cashu-me'
import { minibits } from './minibits'
import { enuts } from './enuts'

export type { WalletModule, RestoreParams } from './types'

export const WALLETS: WalletModule[] = [sovran, cashuMe, minibits, enuts]

export const DEFAULT_WALLET_ID = 'sovran'

export function getWallet(id: string): WalletModule {
  const w = WALLETS.find((w) => w.id === id)
  if (!w) throw new Error(`Unknown wallet: ${id}`)
  return w
}
