import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic.trim(), wordlist)
}

export function wordCount(mnemonic: string): number {
  return mnemonic.trim().split(/\s+/).filter(Boolean).length
}
