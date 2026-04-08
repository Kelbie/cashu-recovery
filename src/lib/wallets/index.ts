import type { WalletModule } from './types'
import { cashuMe } from './cashu-me'
import { sovran } from './sovran'
import { minibits } from './minibits'
import { macadamia } from './macadamia'
import { enuts } from './enuts'

export type { WalletModule, RestoreParams } from './types'

export const WALLETS: WalletModule[] = [cashuMe, sovran, minibits, macadamia, enuts]

export const DEFAULT_WALLET_ID = 'cashu-me'

export function getWallet(id: string): WalletModule {
  const w = WALLETS.find((w) => w.id === id)
  if (!w) throw new Error(`Unknown wallet: ${id}`)
  return w
}
