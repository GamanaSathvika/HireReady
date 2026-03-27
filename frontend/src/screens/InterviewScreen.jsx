import { motion } from 'framer-motion'
import { useEffect, useMemo, useCallback, useState } from 'react'
import { Card } from '../components/Card'
import { MicButton } from '../components/MicButton'
import { ScreenShell } from '../components/ScreenShell'
import { Waveform } from '../components/Waveform'
import { useMediaRecorder } from '../hooks/useMediaRecorder'
import { useTimer } from '../hooks/useTimer'
import { mockQuestion } from '../mocks/mockFeedback'

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

export function InterviewScreen({ onAnswerCaptured, config = {} }) {
  const MotionDiv = motion.div
  const { status, error, blob, start, stop } = useMediaRecorder()
  const recording = status === 'recording'
  const stopped = status === 'stopped'

  const [timerActive, setTimerActive] = useState(false)
  const timer = useTimer({ running: timerActive || recording })

  const durationSeconds = useMemo(() => parseDurationToSeconds(config.duration), [config.duration])
  const durationLabel = useMemo(() => formatMMSS(durationSeconds), [durationSeconds])
  const progressLabel = `${timer.mmss} / ${durationLabel}`

  const statusTag = `${config.difficulty ?? 'Medium'}  ${config.mode ?? 'Voice'}  ${config.strictness ?? 'Normal'}  ${config.duration ?? '10 min'}`

  const onMicClick = useCallback(async () => {
    if (recording) {
      stop()
      return
    }
    setTimerActive(true)
    await start()
  }, [recording, start, stop])

  useEffect(() => {
    if (!blob || !stopped) return
    onAnswerCaptured?.(blob)
  }, [blob, stopped, onAnswerCaptured])

  useEffect(() => {
    if (recording) setTimerActive(true)
  }, [recording])

  return (
    <ScreenShell className="bg-[radial-gradient(circle_at_50%_2%,rgba(250,204,21,0.25),rgba(0,0,0,0.85)_40%)]">
      <MotionDiv
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.9, 0.2, 1] }}
        className="mx-auto w-full max-w-5xl text-center"
      >
        <div className="interview-topbar">
          <div className="interview-topbar-left">STATUS  {statusTag}</div>
          <div className="interview-topbar-center">AI INTERVIEWER</div>
          <div className="interview-topbar-right">{progressLabel}</div>
        </div>

        <div className="interview-question">
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-white/50">Question</p>
          <p className="mt-2 text-lg sm:text-2xl font-semibold text-white/90">{mockQuestion}</p>
        </div>

        <div className="interview-controls">
          <div className="mic-ring">
            <MicButton state={recording ? 'recording' : 'idle'} onClick={onMicClick} />
            <div className="mic-core-text text-sm text-white/70">{recording ? 'Stop recording' : 'Click to start answering'}</div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setTimerActive((p) => !p)}
              className="min-w-[90px] rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90 hover:bg-white/15"
            >
              {timerActive ? 'Stop Timer' : 'Start Timer'}
            </button>
            <button
              type="button"
              onClick={() => timer.reset()}
              className="min-w-[90px] rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90 hover:bg-white/15"
            >
              Reset
            </button>
          </div>

          <Waveform active={recording} className="mt-6 w-full max-w-xl" />

          {error && (
            <div className="mt-6 rounded-lg bg-red-500/10 ring-1 ring-red-500/30 px-4 py-3 text-sm text-red-200">
              Microphone access failed: {String(error.message ?? error)}
            </div>
          )}

          <div className="prompt-card">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Prompt & Tip</p>
            <p className="mt-1 text-base text-white/90">
              Interview Tip: Keep it under 45 seconds. Recruiters dont owe you patience.
            </p>
          </div>
        </div>
      </MotionDiv>
    </ScreenShell>
  )
}
