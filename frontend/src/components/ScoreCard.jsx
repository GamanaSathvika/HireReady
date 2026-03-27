import { Card } from './Card'
import { cn } from '../lib/cn'

function scoreTone(score) {
  if (score <= 4) return 'bad'
  if (score <= 7) return 'avg'
  return 'good'
}

const toneStyles = {
  bad: {
    ring: 'ring-red-500/25',
    text: 'text-red-400',
    glow: 'shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_18px_60px_rgba(0,0,0,0.55)]',
  },
  avg: {
    ring: 'ring-yellow-400/20',
    text: 'text-yellow-300',
    glow: 'shadow-[0_0_0_1px_rgba(250,204,21,0.18),0_18px_60px_rgba(0,0,0,0.55)]',
  },
  good: {
    ring: 'ring-emerald-400/20',
    text: 'text-emerald-300',
    glow: 'shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_18px_60px_rgba(0,0,0,0.55)]',
  },
}

export function ScoreCard({ label, score, max = 10 }) {
  const tone = scoreTone(score)
  const s = toneStyles[tone]

  return (
    <Card className={cn('p-5 ring-1', s.ring, s.glow)}>
      <div className="text-xs font-semibold tracking-[0.22em] text-white/60 uppercase">
        {label}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div className={cn('text-4xl font-extrabold leading-none', s.text)}>
          {score}
          <span className="text-white/35 text-lg font-semibold">/{max}</span>
        </div>
        <div className="text-xs text-white/45">benchmark: 8+</div>
      </div>
    </Card>
  )
}

