import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [audioLevel, setAudioLevel] = useState(0)
  const rafRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
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
    if (!started || !stream) return

    const audioCtx = new window.AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.82

    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    audioCtxRef.current = audioCtx
    analyserRef.current = analyser
    dataArrayRef.current = dataArray

    const tick = () => {
      analyser.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i += 1) sum += dataArray[i]
      const avg = sum / dataArray.length
      const normalized = Math.min(1, avg / 95)
      setAudioLevel((prev) => prev * 0.75 + normalized * 0.25)
      rafRef.current = window.requestAnimationFrame(tick)
    }

    rafRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      analyserRef.current = null
      dataArrayRef.current = null
      audioCtx.close()
    }
  }, [started, stream])

  useEffect(() => {
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
      audioCtxRef.current?.close?.()
    }
  }, [])

  function handleExit() {
    if (!hasStoppedRef.current && recording) {
      hasStoppedRef.current = true
      stop()
    }
    onExit?.()
  }

  const speaking = audioLevel > 0.18 && !aiSpeaking
  const ringScale = 1 + audioLevel * 0.28
  const ringOpacity = aiSpeaking ? 0.5 : 0.22 + audioLevel * 0.5

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
            <div className="w-full max-w-3xl">
              <div className="interview-topbar mb-8 bg-black/35 border-white/15 backdrop-blur-xl">
              <div>{config.role ?? 'Frontend Developer'}</div>
              <div className="text-red-300">LIVE</div>
              <div className="flex items-center gap-3">
                <span>{progressLabel}</span>
                <button onClick={handleExit} className="exit-btn">Exit</button>
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

              <div className="relative h-[300px] w-[300px] grid place-items-center">
                {[0, 1, 2].map((i) => {
                  const baseScale = 1 + i * 0.18
                  const extra = aiSpeaking ? 0.18 : audioLevel * 0.42
                  const duration = aiSpeaking ? 1.8 : speaking ? 0.7 : 2.8
                  const color = aiSpeaking ? 'rgba(59,130,246,0.34)' : 'rgba(250,204,21,0.34)'
                  return (
                    <span
                      key={i}
                      className="absolute rounded-full border border-white/10"
                      style={{
                        width: `${170 + i * 38}px`,
                        height: `${170 + i * 38}px`,
                        transform: `scale(${baseScale + extra})`,
                        opacity: ringOpacity - i * 0.07,
                        boxShadow: `0 0 ${34 + i * 8}px ${color}`,
                        transition: `transform ${duration}s cubic-bezier(0.2,0.9,0.2,1), opacity 0.28s ease`,
                      }}
                    />
                  )
                })}

                <div
                  className="relative z-10 grid place-items-center h-36 w-36 rounded-full border border-white/15 bg-black/60 backdrop-blur-md"
                  style={{
                    transform: `scale(${ringScale})`,
                    boxShadow: aiSpeaking
                      ? '0 0 48px rgba(59,130,246,0.45), inset 0 0 20px rgba(255,255,255,0.08)'
                      : speaking
                        ? '0 0 54px rgba(250,204,21,0.45), inset 0 0 20px rgba(255,255,255,0.08)'
                        : '0 0 34px rgba(250,204,21,0.20), inset 0 0 16px rgba(255,255,255,0.06)',
                    transition: 'transform 120ms linear, box-shadow 260ms ease',
                  }}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
                      stroke={aiSpeaking ? '#93c5fd' : speaking ? '#FACC15' : '#E5E5E5'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M19 11a7 7 0 0 1-14 0"
                      stroke={aiSpeaking ? '#93c5fd' : speaking ? '#FACC15' : '#E5E5E5'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12 18v3"
                      stroke={aiSpeaking ? '#93c5fd' : speaking ? '#FACC15' : '#E5E5E5'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

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