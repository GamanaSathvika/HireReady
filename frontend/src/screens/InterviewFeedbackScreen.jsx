import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

const GOLD = '#FACC15'

function scoreColorClass(n) {
  if (n == null) return 'text-[#a1a1aa]'
  if (n <= 3) return 'text-red-400'
  if (n <= 5) return 'text-orange-400'
  return 'text-[#facc15]'
}

function barGradientForScore(n) {
  if (n == null) return 'from-zinc-600 to-zinc-500'
  if (n <= 4) return 'from-red-600 to-orange-400'
  if (n <= 6) return 'from-orange-600 to-amber-400'
  return 'from-[#ca8a04] to-[#facc15]'
}

function formatSessionClock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m ${String(r).padStart(2, '0')}s`
}

function formatPlannedMin(seconds) {
  const m = Math.max(1, Math.round((seconds || 600) / 60))
  return `${m} min session`
}

function MetricBar({ label, score, max = 10 }) {
  const pct = Math.min(100, Math.max(0, ((score ?? 0) / max) * 100))
  const grad = barGradientForScore(score)
  return (
    <div className="flex items-center gap-4">
      <span className="w-36 shrink-0 text-[13px] text-[#a1a1aa]">{label}</span>
      <div className="flex flex-1 items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#27272a]">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${grad}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <span className={`w-12 shrink-0 text-right text-[13px] font-bold tabular-nums ${scoreColorClass(score)}`}>
          {score != null ? `${score}/10` : '—'}
        </span>
      </div>
    </div>
  )
}

function ExpandableQuestion({ q, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-white/[0.07] bg-[#141414]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-start justify-between p-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717a]">
            Question {index + 1}
          </span>
          <p className="mt-1 text-[14px] font-semibold leading-snug text-white">{q.question}</p>
        </div>
        <div className="ml-4 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-sm text-[#a1a1aa]">
          {open ? '−' : '+'}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-white/[0.05]"
          >
            <div className="space-y-4 p-4 text-[13px]">
              <div>
                <strong className="text-[#a1a1aa]">Expected Structure:</strong>
                <p className="mt-1 text-[#d4d4d8]">{q.expectedStructure}</p>
              </div>
              <div>
                <strong className="text-[#a1a1aa]">Actual Response:</strong>
                <p className="mt-1 text-[#d4d4d8]">{q.actualResponse}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-green-500/10 p-3 ring-1 ring-green-500/20">
                  <strong className="text-green-400">Coverage:</strong>
                  <p className="mt-1 text-green-100/80">{q.coverage}</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-3 ring-1 ring-red-500/20">
                  <strong className="text-red-400">Gaps:</strong>
                  <p className="mt-1 text-red-100/80">{q.gaps}</p>
                </div>
              </div>
              {q.misconceptions && q.misconceptions.toLowerCase() !== 'none' && (
                <div className="rounded-lg bg-orange-500/10 p-3 ring-1 ring-orange-500/20">
                  <strong className="text-orange-400">Misconceptions:</strong>
                  <p className="mt-1 text-orange-100/80">{q.misconceptions}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const DEMO_SESSION = {
  candidateName: 'Ravi',
  role: 'Software Developer',
  experienceLevel: '0-1 years',
  configuredDurationSec: 600,
  elapsedSec: 600,
  questionCount: 5,
  mode: 'Voice',
}

const DEMO_FEEDBACK = {
  overallScore: 3,
  verdict:
    'Your answers lacked structure and depth. You showed some confidence but need significant preparation before applying for this role.',
  communicationScore: 3,
  structureScore: 2,
  technicalScore: 2,
  confidenceScore: 4,
  strengths:
    'You maintained a calm and confident tone throughout the session, which helped keep the conversation flowing. You attempted to engage with every question and showed willingness to think through problems rather than giving up. These are solid foundations to build on.',
  areasToImprove:
    'Structure your answers using a clear framework — for behavioural questions, try Situation → Task → Action → Result. Deepen your technical knowledge by practising common algorithms and system design concepts. Prepare 3–4 strong project stories you can adapt to different questions.',
  needsImprovement: [
    {
      mistake: 'Unstructured answers',
      recommendation:
        'Responses jumped between points without a clear thread. Practise outlining your answer in 1–2 seconds before speaking — a brief pause shows confidence, not hesitation.',
    },
    {
      mistake: 'Shallow technical detail',
      recommendation:
        "Answers stayed at a surface level without explaining the why behind decisions. Interviewers want to understand your reasoning — walk them through trade-offs and alternatives you considered.",
    },
    {
      mistake: 'Missing concrete examples',
      recommendation:
        'Several answers were abstract rather than grounded in real experience. Tie every claim back to a specific project, outcome, or metric — it makes your answers credible and memorable.',
    },
  ],
  questionEvaluations: [
    {
      question: 'Tell me about yourself and your background in software development.',
      expectedStructure: 'Brief intro, key skills, relevant experience, why this role.',
      actualResponse: 'Gave a general overview without connecting to the role.',
      coverage: 'Covered background but missed role relevance.',
      gaps: 'No mention of specific skills or achievements.',
      misconceptions: 'None',
    },
    {
      question: 'Describe a challenging project you worked on and how you overcame difficulties.',
      expectedStructure: 'STAR format: Situation, Task, Action, Result.',
      actualResponse: 'Described the project but jumped between points.',
      coverage: 'Situation and task covered.',
      gaps: 'Missing clear actions taken and measurable result.',
      misconceptions: 'None',
    },
    {
      question: 'Explain the difference between REST and GraphQL APIs.',
      expectedStructure: 'Definition of each, key differences, use cases.',
      actualResponse: 'Gave a high-level answer without depth.',
      coverage: 'Basic definitions mentioned.',
      gaps: 'No trade-offs, no use-case guidance.',
      misconceptions: 'Implied REST is always better — not accurate.',
    },
  ],
}

export function InterviewFeedbackScreen({
  session = DEMO_SESSION,
  feedbackData = DEMO_FEEDBACK,
  onBackHome,
}) {
  const score = feedbackData?.overallScore ?? null
  const verdict = feedbackData?.verdict || null

  const metrics = [
    { key: 'comm', label: 'Communication', score: feedbackData?.communicationScore ?? null },
    { key: 'struct', label: 'Structure', score: feedbackData?.structureScore ?? null },
    { key: 'tech', label: 'Technical depth', score: feedbackData?.technicalScore ?? null },
    { key: 'conf', label: 'Confidence', score: feedbackData?.confidenceScore ?? null },
  ]

  const name = session?.candidateName?.trim() || 'You'
  const role = session?.role || '—'
  const exp = session?.experienceLevel || ''
  const planned = session?.configuredDurationSec ?? 0
  const elapsed = session?.elapsedSec ?? planned
  const qCount = session?.questionCount ?? 0
  const mode = session?.mode || 'Voice'

  const strengthsText =
    Array.isArray(feedbackData?.strengths)
      ? feedbackData.strengths.join(' ')
      : feedbackData?.strengthsText || feedbackData?.strengths || ''

  const improveText =
    Array.isArray(feedbackData?.weaknesses)
      ? feedbackData.weaknesses.join(' ')
      : feedbackData?.improveText ||
      feedbackData?.areasToImprove ||
      ''

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  }
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.2, 0.9, 0.2, 1] } },
  }

  if (!feedbackData || feedbackData.error) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-[#0b0b0b] text-white">
        <div className="text-center">
          <p className="text-red-400">Error: {feedbackData?.error || 'Could not parse feedback.'}</p>
          <button onClick={onBackHome} className="mt-4 rounded-xl bg-white/10 px-6 py-2">
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-[100svh] bg-black text-white antialiased"
      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">

          {/* ── Header ── */}
          <motion.div variants={item} className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#71717a]">
              Post-interview report
            </p>
            <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">Session complete</h1>
            <p className="mt-1 text-2xl font-bold sm:text-3xl" style={{ color: GOLD }}>
              Your Feedback
            </p>
          </motion.div>

          {/* ── Candidate row ── */}
          <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3f3f46] text-[13px] font-bold text-white">
                {name.charAt(0).toUpperCase()}
              </div>
              <p className="text-[15px] font-semibold">
                <span className="text-white">{name}</span>
                <span className="font-normal text-[#71717a]"> — </span>
                <span className="text-[#e4e4e7]">{role}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {exp && (
                <span className="rounded-full border border-[#facc15]/40 bg-[#facc15]/10 px-3 py-1 text-[11px] font-semibold text-[#fde047]">
                  {exp}
                </span>
              )}
              <span className="rounded-full bg-[#27272a] px-3 py-1 text-[11px] font-medium text-[#d4d4d8]">
                {formatPlannedMin(planned)}
              </span>
              <span className="rounded-full bg-[#27272a] px-3 py-1 text-[11px] font-medium text-[#d4d4d8]">
                {qCount} {qCount === 1 ? 'question' : 'questions'}
              </span>
            </div>
          </motion.div>

          <div className="h-px bg-white/[0.06]" />

          {/* ── Session / Role / Mode ── */}
          <motion.div variants={item} className="grid grid-cols-3 gap-4">
            {[
              { label: 'SESSION', value: formatSessionClock(elapsed) },
              { label: 'ROLE', value: role },
              { label: 'MODE', value: mode },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#71717a]">{label}</p>
                <p className="mt-1.5 text-[14px] font-semibold text-white">{value}</p>
              </div>
            ))}
          </motion.div>

          {/* ── Score card ── */}
          <motion.div variants={item}>
            <div
              className="relative overflow-hidden rounded-2xl border border-[#2a2a2a] p-6 sm:p-8"
              style={{
                background: 'linear-gradient(145deg, #0f0f0f 0%, #1a1510 50%, #1a1a1a 100%)',
                boxShadow:
                  '0 0 0 1px rgba(250,204,21,0.08), 0 25px 50px -12px rgba(0,0,0,0.7), 0 0 80px -20px rgba(234,179,8,0.12)',
              }}
            >
              {/* Glow */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(250,204,21,0.18), transparent 60%)',
                }}
              />

              {/* Overall score */}
              <div className="relative text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#71717a]">Overall score</p>
                <p className="mt-3 text-6xl font-extrabold tabular-nums" style={{ color: GOLD }}>
                  {score != null ? `${score}/10` : '—'}
                </p>
                {verdict && (
                  <p className="mx-auto mt-4 max-w-sm text-[13px] leading-relaxed text-[#a1a1aa]">{verdict}</p>
                )}
              </div>

              {/* 4-column metric summary */}
              <div className="relative mt-8 grid grid-cols-4 gap-2 border-t border-white/[0.06] pt-6">
                {metrics.map((m) => (
                  <div key={m.key} className="text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#71717a]">{m.label}</p>
                    <p className={`mt-2 text-lg font-bold tabular-nums ${scoreColorClass(m.score)}`}>
                      {m.score != null ? `${m.score}/10` : '—'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Metric bars */}
              <div className="relative mt-6 space-y-4 border-t border-white/[0.06] pt-6">
                {metrics.map((m) => (
                  <MetricBar key={`bar-${m.key}`} label={m.label} score={m.score} />
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── What you did well ── */}
          {strengthsText && (
            <motion.div
              variants={item}
              className="rounded-2xl border border-white/[0.06] bg-[#111] p-5 sm:p-6"
            >
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#71717a]">
                What you did well
              </h2>
              <p className="mt-4 text-[13px] leading-relaxed text-[#a1a1aa]">{strengthsText}</p>
            </motion.div>
          )}

          {/* ── Where to improve ── */}
          {improveText && (
            <motion.div
              variants={item}
              className="rounded-2xl border border-white/[0.06] bg-[#111] p-5 sm:p-6"
            >
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#71717a]">
                Where to improve
              </h2>
              <p className="mt-4 text-[13px] leading-relaxed text-[#d4d4d8]">{improveText}</p>
            </motion.div>
          )}

          {/* ── Needs improvement ── */}
          {feedbackData.needsImprovement?.length > 0 && (
            <motion.div
              variants={item}
              className="rounded-2xl border border-white/[0.06] bg-[#111] p-5 sm:p-6"
            >
              <h2 className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#71717a]">
                Needs improvement
              </h2>
              <div className="space-y-5">
                {feedbackData.needsImprovement.map((ni, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-sm text-red-400">
                      ⚠
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-white">{ni.mistake}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-[#a1a1aa]">{ni.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Missed opportunities ── */}
          {feedbackData.missedOpportunities?.length > 0 && (
            <motion.div
              variants={item}
              className="rounded-2xl border border-white/[0.06] bg-[#111] p-5 sm:p-6"
            >
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#71717a]">
                Missed opportunities
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-4 text-[13px] leading-relaxed text-[#d4d4d8]">
                {feedbackData.missedOpportunities.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* ── Question breakdown ── */}
          {feedbackData.questionEvaluations?.length > 0 && (
            <motion.div variants={item}>
              <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#71717a]">
                Question breakdown
              </h2>
              {feedbackData.questionEvaluations.map((q, i) => (
                <ExpandableQuestion key={i} index={i} q={q} />
              ))}
            </motion.div>
          )}

          {/* ── CTA ── */}
          <motion.div variants={item}>
            <button
              type="button"
              onClick={() => onBackHome?.()}
              className="h-[52px] w-full cursor-pointer rounded-xl bg-[#27272a] text-[15px] font-semibold text-white transition-colors hover:bg-[#3f3f46] active:bg-[#52525b]"
            >
              Back to home
            </button>
          </motion.div>

        </motion.div>
      </div>
    </div>
  )
}

export default InterviewFeedbackScreen