import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { OrganicVoiceOrb } from '../components/OrganicVoiceOrb'
import { ScreenShell } from '../components/ScreenShell'
import { useMediaRecorder } from '../hooks/useMediaRecorder'
import { useTimer } from '../hooks/useTimer'

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

export function InterviewScreen({ onAnswerCaptured, onExit, config = {} }) {
  const MotionDiv = motion.div

  const { status, error, blob, stream, start, stop } = useMediaRecorder()
  const recording = status === 'recording'
  const stopped = status === 'stopped'

  const [started, setStarted] = useState(false)
  const [interviewEnded, setInterviewEnded] = useState(false)
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const hasStoppedRef = useRef(false)

  const timer = useTimer({ running: started && !interviewEnded })

  const durationSeconds = useMemo(
    () => parseDurationToSeconds(config.duration),
    [config.duration]
  )

  const durationLabel = formatMMSS(durationSeconds)
  const progressLabel = `${timer.mmss} / ${durationLabel}`

  const startInterview = async () => {
    setStarted(true)
    setAiSpeaking(true)
    setInterviewEnded(false)
    hasStoppedRef.current = false
    await start()

    setTimeout(() => {
      setAiSpeaking(false)
    }, 2500)
  }

  useEffect(() => {
    if (!blob || !stopped) return
    onAnswerCaptured?.(blob)
  }, [blob, stopped, onAnswerCaptured])

  useEffect(() => {
    if (!started || interviewEnded) return
    if (timer.seconds < durationSeconds) return
    if (hasStoppedRef.current) return
    hasStoppedRef.current = true
    setInterviewEnded(true)
    stop()
  }, [durationSeconds, interviewEnded, started, stop, timer.seconds])

  useEffect(() => {
    if (!recording || aiSpeaking) {
      setSpeaking(false)
      return
    }
    setSpeaking(true)
  }, [aiSpeaking, recording])

  function handleExit() {
    if (!hasStoppedRef.current && recording) {
      hasStoppedRef.current = true
      stop()
    }
    onExit?.()
  }

  return (
    <ScreenShell className="min-h-screen flex items-center justify-center px-4 bg-[radial-gradient(circle_at_50%_40%,rgba(250,204,21,0.15),rgba(0,0,0,1)_60%)]">

      <MotionDiv
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg mx-auto"
      >

        {/* READY SCREEN */}
        {!started && (
          <div className="min-h-[100svh] w-full flex items-center justify-center">
            <div className="w-full flex flex-col items-center justify-center gap-6">
              <div className="ready-card">

                <div className="ready-header">
                  <h2>Get Ready</h2>
                  <p>Before we start your interview</p>
                </div>

                <div className="ready-list">

                  <div className="ready-row">
                    <div className="icon">🎤</div>
                    <div className="ready-text">
                      <p>Microphone is enabled</p>
                      <span>We’ll record your responses</span>
                    </div>
                  </div>

                  <div className="ready-row">
                    <div className="icon">🔇</div>
                    <div className="ready-text">
                      <p>Quiet environment</p>
                      <span>Avoid distractions</span>
                    </div>
                  </div>

                  <div className="ready-row">
                    <div className="icon">⚡</div>
                    <div className="ready-text">
                      <p>Be clear & concise</p>
                      <span>You can stop anytime</span>
                    </div>
                  </div>

                </div>

                <div className="flex justify-center">
                  <button className="start-btn" onClick={startInterview}>
                    Start Interview →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INTERVIEW SCREEN */}
        {started && (
          <div className="min-h-[100svh] w-full flex flex-col items-center justify-center">
            <div className="sticky top-4 z-30 w-full max-w-3xl">
              <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/35 px-5 py-3 shadow-[0_16px_46px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/72">
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-red-400/90 animate-pulse"
                    style={{ boxShadow: '0 0 10px rgba(248,113,113,0.85)' }}
                    aria-hidden="true"
                  />
                  <span>Live</span>
                </div>

                <div className="max-w-[45%] truncate text-xs tracking-[0.08em] text-white/45">
                  {config.role ?? 'Frontend Developer'}
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-white/92">{progressLabel}</span>
                  <button
                    onClick={handleExit}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-4 py-1.5 text-xs text-white/88 transition-all duration-200 hover:scale-105 hover:bg-white/14 active:scale-95"
                  >
                    <span aria-hidden="true">×</span>
                    <span>Exit</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-6 text-center">
              {aiSpeaking && (
                <div className="text-yellow-300/90 animate-pulse text-sm tracking-wide">
                  Asking question...
                </div>
              )}
              {!aiSpeaking && (
                <div className="text-white/55 text-sm">
                  {speaking ? 'Listening to your response...' : 'Listening...'}
                </div>
              )}

              <OrganicVoiceOrb
                stream={stream}
                active={started && !interviewEnded}
                className="h-[300px] w-[300px]"
              >
                <div className="relative z-10 grid place-items-center h-36 w-36 rounded-full bg-black/35 backdrop-blur-md">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
                      stroke={speaking ? '#FACC15' : '#E5E5E5'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M19 11a7 7 0 0 1-14 0"
                      stroke={speaking ? '#FACC15' : '#E5E5E5'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12 18v3"
                      stroke={speaking ? '#FACC15' : '#E5E5E5'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </OrganicVoiceOrb>

              {!!error && (
                <div className="text-red-300 text-sm">
                  Microphone access failed: {String(error?.message ?? error)}
                </div>
              )}
            </div>
          </div>
        )}

      </MotionDiv>
    </ScreenShell>
  )
}