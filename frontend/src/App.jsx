<<<<<<< HEAD
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
=======
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
>>>>>>> 6ecc509856781abf570fb6e9afa65d9c95706909
