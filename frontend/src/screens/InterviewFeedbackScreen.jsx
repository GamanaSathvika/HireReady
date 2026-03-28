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

/** Display order inside score card (left / right columns). */
const METRIC_LEFT = [
  { key: 'Communication', label: 'Communication' },
  { key: 'Technical Depth', label: 'Technical depth' },
]
const METRIC_RIGHT = [
  { key: 'Structure', label: 'Structure' },
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
  // AI often uses "Overall Score" without "(out of 10)" — same section.
  lookup.set('overall score', 'Overall Score (out of 10)')
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
  const frac = s.match(/(\d{1,2}(?:\.\d+)?)\s*\/\s*10\b/)
  if (frac) return clampScore(Number(frac[1]))
  const out = s.match(/\b(\d{1,2}(?:\.\d+)?)\s+out\s+of\s+10\b/i)
  if (out) return clampScore(Number(out[1]))
  const lone = s.match(/^(\d{1,2}(?:\.\d+)?)\s*$/)
  return lone ? clampScore(Number(lone[1])) : null
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** When block parsing misses, find e.g. "Structure: 5/10" or "Confidence score: 4/10" in raw text. */
function extractMetricScoreFromFullText(text, key) {
  const k = escapeRegExp(key)
  const src = String(text || '')
  const re1 = new RegExp(`${k}[^\\d]*(\\d+(?:\\.\\d+)?)\\s*/\\s*10`, 'i')
  let m = src.match(re1)
  if (m) return clampScore(Number(m[1]))
  const re2 = new RegExp(`${k}[^\\d]*(\\d+(?:\\.\\d+)?)\\s+out\\s+of\\s+10`, 'i')
  m = src.match(re2)
  return m ? clampScore(Number(m[1])) : null
}

function extractOverallScore(body) {
  return extractScoreFromBody(body)
}

/** When the overall block is missing or body has no parseable score. Avoid matching metric lines. */
function extractOverallScoreFromFullText(text) {
  const src = String(text || '')
  for (const line of src.split(/\r?\n/)) {
    const l = line.trim()
    if (!/overall/i.test(l) || !/\d/.test(l)) continue
    const s = extractScoreFromBody(l)
    if (s != null) return s
  }
  const m1 = src.match(/overall[^\d]{0,200}?(\d+(?:\.\d+)?)\s*\/\s*10\b/i)
  if (m1) return clampScore(Number(m1[1]))
  const m2 = src.match(/overall[^\d]{0,200}?(\d+(?:\.\d+)?)\s+out\s+of\s+10\b/i)
  return m2 ? clampScore(Number(m2[1])) : null
}

/** Remove overall fraction from narrative so it is not repeated under the large hero score. */
function stripOverallFractionFromSummaryText(t, rawScore) {
  if (rawScore == null) return t
  const n = Math.round(Number(rawScore))
  if (!Number.isFinite(n)) return t
  let s = String(t || '')
  s = s.replace(new RegExp(`Overall\\s+Score\\s*:?\\s*${n}(?:\\.\\d+)?\\s*\\/\\s*10`, 'gi'), '')
  s = s.replace(new RegExp(`Overall\\s*:?\\s*${n}(?:\\.\\d+)?\\s*\\/\\s*10`, 'gi'), '')
  s = s.replace(new RegExp(`^\\s*${n}(?:\\.\\d+)?\\s*\\/\\s*10\\s*`, 'i'), '')
  s = s.replace(new RegExp(`\\b${n}(?:\\.\\d+)?\\s*\\/\\s*10\\b`, 'g'), '')
  s = s.replace(/\s+/g, ' ').replace(/^[-–—.,;:\s]+|[-–—.,;:\s]+$/g, '').trim()
  return s
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
    const sNum = String(score)
    t = t.replace(new RegExp(`^${escapeRegExp(sNum)}\\s*/\\s*10\\s*`, 'i'), '').trim()
    t = t.replace(new RegExp(`^${escapeRegExp(sNum)}\\b\\s*`, ''), '').trim()
  }
  t = stripOverallFractionFromSummaryText(t, score)
  return t || 'Needs significant improvement before applying.'
}

