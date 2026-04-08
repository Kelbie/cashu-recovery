export interface RestoreParams {
  gapLimit: number
  batchSize: number
  probeCount: number
}

export interface WalletModule {
  id: string
  name: string
  description: string
  icon: string
  hasProfiles: boolean
  primaryMint?: string
  deriveSeed: (mnemonic: string, profileIndex: number) => Uint8Array
  restoreParams: RestoreParams
}
