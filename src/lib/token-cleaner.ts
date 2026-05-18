import {
  Mint,
  Wallet,
  getDecodedToken,
  getEncodedToken,
  type Proof,
  type ProofState,
  type Token,
} from '@cashu/cashu-ts'

export type CleanProofState = ProofState['state'] | 'ERROR'

export interface CleanProofCheck {
  index: number
  proof: Proof
  amount: number
  state: CleanProofState
  y?: string
  error?: string
}

export interface TokenCleanResult {
  mintUrl: string
  unit: string
  originalToken: Token
  cleanedToken: string
  proofChecks: CleanProofCheck[]
  keptProofs: Proof[]
  removedProofs: Proof[]
  originalAmount: number
  keptAmount: number
  removedAmount: number
}

export type TokenCleanProgress = {
  checked: number
  total: number
  check: CleanProofCheck
}

function normalizeTokenInput(input: string): string {
  const trimmed = input.trim()
  if (trimmed.toLowerCase().startsWith('cashu:')) {
    return trimmed.slice('cashu:'.length)
  }
  return trimmed
}

function amountOf(proof: Proof): number {
  return Number(proof.amount)
}

function encodeCleanedToken(token: Token, proofs: Proof[]): string {
  if (proofs.length === 0) return ''
  return getEncodedToken({
    mint: token.mint,
    proofs,
    memo: token.memo,
    unit: token.unit,
  })
}

export function decodeCashuToken(input: string): Token {
  return getDecodedToken(normalizeTokenInput(input))
}

export async function cleanCashuToken(
  input: string,
  onProgress?: (progress: TokenCleanProgress) => void,
): Promise<TokenCleanResult> {
  const token = decodeCashuToken(input)
  if (!token.proofs.length) {
    throw new Error('Token does not contain any proofs.')
  }

  const mint = new Mint(token.mint)
  const wallet = new Wallet(mint, { unit: token.unit ?? 'sat' })
  const proofChecks: CleanProofCheck[] = []

  for (let index = 0; index < token.proofs.length; index += 1) {
    const proof = token.proofs[index]
    let check: CleanProofCheck

    try {
      const [state] = await wallet.checkProofsStates([{ secret: proof.secret }])
      check = {
        index,
        proof,
        amount: amountOf(proof),
        state: state.state,
        y: state.Y,
      }
    } catch (err) {
      check = {
        index,
        proof,
        amount: amountOf(proof),
        state: 'ERROR',
        error: err instanceof Error ? err.message : String(err),
      }
    }

    proofChecks.push(check)
    onProgress?.({ checked: proofChecks.length, total: token.proofs.length, check })
  }

  const keptProofs = proofChecks
    .filter((check) => check.state === 'UNSPENT')
    .map((check) => check.proof)
  const removedProofs = proofChecks
    .filter((check) => check.state !== 'UNSPENT')
    .map((check) => check.proof)

  const originalAmount = token.proofs.reduce((sum, proof) => sum + amountOf(proof), 0)
  const keptAmount = keptProofs.reduce((sum, proof) => sum + amountOf(proof), 0)
  const removedAmount = originalAmount - keptAmount

  return {
    mintUrl: token.mint,
    unit: token.unit ?? 'sat',
    originalToken: token,
    cleanedToken: encodeCleanedToken(token, keptProofs),
    proofChecks,
    keptProofs,
    removedProofs,
    originalAmount,
    keptAmount,
    removedAmount,
  }
}
