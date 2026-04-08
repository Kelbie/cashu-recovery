import { useRef, useEffect } from 'react'
import type { ProgressEvent } from '../lib/restore'

interface Props {
  logs: ProgressEvent[]
}

const typeColors: Record<string, string> = {
  discovery: 'text-blue-400',
  probing: 'text-zinc-400',
  restoring: 'text-orange-400',
  done: 'text-green-400',
  error: 'text-red-400',
  'mint-skip': 'text-zinc-600',
}

export function ProgressLog({ logs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs.length])

  if (logs.length === 0) return null

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="font-mono text-xs font-medium tracking-tight text-zinc-500 uppercase mb-3">
        Log
      </p>
      <div ref={containerRef} className="max-h-64 overflow-y-auto space-y-1 scrollbar-thin">
        {logs.map((log, i) => (
          <div key={i} className={`font-mono text-xs ${typeColors[log.type] ?? 'text-zinc-400'}`}>
            {log.message}
          </div>
        ))}
      </div>
    </div>
  )
}
