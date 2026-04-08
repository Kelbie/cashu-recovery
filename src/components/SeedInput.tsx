import { useState } from 'react'
import { validateMnemonic, wordCount } from '../lib/derivation'

interface Props {
  value: string
  onChange: (v: string) => void
}

export function SeedInput({ value, onChange }: Props) {
  const [hidden, setHidden] = useState(true)
  const count = wordCount(value)
  const isValid = validateMnemonic(value)
  const hasInput = value.trim().length > 0

  let statusColor = 'text-zinc-500'
  let borderColor = 'border-zinc-700 focus-within:border-cashu'
  if (hasInput && isValid) {
    statusColor = 'text-cashu'
    borderColor = 'border-cashu/50 focus-within:border-cashu'
  } else if (hasInput && count >= 12) {
    statusColor = 'text-red-400'
    borderColor = 'border-red-500/50 focus-within:border-red-400'
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between mb-3">
        <label className="font-mono text-xs font-medium tracking-tight text-zinc-500 uppercase">
          Seed phrase
        </label>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-xs ${statusColor}`}>
            {count > 0 && (
              <>
                {isValid ? (
                  <span className="inline-flex items-center gap-1">
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    {count} words
                  </span>
                ) : (
                  `${count} words`
                )}
              </>
            )}
          </span>
          <button
            onClick={() => setHidden(!hidden)}
            className="font-mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {hidden ? 'SHOW' : 'HIDE'}
          </button>
        </div>
      </div>

      <div className={`rounded border bg-zinc-800 transition-colors ${borderColor}`}>
        {hidden ? (
          <div
            className="px-4 py-3 font-mono text-sm text-zinc-400 min-h-[6rem] flex items-start cursor-text select-none"
            onClick={() => setHidden(false)}
          >
            {value ? value.split(/\s+/).filter(Boolean).map((_, i) => (
              <span key={i} className="mr-2">{'\u2022\u2022\u2022\u2022\u2022'}</span>
            )) : (
              <span className="text-zinc-600">Enter your 12 word seed phrase...</span>
            )}
          </div>
        ) : (
          <textarea
            rows={4}
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            placeholder="Enter your 12 word seed phrase..."
            className="w-full resize-none bg-transparent px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-600 outline-none"
          />
        )}
      </div>

      {hasInput && !isValid && count >= 12 && (
        <p className="mt-2 font-mono text-xs text-red-400">
          Invalid seed phrase. Check spelling or word order.
        </p>
      )}
      {hasInput && count > 0 && count < 12 && (
        <p className="mt-2 font-mono text-xs text-zinc-500">
          {12 - count} more word{12 - count !== 1 ? 's' : ''} needed.
        </p>
      )}

      <p className="mt-3 font-mono text-xs text-zinc-500">
        Your seed phrase is used locally and is never sent to any server.
      </p>
    </div>
  )
}
