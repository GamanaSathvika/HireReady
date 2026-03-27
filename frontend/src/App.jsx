import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { FeedbackScreen } from './screens/FeedbackScreen'
import { InterviewScreen } from './screens/InterviewScreen'
import { LandingScreen } from './screens/LandingScreen'
import { ProcessingScreen } from './screens/ProcessingScreen'
import { LoginScreen } from './screens/LoginScreen'
import { SignupScreen } from './screens/SignupScreen'

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3001').replace(/\/+$/, '')

function parseScore(feedbackText, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`${escaped}\\s*[:=-]?\\s*(\\d{1,2})`, 'i')
  const match = String(feedbackText || '').match(re)
  const value = match ? Number(match[1]) : 0
  return Number.isFinite(value) ? Math.max(0, Math.min(10, value)) : 0
}

function normalizeFeedbackShape({ transcript, feedbackText }) {
  const lines = String(feedbackText || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  return {
    transcript: transcript || '',
    brutal: lines.slice(0, 4),
    tips: lines.slice(4, 7),
    scores: {
      Structure: parseScore(feedbackText, 'Structure'),
      Communication: parseScore(feedbackText, 'Communication'),
      Confidence: parseScore(feedbackText, 'Confidence'),
    },
  }
}

export default function App() {
  const [screen, setScreen] = useState('login')
  const [feedback, setFeedback] = useState(null)
  const [interviewConfig, setInterviewConfig] = useState(null)
  const [capturedBlob, setCapturedBlob] = useState(null)
  const [interviewHistory, setInterviewHistory] = useState([])
  const [aiPrompt, setAiPrompt] = useState(
    "Hello! Welcome to your mock interview. Please introduce yourself, then walk me through your projects."
  )

  const MotionDiv = motion.div

  // 🔥 NAVIGATION
  function navigate(nextScreen) {
    window.history.pushState({ screen: nextScreen }, '', '')
    setScreen(nextScreen)
  }

  // 🔥 BACK BUTTON
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state?.screen) {
        setScreen(event.state.screen)
      } else {
        setScreen('login')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // 🔥 INITIAL STATE
  useEffect(() => {
    window.history.replaceState({ screen: 'login' }, '')
  }, [])

  // 🔥 PROCESSING FLOW
  useEffect(() => {
    if (screen !== 'processing' || !capturedBlob) return
    let cancelled = false

    ;(async () => {
      try {
        const ext = capturedBlob.type.includes('mp4') ? 'mp4' : 'webm'
        const fd = new FormData()
        fd.append('audio', capturedBlob, `recording.${ext}`)
        fd.append('history', JSON.stringify(interviewHistory))

        const res = await fetch(`${API_BASE}/interview`, {
          method: 'POST',
          body: fd,
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload?.error || `Request failed (${res.status})`)
        if (cancelled) return

        const replyText = payload?.message || payload?.reply || ''
        const nextHistory = Array.isArray(payload?.history) ? payload.history : []
        setInterviewHistory(nextHistory)
        setAiPrompt(replyText)
        setCapturedBlob(null)

        if (payload?.interviewDone) {
          const transcript = nextHistory
            .filter((m) => m?.role === 'user')
            .map((m) => m.content)
            .join('\n\n')
          const feedbackText = replyText
          setFeedback(normalizeFeedbackShape({ transcript, feedbackText }))
          navigate('feedback')
          return
        }
        navigate('interview')
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Request failed.'
        setFeedback(
          normalizeFeedbackShape({
            transcript: '',
            feedbackText: `ERROR: ${message}`,
          })
        )
        navigate('feedback')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [screen, capturedBlob, interviewHistory])

  function reset() {
    setFeedback(null)
    setInterviewConfig(null)
    setCapturedBlob(null)
    setInterviewHistory([])
    setAiPrompt("Hello! Welcome to your mock interview. Please introduce yourself, then walk me through your projects.")
    navigate('landing')
  }

  return (
    <div className="min-h-[100svh]">
      <AnimatePresence mode="wait" initial={false}>
        <MotionDiv
          key={screen}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.2, 0.9, 0.2, 1] }}
        >

          {/* LOGIN */}
          {screen === 'login' && (
            <LoginScreen
              onLogin={() => navigate('landing')}
              onSwitchToSignup={() => navigate('signup')} // ✅ FIXED
            />
          )}

          {/* SIGNUP ✅ NEW */}
          {screen === 'signup' && (
            <SignupScreen
              onSignup={() => navigate('landing')}
              onSwitchToLogin={() => navigate('login')} // ✅ FIXED
            />
          )}

          {/* LANDING */}
          {screen === 'landing' && (
            <LandingScreen
              onStart={(cfg) => {
                setInterviewConfig(cfg ?? null)
                setInterviewHistory([])
                setAiPrompt("Hello! Welcome to your mock interview. Please introduce yourself, then walk me through your projects.")
                navigate('interview')
              }}
            />
          )}

          {/* INTERVIEW */}
          {screen === 'interview' && (
            <InterviewScreen
              config={interviewConfig}
              aiPrompt={aiPrompt}
              onAnswerCaptured={(blob) => {
                setCapturedBlob(blob ?? null)
                navigate('processing')
              }}
            />
          )}

          {/* PROCESSING */}
          {screen === 'processing' && <ProcessingScreen />}

          {/* FEEDBACK */}
          {screen === 'feedback' && (
            <FeedbackScreen
              feedback={feedback}
              onTryAgain={reset}
            />
          )}

        </MotionDiv>
      </AnimatePresence>
    </div>
  )
}