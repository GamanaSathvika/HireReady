import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef } from 'react'

const INIT_MESSAGE = 'hireready-interview-init'

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3001').replace(/\/+$/, '')

const MotionDiv = motion.div

export function InterviewScreen({
  onExit,
  onInterviewComplete,
  interviewConfig,
  apiUnreachable = false,
  groqKeyMissing = false,
}) {
  const iframeRef = useRef(null)
  const configRef = useRef(interviewConfig)

  useEffect(() => {
    configRef.current = interviewConfig
  }, [interviewConfig])

  const pushConfigToIframe = useCallback(() => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    win.postMessage(
      { type: INIT_MESSAGE, config: configRef.current ?? null, apiBase: API_BASE },
      window.location.origin,
    )
  }, [])

  useEffect(() => {
    function onMessage(event) {
      if (event.origin !== window.location.origin) return
      const data = event.data
      if (!data || data.type !== 'hireready-interview-complete') return
      onInterviewComplete?.(data.payload)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onInterviewComplete])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    function onLoad() {
      pushConfigToIframe()
    }
    iframe.addEventListener('load', onLoad)
    return () => iframe.removeEventListener('load', onLoad)
  }, [pushConfigToIframe])

  useEffect(() => {
    pushConfigToIframe()
  }, [interviewConfig, pushConfigToIframe])

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ minHeight: '100svh', background: '#000', display: 'flex', flexDirection: 'column' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          background: '#111',
          color: '#fff',
        }}
      >
        <strong style={{ fontSize: 14, letterSpacing: '0.02em' }}>Interview</strong>
        <button
          type="button"
          onClick={() => onExit?.()}
          style={{
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'transparent',
            color: '#fff',
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
          }}
        >
          Exit
        </button>
      </div>

      {apiUnreachable && (
        <div
          style={{
            padding: '10px 16px',
            fontSize: 13,
            lineHeight: 1.45,
            color: '#fecaca',
            background: 'rgba(127, 29, 29, 0.35)',
            borderBottom: '1px solid rgba(248, 113, 113, 0.35)',
          }}
        >
          Cannot reach the API at <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>{API_BASE}</code>.
          Start <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>npm start</code> in{' '}
          <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>brutal-feedback-api</code> or set{' '}
          <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>VITE_API_BASE</code> in{' '}
          <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>frontend/.env</code>, then refresh.
        </div>
      )}

      {!apiUnreachable && groqKeyMissing && (
        <div
          style={{
            padding: '10px 16px',
            fontSize: 13,
            lineHeight: 1.45,
            color: '#fde68a',
            background: 'rgba(180, 83, 9, 0.25)',
            borderBottom: '1px solid rgba(251, 191, 36, 0.35)',
          }}
        >
          Add <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>GROQ_API_KEY</code> to{' '}
          <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>.env</code> (see{' '}
          <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>.env.example</code>
          ), restart the API, refresh. Keys:{' '}
          <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: '#fde68a' }}>
            console.groq.com/keys
          </a>
        </div>
      )}

      <iframe
        ref={iframeRef}
        title="Brutal Feedback Interview"
        src={`${window.location.origin}/brutal-feedback-web/index.html`}
        allow="microphone; autoplay"
        style={{
          width: '100%',
          height:
            apiUnreachable || groqKeyMissing
              ? 'calc(100svh - 57px - 52px)'
              : 'calc(100svh - 57px)',
          border: 'none',
          background: '#0f0f0f',
        }}
      />
    </MotionDiv>
  )
}
