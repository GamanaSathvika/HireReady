import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { buildMockFeedback } from './mocks/mockFeedback'
import { FeedbackScreen } from './screens/FeedbackScreen'
import { InterviewScreen } from './screens/InterviewScreen'
import { LandingScreen } from './screens/LandingScreen'
import { ProcessingScreen } from './screens/ProcessingScreen'

const screens = {
  landing: LandingScreen,
  interview: InterviewScreen,
  processing: ProcessingScreen,
  feedback: FeedbackScreen,
}

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [feedback, setFeedback] = useState(null)
  const [interviewConfig, setInterviewConfig] = useState(null)

  const MotionDiv = motion.div
  const Screen = useMemo(() => screens[screen] ?? LandingScreen, [screen])

  // 🔥 NAVIGATION FUNCTION (push to browser history)
  function navigate(nextScreen) {
    window.history.pushState({ screen: nextScreen }, '', '')
    setScreen(nextScreen)
  }

  // 🔥 HANDLE BROWSER BACK BUTTON
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state?.screen) {
        setScreen(event.state.screen)
      } else {
        setScreen('landing')
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // 🔥 INITIAL STATE SYNC
  useEffect(() => {
    window.history.replaceState({ screen: 'landing' }, '')
  }, [])

  // 🔥 PROCESSING → FEEDBACK FLOW
  useEffect(() => {
    if (screen !== 'processing') return

    const id = window.setTimeout(() => {
      setFeedback(buildMockFeedback())
      navigate('feedback') // 🔥 IMPORTANT: use navigate
    }, 2000)

    return () => window.clearTimeout(id)
  }, [screen])

  function reset() {
    setFeedback(null)
    setInterviewConfig(null)
    navigate('landing') // 🔥 IMPORTANT
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

          {/* LANDING */}
          {screen === 'landing' && (
            <LandingScreen
              onStart={(cfg) => {
                setInterviewConfig(cfg ?? null)
                navigate('interview') // 🔥 FIXED
              }}
            />
          )}

          {/* INTERVIEW */}
          {screen === 'interview' && (
            <InterviewScreen
              config={interviewConfig}
              onAnswerCaptured={() => {
                navigate('processing') // 🔥 FIXED
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