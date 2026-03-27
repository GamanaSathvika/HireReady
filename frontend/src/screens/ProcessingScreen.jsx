import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { ScreenShell } from '../components/ScreenShell'
import { Spinner } from '../components/Spinner'
import { useInterval } from '../hooks/useInterval'

const messages = [
  'Analyzing your speech...',
  'Detecting filler words...',
  'Evaluating structure...',
]

export function ProcessingScreen() {
  const MotionDiv = motion.div
  const [idx, setIdx] = useState(0)

  useInterval(() => {
    setIdx((v) => (v + 1) % messages.length)
  }, 700)

  const msg = useMemo(() => messages[idx], [idx])

  return (
    <ScreenShell className="flex min-h-[100svh] items-center justify-center">
      <MotionDiv
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-xl"
      >
        <Card className="p-8 sm:p-10 text-center">
          <div className="mx-auto grid place-items-center">
            <Spinner />
          </div>
          <div className="mt-6 text-white text-xl font-semibold tracking-tight">{msg}</div>
          <div className="mt-2 text-sm text-white/55">
            Brutal honesty takes a moment.
          </div>
        </Card>
      </MotionDiv>
    </ScreenShell>
  )
}

