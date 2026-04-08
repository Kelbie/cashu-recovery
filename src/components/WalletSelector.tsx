import { useState, useRef, useEffect } from 'react'
import { WALLETS } from '../lib/wallets'

interface Props {
  selected: string
  onChange: (id: string) => void
}

export function WalletSelector({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const wallet = WALLETS.find((w) => w.id === selected)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={ref} className="relative inline-block">
        {/* Trigger button */}
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-lg pl-3 pr-4 py-2.5 cursor-pointer hover:border-cashu focus:border-cashu focus:outline-none transition-colors"
        >
          {wallet && (
            <img
              src={wallet.icon}
              alt=""
              className="h-6 w-6 rounded-md object-contain"
            />
          )}
          <span className="font-mono text-sm text-zinc-100">{wallet?.name}</span>
          <svg
            className={`h-4 w-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {open && (
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/40 overflow-hidden z-50">
            {WALLETS.map((w) => (
              <button
                key={w.id}
                onClick={() => { onChange(w.id); setOpen(false) }}
                className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors cursor-pointer ${
                  w.id === selected
                    ? 'bg-cashu/10 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
              >
                <img
                  src={w.icon}
                  alt=""
                  className="h-7 w-7 rounded-md object-contain flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium truncate">{w.name}</p>
                  <p className="font-mono text-xs text-zinc-500 truncate">{w.description}</p>
                </div>
                {w.id === selected && (
                  <svg className="ml-auto h-4 w-4 text-cashu flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {wallet && (
        <p className="font-mono text-xs text-zinc-500">{wallet.description}</p>
      )}
    </div>
  )
}
