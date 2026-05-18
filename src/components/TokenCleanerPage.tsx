import { useMemo, useState } from 'react'
import { TokenQR } from './TokenQR'
import {
  cleanCashuToken,
  decodeCashuToken,
  type CleanProofCheck,
  type TokenCleanResult,
} from '../lib/token-cleaner'

type Phase = 'idle' | 'checking' | 'done' | 'error'

function hostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

function stateClasses(state: CleanProofCheck['state']): string {
  switch (state) {
    case 'UNSPENT':
      return 'border-cashu/30 bg-cashu/10 text-cashu'
    case 'SPENT':
      return 'border-red-500/30 bg-red-500/10 text-red-300'
    case 'PENDING':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    default:
      return 'border-zinc-700 bg-zinc-800 text-zinc-400'
  }
}

function formatAmount(amount: number, unit: string): string {
  return `${amount.toLocaleString()} ${unit}`
}

export function TokenCleanerPage() {
  const [tokenInput, setTokenInput] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<TokenCleanResult | null>(null)
  const [checks, setChecks] = useState<CleanProofCheck[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const decodedPreview = useMemo(() => {
    if (!tokenInput.trim()) return null
    try {
      return decodeCashuToken(tokenInput)
    } catch {
      return null
    }
  }, [tokenInput])

  const canCheck = tokenInput.trim().length > 0 && phase !== 'checking'
  const checkedAmount = checks.reduce((sum, check) => sum + check.amount, 0)
  const keptCount = result?.keptProofs.length ?? checks.filter((check) => check.state === 'UNSPENT').length
  const removedCount = result?.removedProofs.length ?? checks.filter((check) => check.state !== 'UNSPENT').length

  const handleCheck = async () => {
    if (!canCheck) return

    setPhase('checking')
    setResult(null)
    setChecks([])
    setError('')
    setCopied(false)
    setShowQR(false)

    try {
      const cleanResult = await cleanCashuToken(tokenInput, ({ check }) => {
        setChecks((prev) => [...prev, check])
      })
      setResult(cleanResult)
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }

  const handleCopy = async () => {
    if (!result?.cleanedToken) return
    await navigator.clipboard.writeText(result.cleanedToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <header className="pt-36 sm:pt-28 pb-8 px-6">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-100">
            Clean a Cashu token<span className="text-cashu">.</span>
          </h1>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            Check every proof against its mint, remove proofs that are no longer
            spendable, and rebuild a clean token locally in this browser.
          </p>
        </div>
      </header>

      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-5xl grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)] gap-8">
          <div className="space-y-6">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex items-center justify-between mb-3">
                <label className="font-mono text-xs font-medium tracking-tight text-zinc-500 uppercase">
                  Cashu token
                </label>
                {decodedPreview && (
                  <span className="font-mono text-xs text-cashu">
                    {decodedPreview.proofs.length} proof{decodedPreview.proofs.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <textarea
                rows={8}
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="Paste a cashuA... or cashuB... token"
                className="w-full resize-y rounded border border-zinc-700 bg-zinc-800 px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-cashu"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-xs text-zinc-500">
                  {decodedPreview
                    ? `${hostname(decodedPreview.mint)} - ${formatAmount(
                        decodedPreview.proofs.reduce((sum, proof) => sum + Number(proof.amount), 0),
                        decodedPreview.unit ?? 'sat',
                      )}`
                    : 'The token is decoded locally before any mint checks are made.'}
                </p>
                <button
                  disabled={!canCheck}
                  onClick={handleCheck}
                  className={`rounded-lg px-5 py-2.5 font-mono text-xs font-semibold transition-all ${
                    canCheck
                      ? 'bg-zinc-100 text-zinc-900 hover:bg-white cursor-pointer'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {phase === 'checking' ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-500 border-t-cashu animate-spin" />
                      CHECKING
                    </span>
                  ) : (
                    'CHECK PROOFS'
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                <p className="font-mono text-xs font-medium tracking-tight text-red-300 uppercase">
                  Could not clean token
                </p>
                <p className="mt-2 font-mono text-sm text-red-200">{error}</p>
              </div>
            )}

            {(checks.length > 0 || result) && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <p className="font-mono text-xs font-medium tracking-tight text-zinc-500 uppercase">
                    Proof checks ({checks.length}{decodedPreview ? `/${decodedPreview.proofs.length}` : ''})
                  </p>
                  {phase === 'checking' && (
                    <span className="font-mono text-xs text-zinc-500">
                      {formatAmount(checkedAmount, decodedPreview?.unit ?? 'sat')} checked
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {checks.map((check) => (
                    <div
                      key={`${check.index}-${check.proof.secret}`}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-zinc-800/50 px-3 py-2.5 animate-fade-in"
                    >
                      <span className="font-mono text-xs text-zinc-500 tabular-nums">
                        #{check.index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-sm text-zinc-200 truncate">
                          {formatAmount(check.amount, result?.unit ?? decodedPreview?.unit ?? 'sat')}
                        </p>
                        <p className="font-mono text-[11px] text-zinc-600 truncate">
                          {check.error ?? check.y ?? check.proof.id}
                        </p>
                      </div>
                      <span className={`rounded border px-2 py-1 font-mono text-[10px] font-semibold ${stateClasses(check.state)}`}>
                        {check.state}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className={`rounded-lg border bg-zinc-900 p-8 text-center transition-colors ${
              result?.keptAmount ? 'border-cashu/30' : 'border-zinc-800'
            }`}>
              {phase === 'idle' && (
                <>
                  <div className="text-zinc-600 mb-3">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5h16.5M6 12h12m-9 4.5h6" />
                    </svg>
                  </div>
                  <p className="font-mono text-sm text-zinc-500">
                    Cleaned token results will appear here.
                  </p>
                </>
              )}
              {phase === 'checking' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-full border-4 border-zinc-700 border-t-cashu animate-spin" />
                  <p className="font-sans font-semibold text-xl text-zinc-100">
                    Checking proofs...
                  </p>
                  <p className="font-mono text-xs text-zinc-500">
                    {checks.length} checked, {keptCount} kept, {removedCount} filtered
                  </p>
                </div>
              )}
              {phase === 'done' && result && (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-5xl font-bold text-zinc-100 tabular-nums">
                    {result.keptAmount.toLocaleString()}
                  </p>
                  <p className="text-xl text-zinc-400 font-medium">{result.unit}</p>
                  <p className="mt-2 font-mono text-xs text-zinc-500">
                    Kept {result.keptProofs.length} of {result.originalToken.proofs.length} proofs
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3 w-full">
                    <div className="rounded bg-zinc-800 px-4 py-3">
                      <p className="font-mono text-[10px] uppercase text-zinc-500">Original</p>
                      <p className="font-mono text-sm font-semibold text-zinc-200">
                        {formatAmount(result.originalAmount, result.unit)}
                      </p>
                    </div>
                    <div className="rounded bg-zinc-800 px-4 py-3">
                      <p className="font-mono text-[10px] uppercase text-zinc-500">Filtered</p>
                      <p className="font-mono text-sm font-semibold text-zinc-200">
                        {formatAmount(result.removedAmount, result.unit)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {phase === 'error' && (
                <p className="font-mono text-sm text-zinc-500">
                  Paste a valid Cashu token and try again.
                </p>
              )}
            </div>

            {result && (
              <div className="rounded-lg border border-cashu/30 bg-zinc-900 overflow-hidden animate-fade-in">
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-zinc-100">
                        Cleaned token
                      </p>
                      <p className="font-mono text-xs text-zinc-500 truncate">{result.mintUrl}</p>
                    </div>
                    <span className="rounded border border-cashu/30 bg-cashu/10 px-2 py-1 font-mono text-[10px] font-semibold text-cashu">
                      UNSPENT ONLY
                    </span>
                  </div>
                </div>

                {result.cleanedToken ? (
                  <>
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
                            <TokenQR value={result.cleanedToken} size={200} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="px-5 pb-5">
                      <textarea
                        readOnly
                        value={result.cleanedToken}
                        rows={4}
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
                        {copied ? 'Copied!' : 'COPY CLEANED TOKEN'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="px-5 pb-5">
                    <div className="rounded border border-zinc-800 bg-zinc-950 px-4 py-5 text-center">
                      <p className="font-mono text-sm text-zinc-400">
                        No unspent proofs remain in this token.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
