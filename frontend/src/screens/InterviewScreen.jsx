import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { Card } from '../components/Card'
import { MicButton } from '../components/MicButton'
import { ScreenShell } from '../components/ScreenShell'
import { Waveform } from '../components/Waveform'
import { useMediaRecorder } from '../hooks/useMediaRecorder'
import { useTimer } from '../hooks/useTimer'
import { mockQuestion } from '../mocks/mockFeedback'

export function InterviewScreen({ onAnswerCaptured, config }) {
  const MotionDiv = motion.div
  const { status, error, blob, start, stop } = useMediaRecorder()
  const recording = status === 'recording'
  const stopped = status === 'stopped'

  const timer = useTimer({ running: recording })

  async function onMicClick() {
    if (recording) {
      stop()
      return
    }
    timer.reset()
    await start()
  }

  // When we have a blob, forward it (mock processing happens upstream).
  useEffect(() => {
    if (!blob || !stopped) return
    onAnswerCaptured?.(blob)
  }, [blob, stopped, onAnswerCaptured])

  return (
    <ScreenShell>
      <MotionDiv
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.2, 0.9, 0.2, 1] }}
        className="mx-auto w-full max-w-4xl"
      >
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold tracking-[0.22em] uppercase text-white/55">
            AI INTERVIEWER
          </div>
          <div className="tabular-nums text-sm text-white/65">{timer.mmss}</div>
        </div>
        {config && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/45">
            <span className="rounded-full bg-white/[0.03] ring-1 ring-white/10 px-3 py-1">
              {config.role}
            </span>
            <span className="rounded-full bg-white/[0.03] ring-1 ring-white/10 px-3 py-1">
              {config.difficulty}
            </span>
            <span className="rounded-full bg-white/[0.03] ring-1 ring-white/10 px-3 py-1">
              {config.focus}
            </span>
            <span className="rounded-full bg-white/[0.03] ring-1 ring-white/10 px-3 py-1">
              {config.mode}
            </span>
            <span className="rounded-full bg-white/[0.03] ring-1 ring-white/10 px-3 py-1">
              {config.strictness}
            </span>
            <span className="rounded-full bg-white/[0.03] ring-1 ring-white/10 px-3 py-1">
              {config.duration}
            </span>
          </div>
        )}

        <Card className="mt-6 p-6 sm:p-9">
          <div className="flex flex-col items-center text-center">
            <div className="text-white/60 text-sm">Question</div>
            <div className="mt-3 text-balance text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
              {mockQuestion}
            </div>

            <div className="mt-10 grid place-items-center">
              <MicButton state={recording ? 'recording' : 'idle'} onClick={onMicClick} />
              <div className="mt-5 h-6 text-sm">
                {!recording && !stopped && <span className="text-white/65">Click to start answering</span>}
                {recording && <span className="text-red-400 font-semibold">Recording...</span>}
                {stopped && <span className="text-white/65">Processing your answer...</span>}
              </div>
              <Waveform active={recording} className="mt-6" />
            </div>

            {error && (
              <div className="mt-8 w-full rounded-xl bg-red-500/10 ring-1 ring-red-500/25 px-4 py-3 text-sm text-red-200">
                Microphone access failed. {String(error.message ?? error)}
              </div>
            )}
          </div>
        </Card>

        <div className="mt-6 text-center text-xs text-white/40">
          Tip: keep it under 45 seconds. Recruiters don’t owe you patience.
        </div>
      </MotionDiv>
    </ScreenShell>
  )
}

