import * as bip39 from '@scure/bip39'
import type { WalletModule } from './types'

function deriveSeed(mnemonic: string): Uint8Array {
  return bip39.mnemonicToSeedSync(mnemonic)
}

export const cashuMe: WalletModule = {
  id: 'cashu-me',
  name: 'cashu.me',
  description: 'Recover ecash from cashu.me web wallet',
  icon: '/cashume-icon.png',
  hasProfiles: false,
  deriveSeed,
  restoreParams: { gapLimit: 400, batchSize: 200, probeCount: 10 },
}
