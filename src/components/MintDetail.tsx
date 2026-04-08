import { useState } from 'react'
import { TokenQR } from './TokenQR'
import type { MintResult } from '../lib/restore'
import type { MintInfo } from '../lib/mint-info'

interface Props {
  result: MintResult
  info: MintInfo | null
}

function hostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

export function MintDetail({ result, info }: Props) {
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(true)

  const displayName = info?.name || hostname(result.mintUrl)
  const iconUrl = info?.icon_url

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-cashu/30 bg-zinc-900 overflow-hidden animate-fade-in">
      {/* Mint header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <div className="h-10 w-10 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
          {iconUrl ? (
            <img src={iconUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-zinc-400 text-sm font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-semibold text-zinc-100 truncate">{displayName}</p>
          <p className="font-mono text-xs text-zinc-500 truncate">{result.mintUrl}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-zinc-100 tabular-nums">{result.totalSats.toLocaleString()}</p>
          <p className="font-mono text-xs text-zinc-400">sats</p>
        </div>
      </div>

      {/* QR Code */}
      <div className="px-5 pb-3">
        <button
          onClick={() => setShowQR(!showQR)}
          className="font-mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          {showQR ? 'HIDE QR' : 'SHOW QR'}
        </button>
        {showQR && (
          <div className="mt-3 flex justify-center">
            <div className="bg-white p-4 rounded-lg">
              <TokenQR value={result.token} size={200} />
            </div>
          </div>
        )}
      </div>

      {/* Token + copy */}
      <div className="px-5 pb-5">
        <textarea
          readOnly
          value={result.token}
          rows={3}
          className="w-full resize-none rounded border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-400 outline-none"
        />
        <button
          onClick={handleCopy}
          className={`mt-2 w-full rounded py-2 font-mono text-xs font-semibold transition-all cursor-pointer ${
            copied
              ? 'bg-cashu/20 text-cashu border border-cashu/30'
              : 'bg-cashu/10 text-cashu border border-cashu/20 hover:bg-cashu/20'
          }`}
        >
          {copied ? 'Copied!' : 'COPY TOKEN'}
        </button>
      </div>
    </div>
  )
}
