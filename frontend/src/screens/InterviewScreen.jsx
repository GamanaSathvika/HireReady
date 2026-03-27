import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMediaRecorder } from '../hooks/useMediaRecorder'
import { useTimer } from '../hooks/useTimer'

/* ─── helpers ────────────────────────────────────────────────── */
function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function parseDurationToSeconds(duration) {
  if (!duration) return 600
  const numeric = Number(duration.replace(/\D/g, ''))
  if (Number.isNaN(numeric) || numeric <= 0) return 600
  return numeric * 60
}

/* ─── sub-components ─────────────────────────────────────────── */

/** Minimal top bar — glassmorphism, perfectly balanced */
function TopBar({ role, progressLabel, onExit }) {
  return (
    <div className="top-bar">
      {/* LEFT — live status */}
      <div className="top-bar-section top-bar-left">
        <span className="live-dot" aria-hidden="true" />
        <span className="live-label">LIVE</span>
      </div>

      {/* CENTER — role */}
      <div className="top-bar-section top-bar-center">
        <span className="top-bar-role">{role ?? 'Interview'}</span>
      </div>

      {/* RIGHT — timer + exit */}
      <div className="top-bar-section top-bar-right">
        <span className="top-bar-timer" aria-label="Elapsed time">{progressLabel}</span>
        <button className="exit-btn" onClick={onExit} aria-label="Exit interview">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Exit
        </button>
      </div>
    </div>
  )
}

/** Status line above mic — calm, subtle */
function StatusLabel({ aiSpeaking, speaking, interviewEnded }) {
  let text = 'Listening…'
  let color = 'var(--text-muted)'

  if (interviewEnded) { text = 'Session complete'; color = 'var(--accent)' }
  else if (aiSpeaking) { text = 'AI is speaking…'; color = 'var(--text-secondary)' }
  else if (speaking)   { text = 'Listening to your response…'; color = 'var(--text-secondary)' }

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={text}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25 }}
        className="status-label"
        style={{ color }}
      >
        {text}
      </motion.p>
    </AnimatePresence>
  )
}

/** Clean circular mic button with controlled pulse */
function MicOrb({ active, aiSpeaking, onClick }) {
  return (
    <button
      className={`mic-orb ${active ? 'mic-orb--active' : ''} ${aiSpeaking ? 'mic-orb--ai' : ''}`}
      onClick={onClick}
      aria-label={active ? 'Stop recording' : 'Start recording'}
    >
      {/* outer breathing ring */}
      {active && (
        <>
          <span className="mic-ring mic-ring--1" aria-hidden="true" />
          <span className="mic-ring mic-ring--2" aria-hidden="true" />
        </>
      )}

      {/* inner core */}
      <span className="mic-core" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M19 11a7 7 0 0 1-14 0"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M12 18v3"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </button>
  )
}

/** Minimal waveform bars */
function Waveform({ active }) {
  const bars = 28
  return (
    <div className="waveform" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`waveform-bar ${active ? 'waveform-bar--active' : ''}`}
          style={{ animationDelay: `${(i * 0.04).toFixed(2)}s` }}
        />
      ))}
    </div>
  )
}

