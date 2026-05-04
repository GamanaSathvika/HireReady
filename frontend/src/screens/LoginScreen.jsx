import { motion } from 'framer-motion'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { loginApi } from '../utils/api'

const MotionDiv = motion.div

export function LoginScreen({ onLogin, onSwitchToSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    try {
      const data = await loginApi(email, password)
      if (data.token) {
        localStorage.setItem('hireready_token', data.token)
        localStorage.setItem('hireready_user_name', data.user.name || '')
        onLogin({ email })
      }
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      {/* LEFT SIDE - QUOTE */}
      <div className="login-left">
        <div className="quote-box">
          <h1>
            You’re not bad.<br />
            <span>Your interview skills are.</span>
          </h1>

          <p className="tagline">
            Let’s fix that. Let’s work it out.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div className="login-right">

        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="login-card"
        >

          {/* BRAND */}
          <div className="login-brand">
            <span className="brand-white">Hire</span>
            <span className="brand-yellow">Ready</span>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="login-form">

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              autoFocus
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
            />

            <button type="submit" className="login-btn">
              Login
            </button>

          </form>

          {/* SIGNUP SWITCH (FIXED 🔥) */}
          <p className="login-footer">
            New here?{' '}
            <span onClick={onSwitchToSignup}>
              Sign up
            </span>
          </p>

        </MotionDiv>
      </div>
    </div>
  )
}