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

const ACCENT = '#FACC15'

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

/** Red / orange / yellow–gold by band for category scores */
function categoryScoreClass(n) {
  if (n == null) return 'text-[#A1A1AA]'
  if (n <= 4) return 'text-red-400'
  if (n <= 6) return 'text-orange-400'
  return 'text-[#FACC15]'
}

function barGradientForScore(n) {
  if (n == null) return 'from-zinc-600 to-zinc-500'
  if (n <= 4) return 'from-red-600 to-red-400'
  if (n <= 6) return 'from-orange-600 to-amber-400'
  return 'from-[#EAB308] to-[#FACC15]'
}

function formatSessionClock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m ${String(r).padStart(2, '0')}s`
}

function formatPlannedMin(seconds) {
  const m = Math.max(1, Math.round((seconds || 600) / 60))
  return `${m} min`
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#27272A] px-3 py-1 text-[12px] font-medium leading-none text-[#E4E4E7]">
      {children}
    </span>
  )
}

function ScoreBarFill({ value, max = 10 }) {
  const pct = Math.min(100, Math.max(0, ((value ?? 0) / max) * 100))
  const grad = barGradientForScore(value)
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#27272A]">
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r ${grad}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
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

  const improveParagraph =
    improveLines.length > 0
      ? improveLines.join(' ')
      : 'See full detailed breakdown above. Work on structuring answers and deepening technical depth. Prepare a range of project and challenge-related answers.'

  const strengthsParagraph =
    strengthBlocks.length > 0
      ? strengthBlocks.map((b) => `${b.heading}: ${b.body}`).join('\n\n')
      : null

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.04 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.2, 0.9, 0.2, 1] } },
  }

  return (
    <div
      className="min-h-[100svh] bg-[#0B0B0B] text-white antialiased"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="mx-auto max-w-[700px] px-4 py-8 sm:px-6 sm:py-10">
        <MotionDiv variants={container} initial="hidden" animate="show" className="flex flex-col gap-6 sm:gap-7">
          {/* 1. Header — centered */}
          <MotionDiv variants={item} className="text-center">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A1A1AA]">
              Post-interview report
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Session complete
            </h1>
            <p
              className="mt-2 text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: ACCENT }}
            >
              Your Feedback
            </p>
          </MotionDiv>

          {/* 2. User info + pills */}
          <MotionDiv variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-[#A1A1AA] ring-1 ring-white/[0.06]"
                aria-hidden
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <p className="truncate text-[15px] font-semibold text-white">
                {name} <span className="font-normal text-[#A1A1AA]">—</span>{' '}
                <span className="text-[#E4E4E7]">{role}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {exp ? <Badge>{exp}</Badge> : null}
              <Badge>{formatPlannedMin(planned)} session</Badge>
              <Badge>
                {qCount} {qCount === 1 ? 'question' : 'questions'}
              </Badge>
            </div>
          </MotionDiv>

          <div className="h-px w-full bg-white/[0.06]" />

          {/* 3. Meta row */}
          <MotionDiv variants={item} className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A1A1AA]">
                Session
              </div>
              <div className="mt-1.5 text-[15px] font-medium text-white">{formatSessionClock(elapsed)}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A1A1AA]">Role</div>
              <div className="mt-1.5 text-[15px] font-medium text-white">{role}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A1A1AA]">Mode</div>
              <div className="mt-1.5 text-[15px] font-medium text-white">{mode}</div>
            </div>
          </MotionDiv>

          {/* 4. Main score card */}
          <MotionDiv variants={item}>
            <div
              className="relative overflow-hidden rounded-2xl border border-[#2A2A2A] p-6 sm:p-8"
              style={{
                background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
                boxShadow:
                  '0 0 0 1px rgba(250, 204, 21, 0.06), 0 24px 48px -12px rgba(0, 0, 0, 0.5), 0 0 80px -20px rgba(234, 179, 8, 0.12)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                  background:
                    'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(250, 204, 21, 0.5), transparent 55%)',
                }}
              />

              <div className="relative text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A1A1AA]">
                  Overall score
                </p>
                <p
                  className="mt-2 text-6xl font-extrabold tabular-nums leading-none tracking-tight sm:text-7xl"
                  style={{ color: ACCENT }}
                >
                  {score != null ? `${Math.round(score)}/10` : '—'}
                </p>
                <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-[#A1A1AA]">{verdict}</p>
              </div>

              <div className="relative mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-4">
                {METRIC_KEYS.map(({ key, label }) => {
                  const v = metricScores[key]
                  return (
                    <div key={key} className="text-center">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A1A1AA]">
                        {label}
                      </div>
                      <div className={`mt-2 text-xl font-bold tabular-nums ${categoryScoreClass(v)}`}>
                        {v != null ? `${Math.round(v)}/10` : '—'}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="relative mt-10 space-y-5 border-t border-white/[0.06] pt-8">
                {METRIC_KEYS.map(({ key, label }) => {
                  const v = metricScores[key]
                  return (
                    <div key={`row-${key}`} className="flex items-center gap-3 sm:gap-4">
                      <span className="w-[32%] min-w-[7.5rem] shrink-0 text-[13px] font-medium text-[#A1A1AA] sm:w-36">
                        {label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <ScoreBarFill value={v} />
                      </div>
                      <span
                        className={`w-12 shrink-0 text-right text-[13px] font-bold tabular-nums sm:w-14 ${categoryScoreClass(v)}`}
                      >
                        {v != null ? `${Math.round(v)}/10` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </MotionDiv>

          {/* 5. Strengths */}
          <MotionDiv variants={item} className="rounded-2xl border border-white/[0.06] bg-[#111111] px-5 py-6 sm:px-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A1A1AA]">
              Strengths &amp; signal
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-[#D4D4D8]">
              {strengthsParagraph ?? 'No structured sections parsed from the model reply.'}
            </p>
          </MotionDiv>

          {/* 6. Areas to improve — paragraph only */}
          <MotionDiv variants={item} className="rounded-2xl border border-white/[0.06] bg-[#111111] px-5 py-6 sm:px-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A1A1AA]">
              Areas to improve
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-[#D4D4D8]">{improveParagraph}</p>
          </MotionDiv>

          {/* 7. Footer */}
          <MotionDiv variants={item} className="pt-2">
            <button
              type="button"
              onClick={() => onBackHome?.()}
              className="h-[52px] w-full cursor-pointer rounded-xl bg-[#27272A] text-[15px] font-semibold text-white transition-colors hover:bg-[#3F3F46] active:bg-[#52525B]"
            >
              Back to home
            </button>
          </MotionDiv>
        </MotionDiv>
      </div>
    </div>
  )
}
