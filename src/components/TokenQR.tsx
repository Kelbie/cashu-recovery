import { useState, useEffect } from 'react'
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

  return <AnimatedQR key={value} value={value} size={size} />
}

function createAnimatedEncoder(value: string): UREncoder {
  const messageBuffer = Buffer.from(value)
  const ur = UR.fromBuffer(messageBuffer)
  return new UREncoder(ur, 150, 0)
}

function AnimatedQR({ value, size }: { value: string; size: number }) {
  const [fragment, setFragment] = useState(() => createAnimatedEncoder(value).nextPart())

  useEffect(() => {
    const encoder = createAnimatedEncoder(value)
    encoder.nextPart()

    const interval = setInterval(() => {
      setFragment(encoder.nextPart())
    }, 250)

    return () => {
      clearInterval(interval)
    }
  }, [value])

  if (!fragment) return null

  return <QRCodeSVG value={fragment.toUpperCase()} size={size} />
}
