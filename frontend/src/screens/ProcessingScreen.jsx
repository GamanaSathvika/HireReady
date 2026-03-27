import { motion, AnimatePresence } from 'framer-motion'
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
  const [idx, setIdx] = useState(0)

  useInterval(() => {
    setIdx((v) => (v + 1) % messages.length)
  }, 1200)

  const msg = useMemo(() => messages[idx], [idx])

  return (
    <ScreenShell className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-black">
      
      {/* 🌈 Animated Gradient Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute w-[600px] h-[600px] bg-purple-600/20 blur-[120px] top-[-100px] left-[-100px] animate-pulse" />
        <div className="absolute w-[500px] h-[500px] bg-blue-500/20 blur-[120px] bottom-[-100px] right-[-100px] animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg"
      >
        <Card className="p-10 text-center backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
          
          {/* 🔵 Glowing Spinner */}
          <div className="relative mx-auto w-fit">
            <div className="absolute inset-0 blur-2xl bg-blue-500/30 rounded-full scale-150 animate-pulse" />
            <Spinner />
          </div>

          {/* 🧠 Animated Message */}
          <div className="mt-8 h-[28px] relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={msg}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="absolute w-full text-white text-xl font-semibold tracking-tight"
              >
                {msg}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 💬 Subtext */}
          <div className="mt-4 text-sm text-white/50 italic">
            Brutal honesty takes a moment.
          </div>

          {/* ⚡ Progress dots */}
          <div className="mt-6 flex justify-center gap-2">
            {messages.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  i === idx
                    ? 'bg-white scale-125'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>

        </Card>
      </motion.div>
    </ScreenShell>
  )
}