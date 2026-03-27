import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef } from 'react'

const INIT_MESSAGE = 'hireready-interview-init'

export function InterviewScreen({ onExit, onInterviewComplete, interviewConfig, groqKeyMissing = false }) {
  const iframeRef = useRef(null)
  const configRef = useRef(interviewConfig)

  useEffect(() => {
    configRef.current = interviewConfig
  }, [interviewConfig])

  const pushConfigToIframe = useCallback(() => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    win.postMessage(
      { type: INIT_MESSAGE, config: configRef.current ?? null },
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
    <motion.div
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

      {groqKeyMissing && (
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
          height: groqKeyMissing ? 'calc(100svh - 57px - 52px)' : 'calc(100svh - 57px)',
          border: 'none',
          background: '#0f0f0f',
        }}
      />
    </motion.div>
  )
}
