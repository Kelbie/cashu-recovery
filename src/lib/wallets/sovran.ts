import { HDKey } from '@scure/bip32'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import type { WalletModule } from './types'

/**
 * Derive the 64-byte Cashu wallet seed for a Sovran profile.
 * Chain: mnemonic → PBKDF2 root seed → HD m/44'/129372'/0'/<idx>'/0/0
 *        → 32-byte child key → re-encode as 24-word mnemonic → PBKDF2 again → 64-byte seed
 */
function deriveSeed(mnemonic: string, profileIndex: number): Uint8Array {
  const rootSeed = bip39.mnemonicToSeedSync(mnemonic)
  const root = HDKey.fromMasterSeed(rootSeed)
  const path = `m/44'/129372'/0'/${profileIndex}'/0/0`
  const child = root.derive(path)
  const cashuMnemonic = bip39.entropyToMnemonic(child.privateKey as Uint8Array, wordlist)
  return bip39.mnemonicToSeedSync(cashuMnemonic, '')
}

export const sovran: WalletModule = {
  id: 'sovran',
  name: 'Sovran',
  description: 'Recover ecash from Sovran wallet (supports multiple profiles)',
  icon: '/sovran-icon.png',
  hasProfiles: true,
  primaryMint: 'https://mint.sovran.money',
  deriveSeed,
  restoreParams: { gapLimit: 300, batchSize: 100, probeCount: 10 },
}
