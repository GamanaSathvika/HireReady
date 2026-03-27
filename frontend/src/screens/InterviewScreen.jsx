import { motion } from 'framer-motion'
import { useEffect, useMemo, useCallback, useState } from 'react'
import { MicButton } from '../components/MicButton'
import { ScreenShell } from '../components/ScreenShell'
import { Waveform } from '../components/Waveform'
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

export function InterviewScreen({ onAnswerCaptured, config = {}, aiPrompt = "" }) {
  const MotionDiv = motion.div

  const { status, error, blob, start, stop } = useMediaRecorder()
  const recording = status === 'recording'
  const stopped = status === 'stopped'

  const [timerActive, setTimerActive] = useState(false)
  const [aiSpeaking, setAiSpeaking] = useState(true)

  const timer = useTimer({ running: timerActive || recording })

  const durationSeconds = useMemo(
    () => parseDurationToSeconds(config.duration),
    [config.duration]
  )

  const durationLabel = useMemo(
    () => formatMMSS(durationSeconds),
    [durationSeconds]
  )

  const progressLabel = `${timer.mmss} / ${durationLabel}`
  // 🎤 MIC CLICK
  const onMicClick = useCallback(async () => {
    if (recording) {
      stop()
      return
    }

    setTimerActive(true)
    await start()
  }, [recording, start, stop])

  // 🎧 Speak current interviewer prompt at start of each turn
  useEffect(() => {
    if (!aiPrompt || !aiPrompt.trim()) {
      setAiSpeaking(false)
      return
    }

    setAiSpeaking(true)
    if (!('speechSynthesis' in window)) {
      const id = window.setTimeout(() => setAiSpeaking(false), 2500)
      return () => window.clearTimeout(id)
    }

    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(aiPrompt)
    utter.rate = 1.0
    utter.pitch = 1.0
    utter.onend = () => setAiSpeaking(false)
    utter.onerror = () => setAiSpeaking(false)
    window.speechSynthesis.speak(utter)

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [aiPrompt])

  // 🎤 after recording
  useEffect(() => {
    if (!blob || !stopped) return
    onAnswerCaptured?.(blob)
  }, [blob, stopped, onAnswerCaptured])

  useEffect(() => {
    if (recording) setTimerActive(true)
  }, [recording])

  return (
    <ScreenShell className="bg-[radial-gradient(circle_at_50%_2%,rgba(250,204,21,0.25),rgba(0,0,0,0.9)_40%)]">
      <MotionDiv
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto w-full max-w-5xl text-center"
      >

        {/* 🔥 TOP BAR */}
        <div className="interview-topbar">
          <div className="interview-topbar-left">
            {config.role ?? 'Frontend'}
          </div>

          <div className="interview-topbar-center">
            LIVE INTERVIEW
          </div>

          <div className="interview-topbar-right">
            {progressLabel}
          </div>
        </div>

        {/* 🎧 AI STATUS */}
        <div className="mt-16 text-center">
          {aiSpeaking && !recording && (
            <>
              <p className="text-xs tracking-widest uppercase text-white/40">
                AI SPEAKING
              </p>

              <div className="mt-6 text-white/70 animate-pulse">
                🎧 Asking question...
              </div>
            </>
          )}

          {!aiSpeaking && !recording && (
            <>
              <p className="text-xs tracking-widest uppercase text-white/40">
                YOUR TURN
              </p>

              <div className="mt-6 text-white/70">
                Tap mic to start answering
              </div>
            </>
          )}

          {recording && (
            <>
              <p className="text-xs tracking-widest uppercase text-red-400">
                RECORDING
              </p>

              <div className="mt-6 text-white/70">
                Speak clearly. Tap to stop.
              </div>
            </>
          )}
        </div>

        {/* 🎤 MIC */}
        <div className="interview-controls mt-10">

          <div className="mic-ring">
            <MicButton
              state={recording ? 'recording' : 'idle'}
              onClick={onMicClick}
            />

            <div className="mic-core-text">
              {recording ? 'Recording...' : 'Tap to speak'}
            </div>
          </div>

          {/* 🌊 WAVEFORM */}
          <Waveform active={recording} className="mt-8 w-full max-w-xl" />

          {/* ⚠️ ERROR */}
          {error && (
            <div className="mt-6 rounded-lg bg-red-500/10 ring-1 ring-red-500/30 px-4 py-3 text-sm text-red-200">
              Mic error: {String(error.message ?? error)}
            </div>
          )}

          {/* 🧩 CONFIG PILLS */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {[config.role, config.mode, config.strictness, config.difficulty]
              .filter(Boolean)
              .map((item, i) => (
                <span
                  key={i}
                  className="pill pill-active"
                >
                  {item}
                </span>
              ))}
          </div>

        </div>
      </MotionDiv>
    </ScreenShell>
  )
}