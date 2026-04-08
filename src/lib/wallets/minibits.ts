import * as bip39 from '@scure/bip39'
import type { WalletModule } from './types'

function deriveSeed(mnemonic: string): Uint8Array {
  return bip39.mnemonicToSeedSync(mnemonic)
}

export const minibits: WalletModule = {
  id: 'minibits',
  name: 'Minibits',
  description: 'Recover ecash from Minibits mobile wallet',
  icon: '/minibits-icon.png',
  hasProfiles: false,
  primaryMint: 'https://mint.minibits.cash/Bitcoin',
  deriveSeed,
  restoreParams: { gapLimit: 300, batchSize: 100, probeCount: 10 },
}
