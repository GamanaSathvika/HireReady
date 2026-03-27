import { motion } from 'framer-motion'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ScoreCard } from '../components/ScoreCard'
import { ScreenShell } from '../components/ScreenShell'
import { cn } from '../lib/cn'
import { fillerWords } from '../mocks/mockFeedback'

function highlightFillers(text) {
  const escaped = fillerWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi')
  const parts = text.split(re)

  return parts.map((p, i) => {
    const isFiller = fillerWords.some((w) => w.toLowerCase() === p.toLowerCase())
    if (!isFiller) return <span key={i}>{p}</span>
    return (
      <span
        key={i}
        className="text-red-300 bg-red-500/10 ring-1 ring-red-500/20 rounded-md px-1.5 py-0.5 mx-0.5"
      >
        {p}
      </span>
    )
  })
}

export function FeedbackScreen({ feedback, onTryAgain }) {
  const MotionDiv = motion.div
  const scores = feedback?.scores ?? {}

  return (
    <ScreenShell>
      <MotionDiv
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.2, 0.9, 0.2, 1] }}
        className="mx-auto w-full max-w-5xl"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-[0.22em] uppercase text-white/55">
              Your Interview Breakdown
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Results that sting (and help).
            </div>
          </div>
          <Button variant="ghost" onClick={onTryAgain} className="hidden sm:inline-flex">
            Try Again
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ScoreCard label="Structure" score={scores.Structure ?? 0} />
          <ScoreCard label="Communication" score={scores.Communication ?? 0} />
          <ScoreCard label="Confidence" score={scores.Confidence ?? 0} />
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="p-6 lg:col-span-3">
            <div className="text-sm font-semibold text-white/80">Transcript</div>
            <div className="mt-4 leading-relaxed text-white/70">
              {highlightFillers(feedback?.transcript ?? '')}
            </div>
          </Card>

          <Card className={cn('p-6 lg:col-span-2 ring-1 ring-red-500/18 shadow-glowRed')}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white/80">Brutal Feedback</div>
              <div className="text-xs font-semibold tracking-[0.22em] uppercase text-red-300/80">
                unfiltered
              </div>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              {(feedback?.brutal ?? []).map((line, i) => (
                <li key={i} className="rounded-xl bg-red-500/8 ring-1 ring-red-500/15 px-4 py-3">
                  <span className="text-red-300 font-semibold">•</span>{' '}
                  <span className="ml-1">{line}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="mt-4 p-6">
          <div className="text-sm font-semibold text-white/80">Improvement Tips</div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(feedback?.tips ?? []).map((t) => (
              <div
                key={t}
                className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 px-4 py-3 text-sm text-white/70"
              >
                <span className="text-emerald-300 font-semibold">→</span>{' '}
                <span className="ml-1">{t}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-8 flex sm:hidden">
          <Button className="w-full" onClick={onTryAgain}>
            Try Again
          </Button>
        </div>
      </MotionDiv>
    </ScreenShell>
  )
}

