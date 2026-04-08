import * as bip39 from '@scure/bip39'
import type { WalletModule } from './types'

function deriveSeed(mnemonic: string): Uint8Array {
  return bip39.mnemonicToSeedSync(mnemonic)
}

export const enuts: WalletModule = {
  id: 'enuts',
  name: 'eNuts',
  description: 'Recover ecash from eNuts mobile wallet',
  icon: '/enuts-icon.png',
  hasProfiles: false,
  deriveSeed,
  restoreParams: { gapLimit: 300, batchSize: 100, probeCount: 10 },
}
