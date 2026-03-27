import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { BrutalLayout } from './components/BrutalLayout'
import { FeedbackScreen } from './screens/FeedbackScreen'
import { InterviewFeedbackScreen } from './screens/InterviewFeedbackScreen'
import { InterviewScreen } from './screens/InterviewScreen'
import { LandingScreen } from './screens/LandingScreen'
import { ProcessingScreen } from './screens/ProcessingScreen'
import { LoginScreen } from './screens/LoginScreen'
import { SignupScreen } from './screens/SignupScreen'
import { getApiHealth, postInterviewTurn } from './utils/api'
import { formatDurationMMSS, parseDurationToSeconds } from './utils/duration'

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

function durationLabelFromConfig(duration) {
  const sec = parseDurationToSeconds(duration)
  return formatDurationMMSS(sec)
}

export default function App() {
  const [screen, setScreen] = useState('login')
  const [autoStartFromSignup, setAutoStartFromSignup] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [interviewConfig, setInterviewConfig] = useState(null)
  const [capturedBlob, setCapturedBlob] = useState(null)
  const [interviewHistory, setInterviewHistory] = useState([])
  const [apiReady, setApiReady] = useState(true)
  const [groqKeyMissing, setGroqKeyMissing] = useState(false)
  const [interviewEndReport, setInterviewEndReport] = useState(null)
  const [aiPrompt, setAiPrompt] = useState(
    "Hello! Welcome to your mock interview. Please introduce yourself, then walk me through your projects."
  )

  const MotionDiv = motion.div
  const countdownLabel = durationLabelFromConfig(interviewConfig?.duration)

  // 🔥 NAVIGATION
  function navigate(nextScreen) {
    window.history.pushState({ screen: nextScreen }, '', '')
    setScreen(nextScreen)
  }

  const onInterviewIframeComplete = useCallback(
    (payload) => {
      if (!payload) return
      setInterviewEndReport({
        feedbackText: payload.feedbackText ?? '',
        transcript: payload.transcript ?? '',
        history: payload.history ?? [],
        session: payload.session ?? {},
      })
      window.history.pushState({ screen: 'interview-feedback' }, '', '')
      setScreen('interview-feedback')
    },
    [],
  )

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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const health = await getApiHealth()
        if (!cancelled) {
          setApiReady(true)
          setGroqKeyMissing(health?.groqConfigured === false)
        }
      } catch {
        if (!cancelled) {
          setApiReady(false)
          setGroqKeyMissing(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (screen !== 'landing' || !autoStartFromSignup) return
    const t = window.setTimeout(() => {
      navigate('interview')
      setAutoStartFromSignup(false)
    }, 300)
    return () => window.clearTimeout(t)
  }, [screen, autoStartFromSignup])

  // 🔥 PROCESSING FLOW
  useEffect(() => {
    if (screen !== 'processing' || !capturedBlob) return
    let cancelled = false

    ;(async () => {
      try {
        const payload = await postInterviewTurn({
          blob: capturedBlob,
          history: interviewHistory,
          role: interviewConfig?.role ?? '',
          experienceLevel: interviewConfig?.experienceLevel ?? '',
          timerExpired: false,
          message: '',
        })
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
  }, [screen, capturedBlob, interviewHistory, interviewConfig])

  function reset() {
    setFeedback(null)
    setInterviewEndReport(null)
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
              onLogin={() => {
                setAutoStartFromSignup(false)
                navigate('landing')
              }}
              onSwitchToSignup={() => navigate('signup')} // ✅ FIXED
            />
          )}

          {/* SIGNUP ✅ NEW */}
          {screen === 'signup' && (
            <SignupScreen
              onSignup={() => {
                setAutoStartFromSignup(true)
                navigate('landing')
              }}
              onSwitchToLogin={() => navigate('login')} // ✅ FIXED
            />
          )}

          {/* LANDING */}
          {screen === 'landing' && (
            <BrutalLayout countdown={countdownLabel}>
              {!apiReady && (
                <div className="mb-3 rounded-[10px] border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  API is unreachable. Start `brutal-feedback-api` and refresh.
                </div>
              )}
              {apiReady && groqKeyMissing && (
                <div className="mb-3 rounded-[10px] border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  Voice and AI need <code className="rounded bg-black/30 px-1">GROQ_API_KEY</code>. Copy{' '}
                  <code className="rounded bg-black/30 px-1">.env.example</code> to{' '}
                  <code className="rounded bg-black/30 px-1">.env</code> in the project root or{' '}
                  <code className="rounded bg-black/30 px-1">brutal-feedback-api/</code>, add your key from{' '}
                  <a
                    href="https://console.groq.com/keys"
                    className="underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    console.groq.com/keys
                  </a>
                  , restart the API, then refresh.
                </div>
              )}
              <LandingScreen
                onStart={(cfg) => {
                  setInterviewConfig(cfg ?? null)
                  setInterviewHistory([])
                  setAiPrompt("Hello! Welcome to your mock interview. Please introduce yourself, then walk me through your projects.")
                  navigate('interview')
                }}
              />
            </BrutalLayout>
          )}

          {/* INTERVIEW */}
          {screen === 'interview' && (
            <InterviewScreen
              interviewConfig={interviewConfig}
              groqKeyMissing={groqKeyMissing}
              onExit={() => navigate('landing')}
              onInterviewComplete={onInterviewIframeComplete}
            />
          )}

          {screen === 'interview-feedback' && interviewEndReport && (
            <InterviewFeedbackScreen
              session={interviewEndReport.session}
              feedbackText={interviewEndReport.feedbackText}
              onBackHome={reset}
            />
          )}

          {/* PROCESSING */}
          {screen === 'processing' && (
            <BrutalLayout countdown={countdownLabel}>
              <ProcessingScreen />
            </BrutalLayout>
          )}

          {/* FEEDBACK */}
          {screen === 'feedback' && (
            <BrutalLayout countdown={countdownLabel}>
              <FeedbackScreen
                feedback={feedback}
                onTryAgain={reset}
              />
            </BrutalLayout>
          )}

        </MotionDiv>
      </AnimatePresence>
    </div>
  )
}