/** Only the overall-score blurb — not the full feedback (avoids duplicating Strengths). */
function sliceOverallVerdictBody(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  let start = lines.findIndex(
    (l) => /overall/i.test(l) && (/score/i.test(l) || /\d+\s*\/\s*10/.test(l)),
  )
  if (start === -1) start = lines.findIndex((l) => /overall/i.test(l) && /\d/.test(l))
  if (start === -1) return ''

  const chunk = []
  for (let j = start; j < lines.length; j++) {
    const line = lines[j].replace(/^[-*#]+\s*/, '')
    if (
      chunk.length > 0 &&
      /^(communication|structure|technical|confidence|top\s*3|question[- ]by|strengths?\b)/i.test(
        line,
      )
    ) {
      break
    }
    chunk.push(lines[j])
    if (chunk.length >= 5) break
  }
  return chunk.join('\n')
}

function verdictWithoutOverallBlock(feedbackText, score) {
  const slice = sliceOverallVerdictBody(feedbackText)
  if (slice) return overallSummaryLine(slice, score)
  return 'Your performance summary is in the sections below.'
}

function collapseWhitespace(s) {
  return String(s || '').replace(/\s+/g, ' ').trim()
}

function stripMarkdown(s) {
  let t = String(s || '')
  t = t.replace(/\*\*(.+?)\*\*/g, '$1')
  t = t.replace(/\*(.+?)\*/g, '$1')
  t = t.replace(/__(.+?)__/g, '$1')
  t = t.replace(/_(.+?)_/g, '$1')
  t = t.replace(/`+([^`]+)`+/g, '$1')
  t = t.replace(/\[(.+?)\]\([^)]*\)/g, '$1')
  t = t.replace(/\*\*/g, '')
  t = t.replace(/\*/g, '')
  return collapseWhitespace(t)
}

function stripListPrefix(line) {
  return String(line || '')
    .replace(/^[\s\u2022•*–—·-]+/g, '')
    .replace(/^\(?[0-9]{1,2}\)?[.)]\s*/, '')
    .replace(/^[0-9]{1,2}[.)]\s*/, '')
    .trim()
}

function cleanDisplayParagraph(body) {
  return String(body || '')
    .split(/\r?\n/)
    .map((line) => collapseWhitespace(stripMarkdown(stripListPrefix(line))))
    .filter(Boolean)
    .join('\n')
}

function parseImprovementItemsFromBody(body) {
  const raw = String(body || '').split(/\r?\n/)
  const seen = new Set()
  const items = []
  for (const line of raw) {
    let t = stripMarkdown(line)
    t = stripListPrefix(t)
    t = collapseWhitespace(t)
    if (!t || seen.has(t)) continue
    seen.add(t)
    const colon = t.indexOf(':')
    if (colon > -1) {
      const title = collapseWhitespace(t.slice(0, colon))
      const description = collapseWhitespace(t.slice(colon + 1))
      if (title && description) {
        items.push({ title, description })
        continue
      }
    }
    items.push({ title: t, description: '' })
  }
  return items
}

function scoreTone(n) {
  if (n == null) return { text: 'text-white/75' }
  if (n <= 4) return { text: 'text-red-400' }
  if (n <= 6) return { text: 'text-amber-300' }
  return { text: 'text-[#FACC15]' }
}

function formatSessionClock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m ${String(r).padStart(2, '0')}s`
}

function ScoreBar({ value, max = 10 }) {
  const pct = Math.min(100, Math.max(0, ((value ?? 0) / max) * 100))
  return (
    <div className="h-[4px] w-24 shrink-0 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-[#FACC15] transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function InterviewFeedbackScreen({ session, feedbackText, onBackHome }) {
  const blocks = parseFeedbackBlocks(feedbackText)
  const overallBlock = blocks.find((b) => {
    const h = String(b.heading || '').toLowerCase()
    return h.includes('overall') && h.includes('score')
  })
  const fixBlock = blocks.find((b) => String(b.heading || '').toLowerCase().includes('top 3'))
  let score = overallBlock ? extractOverallScore(overallBlock.body) : null
  if (score == null) score = extractOverallScoreFromFullText(feedbackText)
  const verdict = overallBlock
    ? overallSummaryLine(overallBlock.body, score)
    : score != null
      ? verdictWithoutOverallBlock(feedbackText, score)
      : 'Session complete.'

  const metricScores = {}
  for (const { key } of METRIC_KEYS) {
    const block = blocks.find((b) =>
      String(b.heading || '').toLowerCase().includes(key.toLowerCase()),
    )
    let v = block ? extractScoreFromBody(block.body) : null
    if (v == null) v = extractMetricScoreFromFullText(feedbackText, key)
    metricScores[key] = v
  }

  const improvementItems = fixBlock ? parseImprovementItemsFromBody(fixBlock.body) : []

  const metricHeadingSet = new Set(METRIC_KEYS.map((m) => m.key))
  const hasStructuredSections = blocks.some((x) => {
    const t = String(x.heading || '')
    const hl = t.toLowerCase()
    if (!t || t === 'Feedback') return false
    if (metricHeadingSet.has(x.heading)) return false
    if (hl.includes('overall score') || hl.includes('top 3') || hl.includes('question-by-question'))
      return false
    return true
  })
  const strengthBlocks = blocks.filter((b) => {
    const h = String(b.heading || '').toLowerCase()
    if (metricHeadingSet.has(b.heading)) return false
    if (h === 'feedback' && hasStructuredSections) return false
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
  const qCount = session?.questionCount ?? 0
  const mode = session?.mode || 'Voice'

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.07, delayChildren: 0.06 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.2, 0.9, 0.2, 1] } },
  }

  const verdictDisplay =
    stripOverallFractionFromSummaryText(stripMarkdown(verdict), score).trim() ||
    'Needs significant improvement before applying.'

  const strengthsBody =
    strengthBlocks.length > 0
      ? strengthBlocks.map((b, i) => (
          <div key={i} className="mt-8 first:mt-0">
            <div className="text-base font-semibold tracking-tight text-[#FACC15]">
              {stripMarkdown(b.heading)}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-white/70">
              {cleanDisplayParagraph(b.body)}
            </p>
          </div>
        ))
      : (
          <p className="mt-6 text-base leading-relaxed text-white/60">
            No structured sections parsed from the model reply.
          </p>
        )

  const improveDefault = stripMarkdown(
    'See full detailed breakdown above. Work on structuring answers and deepening technical depth. Prepare a range of project and challenge-related answers.',
  )

  return (
    <div
      className="relative min-h-[100svh] overflow-x-hidden bg-[#080808] text-[#f3f3f3]"
      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
    >
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,rgba(250,204,21,0.06),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_55%_40%_at_50%_42%,rgba(250,204,21,0.04),transparent_60%)]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-[1100px] px-6 py-14 md:px-12 md:py-16">
        <MotionDiv
          variants={container}
          initial="hidden"
          animate="show"
          className="flex w-full flex-col items-center"
        >
          {/* 1. Header */}
          <MotionDiv variants={item} className="w-full text-center">
            <p className="m-0 text-xs font-medium uppercase tracking-[0.25em] text-white/50">
              Session complete
            </p>
            <h1 className="mt-3 text-5xl font-bold leading-tight tracking-tight text-[#FACC15] md:text-6xl">
              Your Feedback
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/60">
              Post-interview report — your performance at a glance.
            </p>
          </MotionDiv>

          {/* 2. User info — compact row, no box */}
          <MotionDiv variants={item} className="mt-12 w-full text-center md:mt-16">
            <p className="text-base leading-relaxed text-white/60">
              <span className="whitespace-nowrap">👤 {name} — {role}</span>
              <span className="mx-2 text-white/25">·</span>
              <span className="inline">
                {[
                  exp || null,
                  formatSessionClock(planned),
                  `${qCount} ${qCount === 1 ? 'question' : 'questions'}`,
                  mode,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </p>
          </MotionDiv>

          {/* 3. Main score card (score + metrics) */}
          <MotionDiv
            variants={item}
            className="relative mt-12 w-full max-w-[900px] rounded-[20px] bg-[rgba(255,255,255,0.04)] p-10 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:mt-16 md:p-12"
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-[20px] bg-[radial-gradient(ellipse_75%_55%_at_50%_18%,rgba(250,204,21,0.07),transparent_65%)]"
              aria-hidden
            />
            <div className="relative flex flex-col">
              <div className="text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/50">
                  Overall score
                </p>
                <div
                  className="mt-4 text-6xl font-bold leading-none tabular-nums tracking-tight text-[#FACC15] md:text-7xl"
                  style={{ textShadow: '0 0 40px rgba(250,204,21,0.5)' }}
                >
                  {score != null ? `${Math.round(score)}/10` : '—'}
                </div>
                <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-white/70">
                  {verdictDisplay}
                </p>
              </div>

              <div className="mt-10 grid grid-cols-1 items-center gap-12 md:grid-cols-2">
                <div className="flex flex-col items-center gap-6">
                  {METRIC_LEFT.map(({ key, label }) => {
                    const v = metricScores[key]
                    const tone = scoreTone(v)
                    return (
                      <div key={key} className="flex flex-col items-center">
                        <div className="text-xs font-medium uppercase tracking-wide text-white/50">
                          {label}
                        </div>
                        <div className={`mt-1 text-xl font-semibold tabular-nums ${tone.text}`}>
                          {v != null ? `${Math.round(v)}/10` : '—'}
                        </div>
                        <div className="mt-2">
                          <ScoreBar value={v} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-col items-center gap-6">
                  {METRIC_RIGHT.map(({ key, label }) => {
                    const v = metricScores[key]
                    const tone = scoreTone(v)
                    return (
                      <div key={key} className="flex flex-col items-center">
                        <div className="text-xs font-medium uppercase tracking-wide text-white/50">
                          {label}
                        </div>
                        <div className={`mt-1 text-xl font-semibold tabular-nums ${tone.text}`}>
                          {v != null ? `${Math.round(v)}/10` : '—'}
                        </div>
                        <div className="mt-2">
                          <ScoreBar value={v} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </MotionDiv>

          {/* 4. Insights: strengths | improvements (desktop 2-col) */}
          <MotionDiv
            variants={item}
            className="mt-12 grid w-full max-w-[800px] grid-cols-1 gap-12 text-left md:mt-16 md:max-w-none md:grid-cols-2 md:gap-10"
          >
            <div className="space-y-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-white/50">
                Strengths &amp; Signals
              </h2>
              <div>{strengthsBody}</div>
            </div>

            <div className="mx-auto w-full max-w-[800px] space-y-6 text-left md:mx-0">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-white/50">
                Areas to improve
              </h2>
              {improvementItems.length > 0 ? (
                <ul className="list-none space-y-4 p-0">
                  {improvementItems.map((it, i) => (
                    <li
                      key={i}
                      className="rounded-2xl bg-[rgba(255,255,255,0.04)] p-4 transition-shadow duration-300 hover:shadow-[0_0_28px_rgba(250,204,21,0.18)]"
                    >
                      <div className="text-base font-semibold text-white">{it.title}</div>
                      {it.description ? (
                        <p className="mt-1 text-sm leading-relaxed text-white/70">{it.description}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base leading-relaxed text-white/70">{improveDefault}</p>
              )}
            </div>
          </MotionDiv>

          <MotionDiv variants={item} className="mt-12 flex w-full justify-center md:mt-16">
            <button
              type="button"
              onClick={() => onBackHome?.()}
              className="inline-flex min-h-[56px] cursor-pointer items-center justify-center rounded-xl border-0 bg-gradient-to-b from-[#fde047] to-[#eab308] px-10 py-4 text-lg font-semibold text-zinc-900 antialiased shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_12px_44px_-4px_rgba(250,204,21,0.55)] outline-none transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_18px_56px_-2px_rgba(250,204,21,0.65)] hover:brightness-[1.02] active:scale-[0.98] active:brightness-[0.98] focus-visible:ring-2 focus-visible:ring-[#FACC15]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]"
            >
              Back to home
            </button>
          </MotionDiv>
        </MotionDiv>
      </div>
    </div>
  )
}
