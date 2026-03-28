import { motion } from 'framer-motion'

const MotionDiv = motion.div

const FEEDBACK_HEADINGS = [
  'Overall Score (out of 10)',
  'Communication',
  'Structure',
  'Technical Depth',
  'Confidence',
  'Question-by-Question Breakdown',
  'Top 3 Things to Fix',
]

const METRIC_KEYS = [
  { key: 'Communication', label: 'Communication' },
  { key: 'Structure', label: 'Structure' },
  { key: 'Technical Depth', label: 'Technical depth' },
  { key: 'Confidence', label: 'Confidence' },
]

function parseFeedbackBlocks(message) {
  const text = String(message || '').trim()
  if (!text) return []
  const lines = text.split(/\r?\n/)
  const sections = []
  let current = null
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const lookup = new Map(FEEDBACK_HEADINGS.map((h) => [normalize(h), h]))
  for (const line of lines) {
    const raw = line.trim()
    const headingCandidate = raw.replace(/^[-*]\s*/, '').replace(/:$/, '')
    const heading = lookup.get(normalize(headingCandidate))
    if (heading) {
      if (current) sections.push(current)
      current = { heading, body: [] }
      continue
    }
    if (!current) current = { heading: 'Feedback', body: [] }
    current.body.push(line)
  }
  if (current) sections.push(current)
  return sections
    .map((s) => ({ heading: s.heading, body: s.body.join('\n').trim() }))
    .filter((s) => s.heading || s.body)
}

function clampScore(n) {
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(10, n))
}

function extractScoreFromBody(body) {
  const s = String(body || '').trim()
  const m1 = s.match(/(\d{1,2}(?:\.\d+)?)\s*\/\s*10\b/)
  if (m1) return clampScore(Number(m1[1]))
  const m2 = s.match(/\b(\d{1,2}(?:\.\d+)?)\s*out of 10\b/i)
  if (m2) return clampScore(Number(m2[1]))
  const m3 = s.match(/^(\d{1,2}(?:\.\d+)?)\b/)
  return m3 ? clampScore(Number(m3[1])) : null
}

function extractOverallScore(body) {
  return extractScoreFromBody(body)
}

function overallSummaryLine(body, score) {
  let t = String(body || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/^\(?out of 10\)?/i, '')
    .trim()
  if (score != null) {
    t = t.replace(new RegExp(`^${score}\\s*/\\s*10\\s*`, 'i'), '').trim()
    t = t.replace(new RegExp(`^${score}\\b\\s*`, ''), '').trim()
  }
  return t || 'Needs significant improvement before applying.'
}

function scoreTone(n) {
  if (n == null) return { text: 'text-white/75', fill: 'bg-white/30' }
  if (n <= 4) return { text: 'text-red-400', fill: 'bg-red-400' }
  if (n <= 6) return { text: 'text-amber-300', fill: 'bg-[#ffb547]' }
  return { text: 'text-[#ffb547]', fill: 'bg-[#ffb547]' }
}

