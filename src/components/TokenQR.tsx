import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { UR, UREncoder } from '@gandlaf21/bc-ur'
import { Buffer } from 'buffer'

// Max bytes that reliably fit in a single QR code (alphanumeric, ECC level L)
const SINGLE_QR_MAX = 2000

interface Props {
  value: string
  size?: number
}

export function TokenQR({ value, size = 200 }: Props) {
  if (value.length <= SINGLE_QR_MAX) {
    return <QRCodeSVG value={value} size={size} />
  }

  return <AnimatedQR value={value} size={size} />
}

function AnimatedQR({ value, size }: { value: string; size: number }) {
  const [fragment, setFragment] = useState('')
  const encoderRef = useRef<UREncoder | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null)

  useEffect(() => {
    const messageBuffer = Buffer.from(value)
    const ur = UR.fromBuffer(messageBuffer)
    const encoder = new UREncoder(ur, 150, 0)
    encoderRef.current = encoder

    // Show first frame immediately
    setFragment(encoder.nextPart())

    intervalRef.current = setInterval(() => {
      setFragment(encoder.nextPart())
    }, 250)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [value])

  if (!fragment) return null

  return <QRCodeSVG value={fragment.toUpperCase()} size={size} />
}
