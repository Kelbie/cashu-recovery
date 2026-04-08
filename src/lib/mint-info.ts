export interface MintInfo {
  name?: string
  description?: string
  icon_url?: string
  version?: string
}

const cache = new Map<string, MintInfo>()

export async function fetchMintInfo(mintUrl: string): Promise<MintInfo | null> {
  if (cache.has(mintUrl)) return cache.get(mintUrl)!
  try {
    const res = await fetch(`${mintUrl}/v1/info`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    const info: MintInfo = {
      name: data.name,
      description: data.description,
      icon_url: data.icon_url,
      version: data.version,
    }
    cache.set(mintUrl, info)
    return info
  } catch {
    return null
  }
}
