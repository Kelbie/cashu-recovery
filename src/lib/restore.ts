import { Wallet, Mint, type Proof, getEncodedToken } from '@cashu/cashu-ts';
import type { RestoreParams } from './wallets/types';

export interface MintResult {
  mintUrl: string;
  keysetId: string;
  proofs: Proof[];
  totalSats: number;
  lastCounter: number | undefined;
  token: string;
  profileIndex: number;
}

export interface ProgressEvent {
  type: 'discovery' | 'probing' | 'restoring' | 'done' | 'error' | 'mint-skip' | 'found';
  mintUrl?: string;
  keysetId?: string;
  message: string;
  found?: number;
  result?: MintResult;
}

export function encodeToken(mintUrl: string, proofs: Proof[]): string {
  return getEncodedToken({ mint: mintUrl, proofs, unit: 'sat' });
}

/** Merge multiple MintResults for the same mint into one per mint. */
export function groupResultsByMint(results: MintResult[]): MintResult[] {
  const byMint = new Map<string, MintResult>();
  for (const r of results) {
    const existing = byMint.get(r.mintUrl);
    if (existing) {
      const proofs = [...existing.proofs, ...r.proofs];
      const totalSats = proofs.reduce((sum, p) => sum + Number(p.amount), 0);
      byMint.set(r.mintUrl, {
        ...existing,
        proofs,
        totalSats,
        token: encodeToken(r.mintUrl, proofs),
      });
    } else {
      byMint.set(r.mintUrl, { ...r });
    }
  }
  return Array.from(byMint.values());
}

/**
 * Quick N=10 probe to check if any keyset on this mint was ever used with this seed.
 */
async function probeMint(
  mintUrl: string,
  seed: Uint8Array,
  probeCount: number,
  onProgress: (e: ProgressEvent) => void,
): Promise<{ wallet: Wallet; usedKeysets: string[] } | null> {
  let mint: Mint;
  let wallet: Wallet;
  try {
    mint = new Mint(mintUrl);
    wallet = new Wallet(mint, { unit: 'sat', bip39seed: seed });
    await wallet.loadMint();
  } catch {
    onProgress({ type: 'mint-skip', mintUrl, message: `Skipping ${mintUrl} (unreachable)` });
    return null;
  }

  let keysets: { id: string; unit: string; active: boolean }[];
  try {
    const res = await mint.getKeySets();
    keysets = (res.keysets as any[]).filter((k) => k.unit === 'sat');
  } catch {
    onProgress({ type: 'mint-skip', mintUrl, message: `Skipping ${mintUrl} (failed to get keysets)` });
    return null;
  }
  if (keysets.length === 0) {
    onProgress({ type: 'mint-skip', mintUrl, message: `Skipping ${mintUrl} (no sat keysets)` });
    return null;
  }

  const usedKeysets: string[] = [];

  for (const ks of keysets) {
    onProgress({ type: 'probing', mintUrl, keysetId: ks.id, message: `Probing ${mintUrl} keyset ${ks.id.slice(0, 12)}...` });
    try {
      const { proofs } = await wallet.restore(0, probeCount, { keysetId: ks.id });
      if (proofs.length > 0) {
        usedKeysets.push(ks.id);
      }
    } catch {
      // keyset might not support restore
    }
  }

  if (usedKeysets.length === 0) return null;
  return { wallet, usedKeysets };
}

/**
 * Full restore for a single keyset using wallet.batchRestore() — same parameters as coco.
 * Runs until all proofs are found (stops after 300 consecutive empty indexes).
 */
async function restoreKeyset(
  wallet: Wallet,
  mintUrl: string,
  keysetId: string,
  gapLimit: number,
  batchSize: number,
  onProgress: (e: ProgressEvent) => void,
): Promise<MintResult | null> {
  onProgress({ type: 'restoring', mintUrl, keysetId, message: `Restoring ${mintUrl} keyset ${keysetId.slice(0, 12)}...` });

  const { proofs: allProofs, lastCounterWithSignature: lastCounter } = await wallet.batchRestore(
    gapLimit,
    batchSize,
    0,
    keysetId,
  );

  // Check proof states — keep only unspent (NUT-07)
  let unspent = allProofs;
  if (allProofs.length > 0) {
    try {
      const states = await wallet.checkProofsStates(allProofs);
      unspent = allProofs.filter((_: Proof, i: number) => (states[i] as any)?.state === 'UNSPENT');
    } catch {
      // If state check fails, return all (user can verify manually)
    }
  }

  if (unspent.length === 0) return null;

  const totalSats = unspent.reduce((sum: number, p: Proof) => sum + Number(p.amount), 0);
  const token = encodeToken(mintUrl, unspent);

  const result: MintResult = { mintUrl, keysetId, proofs: unspent, totalSats, lastCounter, token, profileIndex: 0 };

  onProgress({
    type: 'found',
    mintUrl,
    keysetId,
    message: `Found ${totalSats} sats in ${unspent.length} proofs from ${mintUrl}`,
    found: totalSats,
    result,
  });

  return result;
}

/**
 * Main recovery: probe mints with N=10, full batchRestore on matches.
 */
export async function recoverFromSeed(
  seed: Uint8Array,
  mintUrls: string[],
  params: RestoreParams,
  onProgress: (e: ProgressEvent) => void,
): Promise<MintResult[]> {
  const results: MintResult[] = [];

  onProgress({ type: 'discovery', message: `Scanning ${mintUrls.length} mints...` });

  for (const mintUrl of mintUrls) {
    onProgress({ type: 'probing', mintUrl, message: `Probing ${mintUrl}...` });

    const probeResult = await probeMint(mintUrl, seed, params.probeCount, onProgress);
    if (!probeResult) continue;

    for (const keysetId of probeResult.usedKeysets) {
      try {
        const result = await restoreKeyset(probeResult.wallet, mintUrl, keysetId, params.gapLimit, params.batchSize, onProgress);
        if (result) {
          results.push(result);
        }
      } catch (err) {
        onProgress({
          type: 'error',
          mintUrl,
          keysetId,
          message: `Error restoring ${mintUrl}: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
  }

  onProgress({ type: 'done', message: 'Recovery complete.' });
  return results;
}

/**
 * Sweep: swap all proofs for new ones, invalidating the originals.
 */
export async function sweepProofs(
  seed: Uint8Array,
  result: MintResult,
): Promise<string> {
  const mint = new Mint(result.mintUrl);
  const wallet = new Wallet(mint, { unit: 'sat', bip39seed: seed });
  await wallet.loadMint();

  const { send } = await wallet.send(BigInt(result.totalSats), result.proofs, {
    keysetId: result.keysetId,
  });

  return encodeToken(result.mintUrl, send);
}