/** Pre-interview "get ready" card */
function ReadyScreen({ config, onStart }) {
  const items = [
    { icon: '🎤', title: 'Microphone enabled', sub: "We'll record your responses" },
    { icon: '🔇', title: 'Quiet environment', sub: 'Minimise background noise' },
    { icon: '⚡', title: 'Be clear & concise', sub: 'You can stop at any time' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
      className="ready-screen"
    >
      <div className="ready-card">
        <header className="ready-card__header">
          <h2>Ready to begin?</h2>
          {config.role && <p>{config.role} Interview</p>}
        </header>

        <ul className="ready-card__list">
          {items.map(({ icon, title, sub }) => (
            <li key={title} className="ready-card__row">
              <span className="ready-card__icon">{icon}</span>
              <div>
                <p className="ready-card__item-title">{title}</p>
                <p className="ready-card__item-sub">{sub}</p>
              </div>
            </li>
          ))}
        </ul>

        <button className="start-btn" onClick={onStart}>
          Start Interview
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 8 }}>
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

/* ─── main screen ────────────────────────────────────────────── */
export function InterviewScreen({ onAnswerCaptured, onExit, config = {} }) {
  const { status, error, blob, stream, start, stop } = useMediaRecorder()
  const recording = status === 'recording'
  const stopped   = status === 'stopped'

  const [started, setStarted]             = useState(false)
  const [interviewEnded, setInterviewEnded] = useState(false)
  const [aiSpeaking, setAiSpeaking]       = useState(false)
  const [speaking, setSpeaking]           = useState(false)
  const hasStoppedRef = useRef(false)

  const timer = useTimer({ running: started && !interviewEnded })

  const durationSeconds = useMemo(
    () => parseDurationToSeconds(config.duration),
    [config.duration]
  )
  const progressLabel = `${timer.mmss} / ${formatMMSS(durationSeconds)}`

  /* start interview */
  const startInterview = async () => {
    setStarted(true)
    setAiSpeaking(true)
    setInterviewEnded(false)
    hasStoppedRef.current = false
    await start()
    setTimeout(() => setAiSpeaking(false), 2500)
  }

  /* pass blob up */
  useEffect(() => {
    if (!blob || !stopped) return
    onAnswerCaptured?.(blob)
  }, [blob, stopped, onAnswerCaptured])

  /* auto-stop at duration */
  useEffect(() => {
    if (!started || interviewEnded) return
    if (timer.seconds < durationSeconds) return
    if (hasStoppedRef.current) return
    hasStoppedRef.current = true
    setInterviewEnded(true)
    stop()
  }, [durationSeconds, interviewEnded, started, stop, timer.seconds])

  /* speaking state */
  useEffect(() => {
    setSpeaking(recording && !aiSpeaking)
  }, [recording, aiSpeaking])

  function handleExit() {
    if (!hasStoppedRef.current && recording) {
      hasStoppedRef.current = true
      stop()
    }
    onExit?.()
  }

  return (
    <>
      {/* ── scoped styles ── */}
      <style>{CSS}</style>

      <div className="interview-shell">
        {/* ambient background glow */}
        <div className="ambient-glow" aria-hidden="true" />

        <AnimatePresence mode="wait">
          {!started ? (
            <ReadyScreen key="ready" config={config} onStart={startInterview} />
          ) : (
            <motion.div
              key="live"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="live-layout"
            >
              <TopBar
                role={config.role}
                progressLabel={progressLabel}
                onExit={handleExit}
              />

              <main className="live-main">
                <StatusLabel
                  aiSpeaking={aiSpeaking}
                  speaking={speaking}
                  interviewEnded={interviewEnded}
                />

                <MicOrb
                  active={speaking}
                  aiSpeaking={aiSpeaking}
                  onClick={recording ? stop : start}
                />

                <Waveform active={speaking} />

                {!!error && (
                  <p className="error-msg">
                    Microphone error — {String(error?.message ?? error)}
                  </p>
                )}
              </main>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

/* ─── scoped CSS ──────────────────────────────────────────────── */
const CSS = `
  /* tokens */
  .interview-shell {
    --bg:              #080808;
    --surface:         rgba(255,255,255,0.035);
    --border:          rgba(255,255,255,0.07);
    --accent:          #FACC15;
    --accent-dim:      rgba(250,204,21,0.18);
    --accent-glow:     rgba(250,204,21,0.28);
    --text-primary:    #F2F2F2;
    --text-secondary:  rgba(242,242,242,0.55);
    --text-muted:      rgba(242,242,242,0.3);
    --red:             #F87171;
    --red-glow:        rgba(248,113,113,0.6);
    --radius-sm:       8px;
    --radius-md:       14px;
    --radius-lg:       22px;
    --radius-full:     9999px;
    font-family: 'DM Sans', 'Inter', system-ui, sans-serif;
  }

  /* shell */
  .interview-shell {
    position: relative;
    min-height: 100svh;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: var(--text-primary);
  }

  /* subtle ambient glow */
  .ambient-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 60% 40% at 50% 50%, rgba(250,204,21,0.06) 0%, transparent 70%);
    pointer-events: none;
  }

  /* ── READY SCREEN ── */
  .ready-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 24px;
  }

  .ready-card {
    width: 100%;
    max-width: 420px;
    background: rgba(14,14,14,0.95);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 32px;
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.03),
      0 32px 80px rgba(0,0,0,0.7);
    backdrop-filter: blur(24px);
  }

  .ready-card__header h2 {
    font-size: 22px;
    font-weight: 650;
    letter-spacing: -0.3px;
    color: var(--text-primary);
    margin: 0;
  }

  .ready-card__header p {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--text-muted);
    letter-spacing: 0.02em;
  }

  .ready-card__list {
    list-style: none;
    padding: 0;
    margin: 28px 0 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .ready-card__row {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .ready-card__icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    background: var(--accent-dim);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    flex-shrink: 0;
  }

  .ready-card__item-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin: 0;
  }

  .ready-card__item-sub {
    font-size: 12px;
    color: var(--text-muted);
    margin: 2px 0 0;
  }

  /* ── LIVE LAYOUT ── */
  .live-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 560px;
    padding: 20px 20px 48px;
    gap: 0;
  }

  /* ── TOP BAR ── */
  .top-bar {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: rgba(10,10,10,0.72);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .top-bar-section {
    display: flex;
    align-items: center;
    gap: 7px;
    flex: 1;
  }

  .top-bar-left  { justify-content: flex-start; }
  .top-bar-center{ justify-content: center; flex: 2; }
  .top-bar-right { justify-content: flex-end; gap: 10px; }

  /* live dot */
  .live-dot {
    width: 7px;
    height: 7px;
    border-radius: var(--radius-full);
    background: var(--red);
    box-shadow: 0 0 8px var(--red-glow);
    animation: blink 2.2s ease-in-out infinite;
    flex-shrink: 0;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.35; }
  }

  .live-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .top-bar-role {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    letter-spacing: 0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .top-bar-timer {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: var(--text-secondary);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  /* exit button */
  .exit-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
    font-family: inherit;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s, background 0.2s;
    white-space: nowrap;
  }

  .exit-btn:hover {
    color: var(--text-primary);
    border-color: rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.04);
  }

  /* ── MAIN CENTER ── */
  .live-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 40px;
    padding-top: 56px;
  }

  /* ── STATUS LABEL ── */
  .status-label {
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0.03em;
    margin: 0;
    transition: color 0.3s;
  }

  /* ── MIC ORB ── */
  .mic-orb {
    position: relative;
    display: grid;
    place-items: center;
    width: 96px;
    height: 96px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border);
    background: rgba(18,18,18,0.9);
    color: var(--text-secondary);
    cursor: pointer;
    outline: none;
    transition: color 0.25s, border-color 0.25s, transform 0.2s;
    box-shadow: 0 0 0 0 transparent, 0 8px 32px rgba(0,0,0,0.5);
  }

  .mic-orb:hover {
    color: var(--text-primary);
    border-color: rgba(255,255,255,0.14);
    transform: scale(1.03);
  }

  .mic-orb:active {
    transform: scale(0.97);
  }

  /* active (recording) state */
  .mic-orb--active {
    color: var(--accent);
    border-color: rgba(250,204,21,0.3);
    background: rgba(250,204,21,0.06);
    box-shadow:
      0 0 0 0 transparent,
      0 0 32px rgba(250,204,21,0.12),
      0 8px 32px rgba(0,0,0,0.5);
  }

  /* AI speaking state — slightly dimmed */
  .mic-orb--ai {
    opacity: 0.5;
    pointer-events: none;
  }

  /* pulse rings */
  .mic-ring {
    position: absolute;
    inset: 0;
    border-radius: var(--radius-full);
    border: 1px solid rgba(250,204,21,0.22);
    animation: mic-pulse 2.4s ease-out infinite;
    pointer-events: none;
  }

  .mic-ring--2 {
    animation-delay: 1.2s;
  }

  @keyframes mic-pulse {
    0%   { transform: scale(1);    opacity: 0.6; }
    100% { transform: scale(1.75); opacity: 0; }
  }

  .mic-core {
    display: grid;
    place-items: center;
  }

  /* ── WAVEFORM ── */
  .waveform {
    display: flex;
    align-items: center;
    gap: 3px;
    height: 32px;
  }

  .waveform-bar {
    display: block;
    width: 2px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.15);
    transition: background 0.3s;
  }

  .waveform-bar--active {
    background: var(--accent);
    animation: wave 1s ease-in-out infinite alternate;
  }

  @keyframes wave {
    from { transform: scaleY(1);   }
    to   { transform: scaleY(6); }
  }

  /* ── START BUTTON ── */
  .start-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 32px;
    padding: 12px 28px;
    background: var(--accent);
    color: #000;
    border: none;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    letter-spacing: 0.01em;
  }

  .start-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px var(--accent-glow);
  }

  .start-btn:active {
    transform: translateY(0);
  }

  /* ── ERROR ── */
  .error-msg {
    font-size: 12px;
    color: #F87171;
    background: rgba(248,113,113,0.08);
    border: 1px solid rgba(248,113,113,0.18);
    border-radius: var(--radius-sm);
    padding: 8px 14px;
    margin: 0;
    max-width: 340px;
    text-align: center;
  }
`
