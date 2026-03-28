import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { InterviewFeedbackScreen } from './screens/InterviewFeedbackScreen'
import { InterviewScreen } from './screens/InterviewScreen'
import { LandingScreen } from './screens/LandingScreen'
import { LoginScreen } from './screens/LoginScreen'
import { SignupScreen } from './screens/SignupScreen'
import { getApiHealth } from './utils/api'

export default function App() {
  const [screen, setScreen] = useState('login')
  const [autoStartFromSignup, setAutoStartFromSignup] = useState(false)
  const [interviewConfig, setInterviewConfig] = useState(null)
  const [apiReady, setApiReady] = useState(true)
  const [groqKeyMissing, setGroqKeyMissing] = useState(false)
  const [interviewEndReport, setInterviewEndReport] = useState(null)
  const MotionDiv = motion.div

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

  // Re-check API when opening interview (first load may have run before the server was up).
  useEffect(() => {
    if (screen !== 'interview') return
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
  }, [screen])

  function reset() {
    setInterviewEndReport(null)
    setInterviewConfig(null)
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

          {/* LANDING — full viewport, no chrome */}
          {screen === 'landing' && (
            <div className="interview-landing-page flex min-h-[100svh] w-full flex-col text-[#e5e5e5]">
              <div className="mx-auto w-full max-w-[900px] flex-shrink-0 space-y-3 px-5 pt-6">
                {!apiReady && (
                  <div className="rounded-[10px] border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    API is unreachable. Start `brutal-feedback-api` and refresh.
                  </div>
                )}
                {apiReady && groqKeyMissing && (
                  <div className="rounded-[10px] border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
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
              </div>
              <div
                className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-5 pb-8"
                data-landing-scroll
              >
                <LandingScreen
                  onStart={(cfg) => {
                    setInterviewConfig(cfg ?? null)
                    navigate('interview')
                  }}
                />
              </div>
            </div>
          )}

          {/* INTERVIEW */}
          {screen === 'interview' && (
            <InterviewScreen
              interviewConfig={interviewConfig}
              apiUnreachable={!apiReady}
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

        </MotionDiv>
      </AnimatePresence>
    </div>
  )
}