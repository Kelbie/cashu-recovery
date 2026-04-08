import * as bip39 from '@scure/bip39'
import type { WalletModule } from './types'

function deriveSeed(mnemonic: string): Uint8Array {
  return bip39.mnemonicToSeedSync(mnemonic)
}

export const macadamia: WalletModule = {
  id: 'macadamia',
  name: 'Macadamia',
  description: 'Recover ecash from Macadamia wallet',
  icon: '/macadamia-icon.png',
  hasProfiles: false,
  deriveSeed,
  restoreParams: { gapLimit: 300, batchSize: 100, probeCount: 10 },
}
