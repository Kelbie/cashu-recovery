const SOVRAN_MINTS_URL = 'https://api.sovran.money/api/cashu/mints';
const SOVRAN_MINT = 'https://mint.sovran.money';

const RECOMMENDED_MINTS: string[] = [
  'https://mint.minibits.cash/Bitcoin',
];

/** Fetch merged mint list, with primaryMint first, deduplicated. */
export async function fetchMints(primaryMint?: string): Promise<string[]> {
  let apiMints: string[] = [];
  try {
    const res = await fetch(SOVRAN_MINTS_URL);
    if (res.ok) {
      const urls: string[] = await res.json();
      apiMints = urls
        .filter((u) => u.startsWith('https://'))
        .map((u) => u.replace(/\/$/, ''));
    }
  } catch {
    // API unreachable — continue with recommended mints
  }

  // Build priority order: primary mint first, then Sovran mint, API mints, recommended
  const priority: string[] = [];
  if (primaryMint) priority.push(primaryMint);
  if (SOVRAN_MINT !== primaryMint) priority.push(SOVRAN_MINT);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of [...priority, ...apiMints, ...RECOMMENDED_MINTS]) {
    if (!seen.has(url)) {
      seen.add(url);
      result.push(url);
    }
  }
  return result;
}
