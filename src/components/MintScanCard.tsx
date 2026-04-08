import type { MintInfo } from '../lib/mint-info'

export interface MintScanState {
  url: string
  status: 'scanning' | 'done' | 'skipped'
  info: MintInfo | null
  satsFound: number
}

function hostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

export function MintScanCard({ scan }: { scan: MintScanState }) {
  const displayName = scan.info?.name || hostname(scan.url)
  const iconUrl = scan.info?.icon_url

  return (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors animate-fade-in ${
      scan.status === 'scanning' ? 'bg-zinc-800' : 'bg-zinc-800/40'
    }`}>
      <div className="h-8 w-8 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
        {iconUrl ? (
          <img src={iconUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-zinc-500 text-xs font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm text-zinc-200 truncate">{displayName}</p>
      </div>

      <div className="flex-shrink-0 flex items-center gap-2">
        {scan.status === 'scanning' && (
          <div className="h-4 w-4 rounded-full border-2 border-zinc-600 border-t-cashu animate-spin" />
        )}
        {scan.status === 'done' && scan.satsFound > 0 && (
          <span className="font-mono text-xs text-cashu font-semibold">
            {scan.satsFound.toLocaleString()} sats
          </span>
        )}
        {scan.status === 'done' && scan.satsFound === 0 && (
          <svg className="h-4 w-4 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
        )}
        {scan.status === 'skipped' && (
          <span className="font-mono text-[10px] text-zinc-600 uppercase">offline</span>
        )}
      </div>
    </div>
  )
}
