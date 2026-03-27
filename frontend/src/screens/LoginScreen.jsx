import { motion } from 'framer-motion'
import { useState } from 'react'

export function LoginScreen({ onLogin, onSwitchToSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return

    onLogin({ email })
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

        <motion.div
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

        </motion.div>
      </div>
    </div>
  )
}