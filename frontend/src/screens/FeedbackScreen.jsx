/**
 * Post-interview feedback — premium dark dashboard (Tailwind only).
 * Pass props to override defaults; omit for demo content matching the design spec.
 */
const GOLD = '#facc15'

const defaultMetrics = [
  { key: 'comm', label: 'Communication', score: 3, pct: 30 },
  { key: 'struct', label: 'Structure', score: 2, pct: 20 },
  { key: 'tech', label: 'Technical depth', score: 2, pct: 20 },
  { key: 'conf', label: 'Confidence', score: 4, pct: 40 },
]

function scoreColorClass(score) {
  if (score == null) return 'text-[#a1a1aa]'
  if (score <= 3) return 'text-red-400'
  if (score <= 5) return 'text-orange-400'
  return 'text-[#facc15]'
}

function MetricBar({ label, score, pct }) {
  const safePct = Math.min(100, Math.max(0, pct ?? (score != null ? score * 10 : 0)))
  return (
    <div className="group flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-full shrink-0 text-[13px] font-medium text-[#a1a1aa] sm:w-[32%] sm:min-w-[8.5rem]">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#27272a] transition-colors duration-300 group-hover:bg-[#3f3f46]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ca8a04] to-[#facc15] transition-all duration-500 ease-out group-hover:from-[#eab308] group-hover:to-[#fde047]"
            style={{ width: `${safePct}%` }}
          />
        </div>
        <span
          className={`w-11 shrink-0 text-right text-[13px] font-bold tabular-nums sm:w-14 ${scoreColorClass(score)}`}
        >
          {score != null ? `${score}/10` : '—'}
        </span>
      </div>
    </div>
  )
}

export default function FeedbackScreen({
  candidateName = 'Ravi',
  role = 'Software Developer',
  experienceLevel = '0–1 years',
  sessionBadge = '10 min session',
  questionCount = 5,
  sessionClock = '10m 00s',
  mode = 'Voice',
  overallScore = 3,
  verdict = 'Needs significant improvement before applying.',
  metrics = defaultMetrics,
  strengthsText = 'No structured sections parsed from the model reply.',
  improveText =
    'See full detailed breakdown above. Work on structuring answers and deepening technical depth. Prepare a range of project and challenge-related answers.',
  onBackHome,
}) {
  return (
    <div
      className="min-h-[100svh] bg-[#0b0b0b] font-sans text-white antialiased transition-colors duration-300"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="mx-auto flex min-h-[100svh] max-w-2xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-6 sm:gap-7">
          {/* Header */}
          <header className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a1a1aa]">
              Post-interview report
            </p>
            <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">Session complete</h1>
            <p className="mt-2 text-3xl font-bold sm:text-4xl" style={{ color: GOLD }}>
              Your Feedback
            </p>
          </header>

          {/* User row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] font-semibold">
              <span className="text-white">{candidateName}</span>
              <span className="font-normal text-[#71717a]"> — </span>
              <span className="text-[#e4e4e7]">{role}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#facc15]/40 bg-[#facc15]/10 px-3 py-1.5 text-[12px] font-medium text-[#fde047] transition-all duration-300">
                {experienceLevel}
              </span>
              <span className="rounded-full bg-[#27272a] px-3 py-1.5 text-[12px] font-medium text-[#d4d4d8] transition-all duration-300 hover:bg-[#3f3f46]">
                {sessionBadge}
              </span>
              <span className="rounded-full bg-[#27272a] px-3 py-1.5 text-[12px] font-medium text-[#d4d4d8] transition-all duration-300 hover:bg-[#3f3f46]">
                {questionCount} {questionCount === 1 ? 'question' : 'questions'}
              </span>
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Session details */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a1a1aa]">Session</p>
              <p className="mt-1.5 text-sm font-medium text-white sm:text-[15px]">{sessionClock}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a1a1aa]">Role</p>
              <p className="mt-1.5 text-sm font-medium text-white sm:text-[15px]">{role}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a1a1aa]">Mode</p>
              <p className="mt-1.5 text-sm font-medium text-white sm:text-[15px]">{mode}</p>
            </div>
          </div>

          {/* Score card */}
          <div
            className="relative overflow-hidden rounded-2xl border border-[#2a2a2a] p-6 shadow-2xl transition-shadow duration-300 sm:p-8"
            style={{
              background: 'linear-gradient(145deg, #0f0f0f 0%, #1a1510 45%, #1a1a1a 100%)',
              boxShadow:
                '0 0 0 1px rgba(250, 204, 21, 0.08), 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 100px -30px rgba(234, 179, 8, 0.15)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                background: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(250, 204, 21, 0.45), transparent 55%)',
              }}
            />
            <div className="relative text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a1a1aa]">Overall score</p>
              <p className="mt-3 text-6xl font-extrabold tabular-nums leading-none sm:text-7xl" style={{ color: GOLD }}>
                {overallScore}/10
              </p>
              <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-[#a1a1aa]">{verdict}</p>
            </div>

            <div className="relative mt-10 grid grid-cols-2 gap-6 border-t border-white/[0.06] pt-8 sm:grid-cols-4 sm:gap-4">
              {metrics.map((m) => (
                <div key={m.key} className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a1a1aa]">{m.label}</p>
                  <p className={`mt-2 text-lg font-bold tabular-nums sm:text-xl ${scoreColorClass(m.score)}`}>
                    {m.score}/10
                  </p>
                </div>
              ))}
            </div>

            <div className="relative mt-10 space-y-5 border-t border-white/[0.06] pt-8">
              {metrics.map((m) => (
                <MetricBar key={`bar-${m.key}`} label={m.label} score={m.score} pct={m.pct} />
              ))}
            </div>
          </div>

          {/* Strengths */}
          <section className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5 transition-all duration-300 sm:p-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a1a1aa]">
              Strengths &amp; signal
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-[#a1a1aa]">{strengthsText}</p>
          </section>

          {/* Areas */}
          <section className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5 transition-all duration-300 sm:p-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a1a1aa]">Areas to improve</h2>
            <p className="mt-4 text-[14px] leading-relaxed text-[#d4d4d8]">{improveText}</p>
          </section>

          {/* CTA */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => onBackHome?.()}
              className="h-[52px] w-full rounded-xl bg-[#3f3f46] text-[15px] font-semibold text-white transition-all duration-300 hover:bg-[#52525b] active:bg-[#71717a]"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
