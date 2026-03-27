import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { buildMockFeedback } from './mocks/mockFeedback'
import { FeedbackScreen } from './screens/FeedbackScreen'
import { InterviewScreen } from './screens/InterviewScreen'
import { LandingScreen } from './screens/LandingScreen'
import { ProcessingScreen } from './screens/ProcessingScreen'
import { LoginScreen } from './screens/LoginScreen'
import { SignupScreen } from './screens/SignupScreen'

export default function App() {
  const [screen, setScreen] = useState('login')
  const [feedback, setFeedback] = useState(null)
  const [interviewConfig, setInterviewConfig] = useState(null)

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
    if (screen !== 'processing') return

    const id = window.setTimeout(() => {
      setFeedback(buildMockFeedback())
      navigate('feedback')
    }, 2000)

    return () => window.clearTimeout(id)
  }, [screen])

  function reset() {
    setFeedback(null)
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
                navigate('interview')
              }}
            />
          )}

          {/* INTERVIEW */}
          {screen === 'interview' && (
            <InterviewScreen
              config={interviewConfig}
              onAnswerCaptured={() => {
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
