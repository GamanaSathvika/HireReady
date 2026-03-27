import { motion } from 'framer-motion'

const FEEDBACK_HEADINGS = [
  'Overall Score (out of 10)',
  'Communication',
  'Structure',
  'Technical Depth',
  'Confidence',
  'Question-by-Question Breakdown',
  'Top 3 Things to Fix',
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

function extractOverallScore(body) {
  const m = String(body || '').match(/(\d{1,2}(?:\.\d+)?)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : null
}

function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m ${String(r).padStart(2, '0')}s`
}

export function InterviewFeedbackScreen({ session, feedbackText, onBackHome }) {
  const blocks = parseFeedbackBlocks(feedbackText)
  const overallBlock = blocks.find((b) =>
    String(b.heading || '').toLowerCase().includes('overall score'),
  )
  const fixBlock = blocks.find((b) => String(b.heading || '').toLowerCase().includes('top 3'))
  const score = overallBlock ? extractOverallScore(overallBlock.body) : null
  const verdict =
    overallBlock?.body?.replace(/^\(?out of 10\)?/i, '').trim() || 'Session complete.'

  const improveLines = fixBlock
    ? fixBlock.body
        .split(/\r?\n/)
        .map((x) => x.replace(/^[-*•\d.)]+\s*/, '').trim())
        .filter(Boolean)
    : []

  const strengthBlocks = blocks.filter((b) => {
    const h = String(b.heading || '').toLowerCase()
    return (
      !h.includes('overall score') &&
      !h.includes('top 3') &&
      !h.includes('question-by-question')
    )
  })

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.06 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.2, 0.9, 0.2, 1] } },
  }

  return (
    <div
      className="min-h-[100svh] bg-[#0a0a0a] text-[#f3f3f3]"
      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-6">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a9a9a]">
              Interview complete
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[28px]">
              Your feedback
            </h1>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-6 rounded-[14px] border border-white/[0.08] bg-[#141414] p-5"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a9a9a]">
                  Session
                </div>
                <div className="mt-1 text-sm text-white/90">
                  {formatClock(session?.elapsedSec ?? 0)}
                  {session?.configuredDurationSec
                    ? ` / ${formatClock(session.configuredDurationSec)} planned`
                    : ''}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a9a9a]">
                  Role
                </div>
                <div className="mt-1 text-sm text-white/90">{session?.role || '—'}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a9a9a]">
                  Mode
                </div>
                <div className="mt-1 text-sm text-white/90">{session?.mode || 'Voice'}</div>
              </div>
            </div>
            {session?.experienceLevel ? (
              <div className="mt-4 border-t border-white/[0.06] pt-4 text-[13px] text-[#9a9a9a]">
                Experience level:{' '}
                <span className="text-white/85">{session.experienceLevel}</span>
              </div>
            ) : null}
          </motion.div>

          {score != null ? (
            <motion.div
              variants={item}
              className="mt-5 rounded-[14px] border border-[#ffb547]/35 bg-[#ffb547]/[0.07] p-5 text-center"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffb547]">
                Overall score
              </div>
              <div className="mt-2 text-4xl font-bold tabular-nums text-[#ffb547]">{score}</div>
              <div className="mt-2 text-[13px] leading-snug text-white/75">{verdict}</div>
            </motion.div>
          ) : (
            <motion.div variants={item} className="mt-5 rounded-[14px] border border-white/10 bg-[#141414] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffb547]">
                Verdict
              </div>
              <p className="mt-2 mb-0 text-[13px] leading-relaxed text-white/80">{verdict}</p>
            </motion.div>
          )}

          <motion.div variants={item} className="mt-5 rounded-[14px] border border-white/[0.08] bg-[#141414] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a9a9a]">
              Strengths &amp; signal
            </div>
            <div className="mt-3 space-y-3">
              {strengthBlocks.length ? (
                strengthBlocks.map((b, i) => (
                  <div key={i} className="rounded-[10px] bg-white/[0.04] px-3 py-3">
                    <div className="text-[12px] font-semibold text-[#ffb547]">{b.heading}</div>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-white/75">
                      {b.body}
                    </pre>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-white/55">No structured sections parsed from the model reply.</p>
              )}
            </div>
          </motion.div>

          <motion.div variants={item} className="mt-5 rounded-[14px] border border-white/[0.08] bg-[#141414] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a9a9a]">
              Areas to improve
            </div>
            <ul className="mt-3 list-none space-y-2 p-0">
              {improveLines.length ? (
                improveLines.map((line, i) => (
                  <li
                    key={i}
                    className="rounded-[10px] border border-red-500/25 bg-red-500/[0.08] px-3 py-2.5 text-[13px] text-red-100/90"
                  >
                    {line}
                  </li>
                ))
              ) : fixBlock ? (
                <li className="text-[13px] text-white/75">{fixBlock.body}</li>
              ) : (
                <li className="text-[13px] text-white/55">See full report in the sections above.</li>
              )}
            </ul>
          </motion.div>

          <motion.div variants={item} className="mt-8">
            <button
              type="button"
              onClick={() => onBackHome?.()}
              className="h-[52px] w-full cursor-pointer rounded-[12px] border border-white/15 bg-[#2a2a2a] text-[15px] font-semibold text-white transition-colors hover:bg-[#333]"
            >
              Back to home
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
