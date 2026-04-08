import { useState, useCallback, useRef } from 'react'
import { SeedInput } from './components/SeedInput'
import { WalletSelector } from './components/WalletSelector'
import { MintScanCard, type MintScanState } from './components/MintScanCard'
import { MintDetail } from './components/MintDetail'
import { validateMnemonic } from './lib/derivation'
import { getWallet, DEFAULT_WALLET_ID } from './lib/wallets'
import { fetchMints } from './lib/discovery'
import { fetchMintInfo, type MintInfo } from './lib/mint-info'
import { recoverFromSeed, groupResultsByMint, type MintResult, type ProgressEvent } from './lib/restore'

type Phase = 'idle' | 'recovering' | 'done'

const CASHU_ICON = 'https://avatars.githubusercontent.com/u/114246592?v=4'

export default function App() {
  const [mnemonic, setMnemonic] = useState('')
  const [walletId, setWalletId] = useState(DEFAULT_WALLET_ID)
  const [maxProfiles, setMaxProfiles] = useState(3)
  const [phase, setPhase] = useState<Phase>('idle')
  const [mintScans, setMintScans] = useState<MintScanState[]>([])
  const [mintInfoMap, setMintInfoMap] = useState<Map<string, MintInfo>>(new Map())
  const [results, setResults] = useState<MintResult[]>([])
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)
  const currentMintRef = useRef<string | null>(null)

  const finalizeMint = useCallback((mintUrl: string) => {
    setMintScans(prev => prev.map(s =>
      s.url === mintUrl && s.status === 'scanning' ? { ...s, status: 'done' } : s
    ))
  }, [])

  const handleProgress = useCallback((e: ProgressEvent, profile: number) => {
    if (e.type === 'probing' && e.mintUrl && !e.keysetId) {
      // New mint starting — finalize previous if still scanning
      if (currentMintRef.current && currentMintRef.current !== e.mintUrl) {
        finalizeMint(currentMintRef.current)
      }
      currentMintRef.current = e.mintUrl

      setMintScans(prev => {
        const existing = prev.find(s => s.url === e.mintUrl)
        if (existing) {
          return prev.map(s => s.url === e.mintUrl ? { ...s, status: 'scanning' as const } : s)
        }
        return [...prev, { url: e.mintUrl!, status: 'scanning' as const, info: null, satsFound: 0 }]
      })

      // Fetch mint info if not cached
      const mintUrl = e.mintUrl
      setMintInfoMap(prev => {
        if (prev.has(mintUrl)) {
          // Already have it — update the scan card too
          setMintScans(scans => scans.map(s =>
            s.url === mintUrl && !s.info ? { ...s, info: prev.get(mintUrl)! } : s
          ))
          return prev
        }
        fetchMintInfo(mintUrl).then(info => {
          if (info) {
            setMintInfoMap(p => new Map([...p, [mintUrl, info]]))
            setMintScans(scans => scans.map(s =>
              s.url === mintUrl ? { ...s, info } : s
            ))
          }
        })
        return prev
      })
    } else if (e.type === 'mint-skip' && e.mintUrl) {
      currentMintRef.current = null
      setMintScans(prev => {
        const existing = prev.find(s => s.url === e.mintUrl)
        if (existing) {
          return prev.map(s => s.url === e.mintUrl ? { ...s, status: 'skipped' as const } : s)
        }
        return [...prev, { url: e.mintUrl!, status: 'skipped' as const, info: null, satsFound: 0 }]
      })
    } else if (e.type === 'found' && e.mintUrl && e.result) {
      setMintScans(prev => prev.map(s =>
        s.url === e.mintUrl ? { ...s, satsFound: s.satsFound + e.result!.totalSats } : s
      ))
      setResults(prev => [...prev, { ...e.result!, profileIndex: profile }])
    }
  }, [finalizeMint])

  const startRecovery = useCallback(async () => {
    if (!validateMnemonic(mnemonic)) return

    setPhase('recovering')
    setMintScans([])
    setMintInfoMap(new Map())
    setResults([])
    setElapsed(0)
    currentMintRef.current = null

    const start = Date.now()
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)

    try {
      const wallet = getWallet(walletId)
      const mintUrls = await fetchMints(wallet.primaryMint)
      const profileCount = wallet.hasProfiles ? maxProfiles : 1

      for (let profile = 0; profile < profileCount; profile++) {
        const seed = wallet.deriveSeed(mnemonic.trim(), profile)

        await recoverFromSeed(seed, mintUrls, wallet.restoreParams, (e) => {
          handleProgress(e, profile)
        })

        // Finalize the last mint of this profile
        if (currentMintRef.current) {
          finalizeMint(currentMintRef.current)
          currentMintRef.current = null
        }
      }
    } catch (err) {
      console.error('Recovery error:', err)
    } finally {
      if (timerRef.current) clearInterval(timerRef.current)
      // Mark any remaining scanning mints as done
      setMintScans(prev => prev.map(s =>
        s.status === 'scanning' ? { ...s, status: 'done' } : s
      ))
      setPhase('done')
    }
  }, [mnemonic, walletId, maxProfiles, handleProgress, finalizeMint])

  const isValid = validateMnemonic(mnemonic)
  const wallet = getWallet(walletId)
  const grouped = groupResultsByMint(results)
  const totalSats = grouped.reduce((s, r) => s + r.totalSats, 0)
  const totalProofs = grouped.reduce((s, r) => s + r.proofs.length, 0)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-md">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={CASHU_ICON} alt="Cashu" className="h-8 w-8 rounded-lg" />
            <span className="font-sans font-semibold text-zinc-100 text-lg tracking-tight">
              Cashu Recovery
            </span>
          </div>
          <span className="font-mono text-xs text-zinc-500">Client-side only</span>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-28 pb-8 px-6">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-100">
            Recover your balance<span className="text-cashu">.</span>
          </h1>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            Scan every known Cashu mint for ecash tied to your seed phrase.
            Your seed never leaves this browser.
          </p>
          <div className="mt-6">
            <WalletSelector selected={walletId} onChange={setWalletId} />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 pb-20">
        <div className="mx-auto max-w-5xl grid lg:grid-cols-2 gap-8">
          {/* Left — inputs + scan progress */}
          <div className="space-y-6">
            <SeedInput value={mnemonic} onChange={setMnemonic} />

            {/* Profile count (only for wallets with profiles) */}
            {wallet.hasProfiles && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <label className="block font-mono text-xs font-medium tracking-tight text-zinc-500 uppercase mb-3">
                  Profiles to scan
                </label>
                <div className="flex items-center gap-3">
                  {[1, 3, 5, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setMaxProfiles(n)}
                      className={`px-4 py-2 rounded font-mono text-sm transition-colors cursor-pointer ${
                        maxProfiles === n
                          ? 'bg-cashu text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-3 font-mono text-xs text-zinc-500">
                  Number of account indexes to check (0..{maxProfiles - 1}).
                </p>
              </div>
            )}

            {/* Start button */}
            <button
              disabled={!isValid || phase === 'recovering'}
              onClick={startRecovery}
              className={`w-full rounded-lg py-4 font-mono font-semibold text-sm transition-all ${
                isValid && phase !== 'recovering'
                  ? 'bg-zinc-100 text-zinc-900 hover:bg-white cursor-pointer'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {phase === 'recovering' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-zinc-500 border-t-cashu animate-spin" />
                  SCANNING...
                </span>
              ) : (
                'START RECOVERY'
              )}
            </button>
            <p className="text-center font-mono text-xs text-zinc-500">
              {!isValid
                ? 'Enter a valid 12-word seed phrase to begin.'
                : 'Ready to scan all known mints.'}
            </p>

            {/* Mint scan progress */}
            {mintScans.length > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono text-xs font-medium tracking-tight text-zinc-500 uppercase">
                    Mints ({mintScans.length})
                  </p>
                  {phase === 'recovering' && (
                    <span className="font-mono text-xs text-zinc-500">{elapsed}s</span>
                  )}
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {[...mintScans].sort((a, b) => b.satsFound - a.satsFound).map(scan => (
                    <MintScanCard key={scan.url} scan={scan} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — results */}
          <div className="space-y-6">
            {/* Total balance */}
            {phase !== 'idle' && (
              <div className={`rounded-lg border bg-zinc-900 p-8 text-center transition-colors ${
                totalSats > 0 ? 'border-cashu/30' : 'border-zinc-800'
              }`}>
                {phase === 'recovering' && totalSats === 0 && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full border-4 border-zinc-700 border-t-cashu animate-spin" />
                    <p className="font-sans font-semibold text-xl text-zinc-100">
                      Scanning mints...
                    </p>
                    <div className="rounded bg-zinc-800 px-6 py-2 font-mono text-sm text-zinc-300">
                      Elapsed: {elapsed}s
                    </div>
                  </div>
                )}
                {(totalSats > 0 || (phase === 'done' && totalSats === 0)) && (
                  <div className="flex flex-col items-center gap-1">
                    {phase === 'recovering' && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-4 w-4 rounded-full border-2 border-zinc-600 border-t-cashu animate-spin" />
                        <span className="font-mono text-xs text-zinc-400">Scanning...</span>
                      </div>
                    )}
                    <p className="text-5xl font-bold text-zinc-100 tabular-nums">
                      {totalSats.toLocaleString()}
                    </p>
                    <p className="text-xl text-zinc-400 font-medium">sats</p>
                    {totalSats > 0 && (
                      <p className="mt-2 font-mono text-xs text-zinc-500">
                        {totalProofs} proof{totalProofs !== 1 ? 's' : ''} across {grouped.length} mint{grouped.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    {phase === 'done' && totalSats === 0 && (
                      <>
                        <p className="mt-2 font-mono text-sm text-zinc-400">
                          No unspent ecash found.
                        </p>
                        <p className="font-mono text-xs text-zinc-600">
                          Proofs may have been spent, or this seed was never used with a Cashu mint.
                        </p>
                      </>
                    )}
                    {phase === 'done' && (
                      <div className="mt-3 rounded bg-zinc-800 px-6 py-2 font-mono text-sm text-zinc-300">
                        Completed in {elapsed}s
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Per-mint results (grouped) */}
            {grouped.length > 0 && (
              <div className="space-y-4">
                {grouped.map((r) => (
                  <MintDetail
                    key={r.mintUrl}
                    result={r}
                    info={mintInfoMap.get(r.mintUrl) ?? null}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {phase === 'idle' && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
                <div className="text-zinc-600 mb-3">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <p className="font-mono text-sm text-zinc-500">
                  Recovery results will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-6 px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={CASHU_ICON} alt="" className="h-5 w-5 rounded" />
            <span className="font-mono text-xs text-zinc-600">Cashu Recovery</span>
          </div>
          <span className="font-mono text-xs text-zinc-600">
            Your seed phrase never leaves this browser.{' '}
            <a
              href="https://github.com/kelbie/cashu-recovery"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 underline hover:text-zinc-300 transition-colors"
            >
              Run locally &amp; offline
            </a>{' '}
            if you are concerned.
          </span>
        </div>
      </footer>
    </div>
  )
}