function formatSessionClock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m ${String(r).padStart(2, '0')}s`
}

function Pill({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  )
}

function ScoreBar({ value, max = 10 }) {
  const pct = Math.min(100, Math.max(0, ((value ?? 0) / max) * 100))
  const tone = scoreTone(value)
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
      <div
        className={`h-full rounded-full transition-all ${tone.fill}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function InterviewFeedbackScreen({ session, feedbackText, onBackHome }) {
  const blocks = parseFeedbackBlocks(feedbackText)
  const overallBlock = blocks.find((b) =>
    String(b.heading || '').toLowerCase().includes('overall score'),
  )
  const fixBlock = blocks.find((b) => String(b.heading || '').toLowerCase().includes('top 3'))
  const score = overallBlock ? extractOverallScore(overallBlock.body) : null
  const verdict = overallBlock ? overallSummaryLine(overallBlock.body, score) : 'Session complete.'

  const metricScores = {}
  for (const { key } of METRIC_KEYS) {
    const block = blocks.find((b) => b.heading === key)
    metricScores[key] = block ? extractScoreFromBody(block.body) : null
  }

  const improveLines = fixBlock
    ? fixBlock.body
        .split(/\r?\n/)
        .map((x) => x.replace(/^[-*•\d.)]+\s*/, '').trim())
        .filter(Boolean)
    : []

  const metricHeadingSet = new Set(METRIC_KEYS.map((m) => m.key))
  const strengthBlocks = blocks.filter((b) => {
    const h = String(b.heading || '').toLowerCase()
    if (metricHeadingSet.has(b.heading)) return false
    return (
      !h.includes('overall score') &&
      !h.includes('top 3') &&
      !h.includes('question-by-question')
    )
  })

  const name = session?.candidateName?.trim() || 'You'
  const role = session?.role || '—'
  const exp = session?.experienceLevel || ''
  const planned = session?.configuredDurationSec ?? 0
  const elapsed = session?.elapsedSec ?? planned
  const qCount = session?.questionCount ?? 0
  const mode = session?.mode || 'Voice'

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.07, delayChildren: 0.05 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.2, 0.9, 0.2, 1] } },
  }

  const strengthsBody =
    strengthBlocks.length > 0
      ? strengthBlocks.map((b, i) => (
          <div key={i} className="mt-3 first:mt-0">
            <div className="text-[13px] font-semibold text-[#ffb547]/90">{b.heading}</div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/70 whitespace-pre-wrap">
              {b.body}
            </p>
          </div>
        ))
      : (
          <p className="mt-2 text-[13px] leading-relaxed text-white/55">
            No structured sections parsed from the model reply.
          </p>
        )

  const improveDefault =
    'See full detailed breakdown above. Work on structuring answers and deepening technical depth. Prepare a range of project and challenge-related answers.'

  return (
    <div
      className="min-h-[100svh] bg-[#050505] text-[#f3f3f3]"
      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="mx-auto max-w-[640px] px-4 py-8 sm:px-6">
        <MotionDiv variants={container} initial="hidden" animate="show">
          <MotionDiv variants={item}>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a8a8a]">
              Post-interview report
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-white sm:text-[32px]">
              Session complete
            </h1>
            <p className="mt-1 text-[22px] font-bold tracking-tight text-[#ffb547] sm:text-[26px]">
              Your Feedback
            </p>
          </MotionDiv>

          <MotionDiv variants={item} className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-lg text-white/70">
              👤
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-white">
                {name} <span className="font-normal text-white/50">—</span>{' '}
                <span className="text-white/90">{role}</span>
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              {exp ? (
                <Pill className="border-[#ffb547]/40 bg-[#ffb547]/[0.12] text-[#ffb547]">{exp}</Pill>
              ) : null}
              <Pill className="border-white/15 bg-white/[0.06] text-white/60">
                {formatSessionClock(planned)} session
              </Pill>
              <Pill className="border-white/15 bg-white/[0.06] text-white/60">
                {qCount} {qCount === 1 ? 'question' : 'questions'}
              </Pill>
            </div>
          </MotionDiv>

          <MotionDiv
            variants={item}
            className="mt-6 grid grid-cols-3 gap-4 border-b border-white/[0.08] pb-5"
          >
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a7a7a]">
                Session
              </div>
              <div className="mt-1 text-[13px] font-medium text-white/90">{formatSessionClock(elapsed)}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a7a7a]">
                Role
              </div>
              <div className="mt-1 text-[13px] font-medium text-white/90">{role}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a7a7a]">
                Mode
              </div>
              <div className="mt-1 text-[13px] font-medium text-white/90">{mode}</div>
            </div>
          </MotionDiv>

          <MotionDiv
            variants={item}
            className="mt-6 rounded-2xl border border-white/[0.1] bg-[#141414] px-5 py-6 sm:px-6"
          >
            <div className="text-center">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a9a9a]">
                Overall score
              </div>
              <div className="mt-2 text-5xl font-bold tabular-nums text-[#ffb547] sm:text-[52px]">
                {score != null ? `${Math.round(score)}/10` : '—'}
              </div>
              <p className="mx-auto mt-3 max-w-[420px] text-[13px] leading-snug text-white/65">{verdict}</p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {METRIC_KEYS.map(({ key, label }) => {
                const v = metricScores[key]
                const tone = scoreTone(v)
                return (
                  <div key={key} className="text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a7a7a]">
                      {label}
                    </div>
                    <div className={`mt-1.5 text-lg font-bold tabular-nums ${tone.text}`}>
                      {v != null ? `${Math.round(v)}/10` : '—'}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 space-y-4">
              {METRIC_KEYS.map(({ key, label }) => {
                const v = metricScores[key]
                return (
                  <div key={`bar-${key}`}>
                    <div className="mb-1.5 flex items-center justify-between text-[12px]">
                      <span className="font-medium capitalize text-white/80">{label}</span>
                      <span className={`tabular-nums font-semibold ${scoreTone(v).text}`}>
                        {v != null ? `${Math.round(v)}/10` : '—'}
                      </span>
                    </div>
                    <ScoreBar value={v} />
                  </div>
                )
              })}
            </div>
          </MotionDiv>

          <MotionDiv
            variants={item}
            className="mt-5 rounded-2xl border border-white/[0.08] bg-[#141414] px-5 py-5 sm:px-6"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a9a9a]">
              Strengths &amp; signal
            </div>
            {strengthsBody}
          </MotionDiv>

          <MotionDiv
            variants={item}
            className="mt-5 rounded-2xl border border-white/[0.08] bg-[#141414] px-5 py-5 sm:px-6"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a9a9a]">
              Areas to improve
            </div>
            {improveLines.length > 0 ? (
              <ul className="mt-3 list-none space-y-2 p-0">
                {improveLines.map((line, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3 py-2.5 text-[13px] leading-snug text-red-100/90"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] leading-relaxed text-white/70">{improveDefault}</p>
            )}
          </MotionDiv>

          <MotionDiv variants={item} className="mt-8">
            <button
              type="button"
              onClick={() => onBackHome?.()}
              className="h-[52px] w-full cursor-pointer rounded-xl border border-white/12 bg-[#252525] text-[15px] font-semibold text-white transition-colors hover:bg-[#2e2e2e]"
            >
              Back to home
            </button>
          </MotionDiv>
        </MotionDiv>
      </div>
    </div>
  )
}
