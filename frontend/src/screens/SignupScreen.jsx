import { motion } from 'framer-motion'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { signupApi } from '../utils/api'

const MotionDiv = motion.div

export function SignupScreen({ onSignup, onSwitchToLogin }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name || !email || !password) return

    setLoading(true)
    try {
      const data = await signupApi(name, email, password)
      if (data.token) {
        localStorage.setItem('hireready_token', data.token)
        localStorage.setItem('hireready_user_name', data.user.name || '')
        onSignup({ name: data.user.name, email: data.user.email })
      }
    } catch (err) {
      toast.error(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      {/* LEFT SIDE - SAME STYLE */}
      <div className="login-left">
        <div className="quote-box">
          <h1>
            Start strong.<br />
            <span>Build your interview edge.</span>
          </h1>

          <p className="tagline">
            You’re one step away. Let’s begin.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
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
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="login-input"
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
            />

            <button type="submit" className="login-btn">
              Sign up
            </button>

          </form>

          {/* SWITCH BACK */}
          <p className="login-footer">
            Already have an account?{' '}
            <span onClick={onSwitchToLogin}>
              Login
            </span>
          </p>

        </MotionDiv>
      </div>
    </div>
  )
}