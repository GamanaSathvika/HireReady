import { motion } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3001').replace(/\/+$/, '')
const AI_REPLY_DELAY_MS = 2400
const SILENCE_AUTO_STOP_MS = 2500

const ROLE_GROUPS = [
  {
    label: 'Software & platform engineering',
    roles: [
      'Backend Developer', 'DevOps Engineer', 'Embedded Software Engineer',
      'Frontend Developer', 'Full Stack Developer', 'Mobile App Developer',
      'QA / Test Engineer', 'Security Engineer', 'Senior Software Engineer',
      'Site Reliability Engineer (SRE)', 'Software Engineer', 'Solutions Architect', 'Technical Lead',
    ],
  },
  {
    label: 'Data, AI & analytics',
    roles: ['BI Developer', 'Data Analyst', 'Data Engineer', 'Data Scientist', 'Machine Learning Engineer'],
  },
  {
    label: 'Product, project & delivery',
    roles: ['Business Analyst', 'Product Manager', 'Product Owner', 'Program Manager', 'Project Manager', 'Scrum Master'],
  },
  {
    label: 'Design & technical content',
    roles: ['Technical Writer', 'UI Designer', 'UX Designer', 'UX Researcher'],
  },
  {
    label: 'IT & infrastructure',
    roles: ['Cloud Engineer', 'IT Support Specialist', 'Network Engineer', 'Systems Administrator'],
  },
  {
    label: 'Sales, marketing & customer success',
    roles: [
      'Account Executive', 'Account Manager', 'Business Development Representative',
      'Customer Success Manager', 'Digital Marketing Specialist', 'Marketing Manager', 'Sales Representative',
    ],
  },
  { label: 'Finance & accounting', roles: ['Accountant', 'Auditor', 'Financial Analyst'] },
  { label: 'HR & recruiting', roles: ['HR Generalist', 'Recruiter / Talent Acquisition Specialist'] },
  {
    label: 'Healthcare & clinical support',
    roles: ['Clinical Research Associate', 'Medical Assistant', 'Registered Nurse (RN)'],
  },
  {
    label: 'Engineering (non-software) & operations',
    roles: ['Civil Engineer', 'Electrical Engineer', 'Management Trainee', 'Mechanical Engineer', 'Operations Manager', 'Supply Chain Analyst'],
  },
  { label: 'Legal & education', roles: ['Attorney / Lawyer', 'Paralegal', 'Teacher / Educator'] },
]

const FEEDBACK_HEADINGS = [
  'Overall Score (out of 10)', 'Communication', 'Structure',
  'Technical Depth', 'Confidence', 'Question-by-Question Breakdown', 'Top 3 Things to Fix',
]

const STATUS_MAP = {
  idle:      { label: 'Ready',        dot: 'dot dot-idle pulse' },
  listening: { label: 'Listening...', dot: 'dot dot-recording pulse' },
  thinking:  { label: 'Thinking...',  dot: 'dot dot-thinking pulse' },
  speaking:  { label: 'Speaking...',  dot: 'dot dot-speaking' },
  completed: { label: 'Completed',    dot: 'dot dot-speaking' },
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

function formatMMSS(total) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function escapeHtml(text) {
  return String(text || '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function pickMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const c of candidates) if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) return c
  return ''
}

function parseFeedbackSections(message) {
  const text = String(message || '').trim()
  if (!text) return []
  const lines = text.split(/\r?\n/)
  const sections = []
  let current = null
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const lookup = new Map(FEEDBACK_HEADINGS.map((h) => [normalize(h), h]))
  for (const line of lines) {
    const raw = line.trim()
    const headingCandidate = raw.replace(/^[-*]\s*/, '').replace(/:$/, '')
    const heading = lookup.get(normalize(headingCandidate))
    if (heading) {
      if (current) sections.push(current)
      current = { heading, body: [] }
      continue
    }
    if (!current) current = { heading: 'Feedback', body: [] }
    current.body.push(line)
  }
  if (current) sections.push(current)
  return sections.map((s) => ({ heading: s.heading, body: s.body.join('\n').trim() })).filter((s) => s.heading || s.body)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function FeedbackReport({ message }) {
  const sections = parseFeedbackSections(message)
  if (!sections.length) {
    return <pre className="mi-sectionBody" dangerouslySetInnerHTML={{ __html: escapeHtml(message || '') }} />
  }
  const parseScore = (value) => {
    const match = String(value || '').match(/(\d+(\.\d+)?)/)
    return match ? Number(match[1]) : null
  }
  return (
    <>
      {sections.map((section, idx) => {
        const title = section.heading || 'Feedback'
        const body = section.body || '(none)'
        const normalized = (section.heading || '').toLowerCase()

        if (normalized.includes('overall score')) {
          const score = parseScore(body)
          let color = '#44d17a'
          if (score !== null && score < 4) color = '#ff6b6b'
          if (score !== null && score >= 4 && score < 7) color = '#ffb547'
          return (
            <div key={idx} className="mi-scoreBlock" style={{ color }}>
              <div className="mi-sectionTitle">{title}</div>
              <div>{body}</div>
            </div>
          )
        }

        if (normalized.includes('top 3 things to fix')) {
          const points = body.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
          return (
            <div key={idx} className="mi-sectionBlock">
              <p className="mi-sectionTitle">{title}</p>
              {points.length > 0
                ? points.map((p, i) => <div key={i} className="mi-fixItem">⚠ {p.replace(/^[-*\d.)\s]+/, '')}</div>)
                : <pre className="mi-sectionBody">{body}</pre>
              }
            </div>
          )
        }

        if (normalized.includes('question-by-question breakdown')) {
          const points = body.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
          return (
            <div key={idx} className="mi-sectionBlock">
              <p className="mi-sectionTitle">{title}</p>
              <div className="mi-collapsible">
                {points.length > 0
                  ? points.map((p, i) => (
                      <details key={i}>
                        <summary>Question {i + 1}</summary>
                        <pre className="mi-sectionBody">{p.replace(/^[-*\d.)\s]+/, '')}</pre>
                      </details>
                    ))
                  : <pre className="mi-sectionBody">{body}</pre>
                }
              </div>
            </div>
          )
        }

        return (
          <div key={idx} className="mi-sectionBlock">
            <p className="mi-sectionTitle">{title}</p>
            <pre className="mi-sectionBody">{body}</pre>
          </div>
        )
      })}
    </>
  )
}

function InterviewerAvatar({ status, mouthOpen }) {
  return (
    <div className={`mi-interviewerAvatarWrap mi-state-${status}`} aria-hidden="true">
      <svg className="mi-interviewerAvatarSvg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mi-avFace" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#d4b896' }} />
            <stop offset="100%" style={{ stopColor: '#b89572' }} />
          </linearGradient>
          <linearGradient id="mi-avHair" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#3d3428' }} />
            <stop offset="100%" style={{ stopColor: '#1e1914' }} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="#121a28" />
        <path d="M32 82 Q50 70 68 82 L68 100 H32 Z" fill="#2a3548" />
        <path d="M32 82 Q50 74 68 82" fill="none" stroke="#4a5a72" strokeWidth="1" />
        <ellipse cx="50" cy="44" rx="24" ry="28" fill="url(#mi-avFace)" />
        <path d="M26 42 Q26 20 50 18 Q74 20 74 42 Q74 32 50 28 Q26 32 26 42 Z" fill="url(#mi-avHair)" />
        <ellipse cx="41" cy="42" rx="3.2" ry="2.2" fill="#1a1510" />
        <ellipse cx="59" cy="42" rx="3.2" ry="2.2" fill="#1a1510" />
        <ellipse cx="41.5" cy="41.2" rx="1" ry="0.7" fill="rgba(255,255,255,0.35)" />
        <ellipse cx="59.5" cy="41.2" rx="1" ry="0.7" fill="rgba(255,255,255,0.35)" />
        <g style={{ transform: mouthOpen ? 'translate(50px, 55.6px)' : 'translate(50px, 55px)', transition: 'transform 0.06s ease-out' }}>
          <path d="M -8 0 Q 0 3.6 8 0" fill="none" stroke="#6b5344" strokeWidth="1.85" strokeLinecap="round" opacity={mouthOpen ? 0 : 1} />
          <ellipse cx="0" cy="1.8" rx="5.8" ry="4.2" fill="#2a1814" stroke="#5a4034" strokeWidth="0.45" opacity={mouthOpen ? 1 : 0} />
          <ellipse cx="-2" cy="0.5" rx="2" ry="1.1" fill="rgba(255,255,255,0.12)" opacity={mouthOpen ? 0.72 : 0} />
        </g>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------
export function InterviewScreen({
  onExit,
  onInterviewComplete,
  interviewConfig,
  apiUnreachable = false,
  groqKeyMissing = false,
}) {
  // ── interview UI state ──────────────────────────────────────────────────
  const [status, setStatusState] = useState('idle')
  const [micStatus, setMicStatusState] = useState({ kind: 'checking', text: 'Checking microphone...' })
  const [error, setError] = useState('')
  const [selectedRole, setSelectedRole] = useState(interviewConfig?.role || '')
  const [experienceLevel, setExperienceLevel] = useState(interviewConfig?.experienceLevel || '')
  const [totalDurationSec, setTotalDurationSec] = useState(interviewConfig?.durationSec ?? 600)
  const [remainingSec, setRemainingSec] = useState(interviewConfig?.durationSec ?? 600)
  const remainingSecRef = useRef(remainingSec)
  const [history, setHistory] = useState([])
  const [latestTranscript, setLatestTranscript] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [showSetup, setShowSetup] = useState(true)
  const [showTimeBanner, setShowTimeBanner] = useState(false)
  const [showNewInterview, setShowNewInterview] = useState(false)
  const [showToggleBtn, setShowToggleBtn] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [captionsFinal, setCaptionsFinal] = useState('')
  const [captionsInterim, setCaptionsInterim] = useState('')
  const [showCaptions, setShowCaptions] = useState(false)
  const [mouthOpen, setMouthOpen] = useState(false)
  const [micChecked, setMicChecked] = useState(false)
  const [micBlocked, setMicBlocked] = useState(false)

  // ── mutable refs (not re-render safe to keep in state) ──────────────────
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const historyRef = useRef([])
  const loopActiveRef = useRef(false)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const silenceRafRef = useRef(0)
  const recordStartedAtRef = useRef(0)
  const belowSinceRef = useRef(0)
  const timerIdRef = useRef(0)
  const timerExpiredRef = useRef(false)
  const liveRecognitionRef = useRef(null)
  const captionsStoppingRef = useRef(false)
  const finalTranscriptRef = useRef('')
  const avatarMouthCloseTimerRef = useRef(0)
  const avatarTalkFallbackTimerRef = useRef(0)
  const avatarLastWordAtRef = useRef(0)
  const transcriptPanelRef = useRef(null)
  const captionsRef = useRef(null)
  const totalRef = useRef(totalDurationSec)
  const selectedRoleRef = useRef(selectedRole)
  const experienceLevelRef = useRef(experienceLevel)

  // keep role/level refs in sync for async callbacks
  useEffect(() => { selectedRoleRef.current = selectedRole }, [selectedRole])
  useEffect(() => { experienceLevelRef.current = experienceLevel }, [experienceLevel])
  useEffect(() => { totalRef.current = totalDurationSec }, [totalDurationSec])
  useEffect(() => {
    remainingSecRef.current = remainingSec
  }, [remainingSec])

  // sync interviewConfig prop → state (so parent can pre-fill fields)
  useEffect(() => {
    if (!interviewConfig) return
    if (interviewConfig.role) setSelectedRole(interviewConfig.role)
    if (interviewConfig.experienceLevel) setExperienceLevel(interviewConfig.experienceLevel)
    if (interviewConfig.durationSec) {
      setTotalDurationSec(interviewConfig.durationSec)
      setRemainingSec(interviewConfig.durationSec)
    }
  }, [interviewConfig])

  const setStatus = useCallback((s) => setStatusState(s), [])
  const setMicStatus = useCallback((kind, text) => setMicStatusState({ kind, text }), [])
  const showError = useCallback((msg) => setError(msg), [])
  const clearError = useCallback(() => setError(''), [])

  const buildInterviewCompletePayload = useCallback((newHistory, message, transcript = '') => {
    let candidateName = 'You'
    try {
      candidateName = sessionStorage.getItem('hireready_user_name') || 'You'
    } catch {
      /* ignore */
    }
    return {
      history: newHistory,
      feedback: message,
      feedbackText: message,
      transcript,
      session: {
        role: selectedRoleRef.current,
        experienceLevel: experienceLevelRef.current,
        configuredDurationSec: totalRef.current,
        elapsedSec: Math.max(0, totalRef.current - remainingSecRef.current),
        mode: 'Voice',
        candidateName,
        questionCount: newHistory.filter((m) => m.role === 'user').length,
      },
    }
  }, [])

  // ── avatar mouth ────────────────────────────────────────────────────────
  const scheduleAvatarMouthClose = useCallback((ms) => {
    if (avatarMouthCloseTimerRef.current) clearTimeout(avatarMouthCloseTimerRef.current)
    avatarMouthCloseTimerRef.current = window.setTimeout(() => {
      avatarMouthCloseTimerRef.current = 0
      setMouthOpen(false)
    }, ms)
  }, [])

  const pulseAvatarMouth = useCallback(() => {
    setMouthOpen(true)
    scheduleAvatarMouthClose(36 + Math.random() * 52)
  }, [scheduleAvatarMouthClose])

  const stopAvatarMouthSync = useCallback(() => {
    if (avatarMouthCloseTimerRef.current) { clearTimeout(avatarMouthCloseTimerRef.current); avatarMouthCloseTimerRef.current = 0 }
    if (avatarTalkFallbackTimerRef.current) { clearInterval(avatarTalkFallbackTimerRef.current); avatarTalkFallbackTimerRef.current = 0 }
    setMouthOpen(false)
  }, [])

  // ── countdown ───────────────────────────────────────────────────────────
  const stopCountdown = useCallback(() => {
    if (timerIdRef.current) window.clearInterval(timerIdRef.current)
    timerIdRef.current = 0
  }, [])

  const handleTimerExpired = useCallback(async () => {
    if (timerExpiredRef.current) return
    timerExpiredRef.current = true
    setRemainingSec(0)
    stopCountdown()
    loopActiveRef.current = false
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop() } catch {}
    }
    try {
      const fd = new FormData()
      fd.append('history', JSON.stringify(historyRef.current))
      fd.append('message', '[TIMER EXPIRED] The interview time limit has been reached. Generate the complete feedback report now.')
      fd.append('role', selectedRoleRef.current)
      fd.append('experienceLevel', experienceLevelRef.current)
      fd.append('timerExpired', 'true')
      setStatus('thinking')
      const res = await fetch(`${API_BASE}/interview`, { method: 'POST', body: fd })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error(`Non-JSON response: ${text.slice(0, 200)}`) }
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
      const newHistory = Array.isArray(data.history) ? data.history : historyRef.current
      historyRef.current = newHistory
      setHistory(newHistory)
      setLatestTranscript(data.transcript || '')
      const msg = data.message || data.reply || ''
      setFeedbackMessage(msg)
      setShowFeedback(true)
      setShowTimeBanner(true)
      setStatus('completed')
      setShowToggleBtn(false)
      setShowNewInterview(true)
      onInterviewComplete?.(buildInterviewCompletePayload(newHistory, msg, data.transcript || ''))
    } catch (e) {
      showError(e?.message || 'Timer finalize failed.')
      setStatus('idle')
    }
  }, [stopCountdown, setStatus, showError, onInterviewComplete, buildInterviewCompletePayload])

  const startCountdown = useCallback(() => {
    stopCountdown()
    timerIdRef.current = window.setInterval(() => {
      if (!loopActiveRef.current) return
      setRemainingSec((prev) => {
        const next = prev - 1
        if (next <= 0) handleTimerExpired()
        return next
      })
    }, 1000)
  }, [stopCountdown, handleTimerExpired])

  // ── silence monitor ─────────────────────────────────────────────────────
  const stopSilenceMonitor = useCallback(() => {
    if (silenceRafRef.current) cancelAnimationFrame(silenceRafRef.current)
    silenceRafRef.current = 0
    belowSinceRef.current = 0
  }, [])

  const ensureAnalyser = useCallback(() => {
    if (!streamRef.current) return
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume().catch(() => {})
    if (sourceNodeRef.current) { try { sourceNodeRef.current.disconnect() } catch {} }
    if (!analyserRef.current) {
      analyserRef.current = audioCtxRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      analyserRef.current.smoothingTimeConstant = 0.3
    }
    sourceNodeRef.current = audioCtxRef.current.createMediaStreamSource(streamRef.current)
    sourceNodeRef.current.connect(analyserRef.current)
  }, [])

  const startSilenceMonitor = useCallback(() => {
    stopSilenceMonitor()
    if (!analyserRef.current) return
    const data = new Uint8Array(analyserRef.current.fftSize)
    let minRms = Infinity, hadSpeech = false, rmsEma = null
    const emaAlpha = 0.2, baseThreshold = 0.01
    const tick = () => {
      if (!loopActiveRef.current) return
      silenceRafRef.current = requestAnimationFrame(tick)
      if (!recorderRef.current || recorderRef.current.state !== 'recording') return
      analyserRef.current.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v }
      const rms = Math.sqrt(sum / data.length)
      const now = performance.now()
      rmsEma = rmsEma === null ? rms : emaAlpha * rms + (1 - emaAlpha) * rmsEma
      if (!hadSpeech && rmsEma > 0 && rmsEma < minRms) minRms = rmsEma
      const threshold = Math.max(baseThreshold, Number.isFinite(minRms) ? minRms * 1.6 : baseThreshold)
      if (rmsEma < threshold) { if (hadSpeech && !belowSinceRef.current) belowSinceRef.current = now }
      else { hadSpeech = true; belowSinceRef.current = 0 }
      const elapsed = now - recordStartedAtRef.current
      if (elapsed >= 60000) { try { recorderRef.current.stop() } catch {}; return }
      if (belowSinceRef.current && hadSpeech && elapsed >= 800 && now - belowSinceRef.current >= SILENCE_AUTO_STOP_MS) {
        try { recorderRef.current.stop() } catch {}
      }
    }
    silenceRafRef.current = requestAnimationFrame(tick)
  }, [stopSilenceMonitor])

  // ── live captions ───────────────────────────────────────────────────────
  const stopLiveCaptions = useCallback(() => {
    captionsStoppingRef.current = true
    if (liveRecognitionRef.current) { try { liveRecognitionRef.current.stop() } catch {}; liveRecognitionRef.current = null }
    setShowCaptions(false); setCaptionsFinal(''); setCaptionsInterim('')
    finalTranscriptRef.current = ''
  }, [])

  const startLiveCaptions = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    finalTranscriptRef.current = ''
    setCaptionsFinal(''); setCaptionsInterim(''); setShowCaptions(true)
    captionsStoppingRef.current = false
    const recognition = new SR()
    liveRecognitionRef.current = recognition
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      if (captionsStoppingRef.current) return
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) finalTranscriptRef.current += t + ' '
        else interim += t
      }
      setCaptionsFinal(finalTranscriptRef.current); setCaptionsInterim(interim)
    }
    recognition.onerror = () => {}
    recognition.onend = () => {
      if (captionsStoppingRef.current) return
      if (loopActiveRef.current && recorderRef.current?.state === 'recording' && liveRecognitionRef.current === recognition) {
        try { recognition.start() } catch {}
      }
    }
    queueMicrotask(() => {
      if (liveRecognitionRef.current !== recognition || captionsStoppingRef.current) return
      try { recognition.start() } catch { liveRecognitionRef.current = null; setShowCaptions(false) }
    })
  }, [])

  // ── TTS ─────────────────────────────────────────────────────────────────
  const speak = useCallback((text) => new Promise((resolve, reject) => {
    clearError()
    if (!('speechSynthesis' in window)) { reject(new Error('Browser does not support speechSynthesis.')); return }
    if (!text?.trim()) { resolve(); return }
    stopAvatarMouthSync()
    setStatus('speaking')
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 0.98; utter.pitch = 1.02
    utter.onstart = () => {
      avatarLastWordAtRef.current = performance.now()
      pulseAvatarMouth()
      avatarTalkFallbackTimerRef.current = window.setInterval(() => {
        if (performance.now() - avatarLastWordAtRef.current > 140 && Math.random() < 0.42) {
          pulseAvatarMouth(); avatarLastWordAtRef.current = performance.now() - 60
        }
      }, 88)
    }
    utter.onboundary = (e) => {
      avatarLastWordAtRef.current = performance.now()
      const n = String(e?.name || '').toLowerCase()
      if (n === 'word' || n === 'sentence') pulseAvatarMouth()
    }
    utter.onend = () => { stopAvatarMouthSync(); resolve() }
    utter.onerror = (e) => { stopAvatarMouthSync(); reject(e?.error || new Error('TTS failed.')) }
    window.speechSynthesis.speak(utter)
  }), [clearError, stopAvatarMouthSync, setStatus, pulseAvatarMouth])

  // ── API call ─────────────────────────────────────────────────────────────
  const postInterview = useCallback(async (audioBlob) => {
    const fd = new FormData()
    if (audioBlob) {
      const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
      fd.append('audio', audioBlob, `recording.${ext}`)
    }
    fd.append('history', JSON.stringify(historyRef.current))
    fd.append('message', '')
    fd.append('role', selectedRoleRef.current)
    fd.append('experienceLevel', experienceLevelRef.current)
    fd.append('timerExpired', 'false')
    setStatus('thinking')
    const res = await fetch(`${API_BASE}/interview`, { method: 'POST', body: fd })
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { throw new Error(`Non-JSON response: ${text.slice(0, 200)}`) }
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
    return data
  }, [setStatus])

  // ── recording loop (ref-wrapped for safe recursion) ──────────────────────
  const startRecordingLoopRef = useRef(null)
  startRecordingLoopRef.current = async () => {
    clearError()
    if (!streamRef.current) return
    const mimeType = pickMimeType()
    if (!mimeType) { showError('No supported audio format found in this browser.'); return }
    chunksRef.current = []
    try { recorderRef.current = new MediaRecorder(streamRef.current, { mimeType }) }
    catch (e) { showError(e?.message || 'Failed to start recorder.'); return }

    recorderRef.current.ondataavailable = (ev) => { if (ev.data?.size > 0) chunksRef.current.push(ev.data) }
    recorderRef.current.onstop = async () => {
      stopLiveCaptions(); stopSilenceMonitor()
      const blob = new Blob(chunksRef.current, { type: recorderRef.current.mimeType || 'audio/webm' })
      if (!loopActiveRef.current) return
      try {
        const data = await postInterview(blob)
        const message = data.message || data.reply || ''
        const newHistory = Array.isArray(data.history) ? data.history : []
        historyRef.current = newHistory
        setHistory(newHistory); setLatestTranscript(data.transcript || '')

        if (data.interviewDone) {
          loopActiveRef.current = false
          stopCountdown(); stopAvatarMouthSync()
          if ('speechSynthesis' in window) window.speechSynthesis.cancel()
          setFeedbackMessage(message); setShowFeedback(true)
          setStatus('completed'); setShowToggleBtn(false); setShowNewInterview(true)
          onInterviewComplete?.(
            buildInterviewCompletePayload(newHistory, message, data.transcript || ''),
          )
          return
        }
        if (data.done) {
          loopActiveRef.current = false; stopCountdown()
          setStatus('idle'); setIsRecording(false)
          return
        }
        if (data.transcript && String(data.transcript).trim()) {
          await sleep(AI_REPLY_DELAY_MS)
          if (!loopActiveRef.current) return
          await speak(message)
        }
        if (!loopActiveRef.current) return
        await startRecordingLoopRef.current()
      } catch (e) {
        showError(e?.message || 'Request failed.')
        setStatus('idle')
      }
    }

    recordStartedAtRef.current = performance.now()
    ensureAnalyser(); recorderRef.current.start()
    setStatus('listening'); startLiveCaptions(); startSilenceMonitor()
  }

  // ── interview flow ───────────────────────────────────────────────────────
  const buildOpeningLine = useCallback(() => {
    const role = selectedRoleRef.current.trim() || 'this position'
    const level = experienceLevelRef.current.trim()
    const levelClause = level ? ` This session is calibrated for ${level} experience.` : ''
    return `Hello — I'm your interviewer for the ${role} role.${levelClause} When you're ready, introduce yourself and what draws you to this kind of work.`
  }, [])

  const greetAndStart = useCallback(async () => {
    loopActiveRef.current = true
    timerExpiredRef.current = false
    setShowFeedback(false); setFeedbackMessage('')
    await speak(buildOpeningLine())
    if (!loopActiveRef.current) return
    await startRecordingLoopRef.current()
  }, [speak, buildOpeningLine])

  const resetInterviewState = useCallback(async () => {
    loopActiveRef.current = false
    stopCountdown(); stopSilenceMonitor(); stopLiveCaptions(); stopAvatarMouthSync()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    if (recorderRef.current?.state !== 'inactive') { try { recorderRef.current.stop() } catch {} }
    historyRef.current = []
    setHistory([]); setLatestTranscript(''); setFeedbackMessage(''); setShowFeedback(false)
    setStatus('idle'); setRemainingSec(totalRef.current)
    setShowSetup(true); setShowTimeBanner(false); setShowNewInterview(false)
    setShowToggleBtn(true); setIsRecording(false); clearError()
  }, [stopCountdown, stopSilenceMonitor, stopLiveCaptions, stopAvatarMouthSync, setStatus, clearError])

  const handleToggle = useCallback(async () => {
    clearError()
    if (loopActiveRef.current) { await resetInterviewState(); return }
    try {
      historyRef.current = []
      setHistory([]); setLatestTranscript(''); setFeedbackMessage(''); setShowFeedback(false)
      setShowSetup(false); setShowNewInterview(false); setShowToggleBtn(true)
      setIsRecording(true); setRemainingSec(totalRef.current)
      startCountdown()
      await greetAndStart()
    } catch (e) {
      stopCountdown(); setIsRecording(false)
      showError(e?.message || 'Could not start interview.')
    }
  }, [clearError, resetInterviewState, startCountdown, greetAndStart, stopCountdown, showError])

  // ── mic check on mount ───────────────────────────────────────────────────
  useEffect(() => {
    setMicStatus('checking', 'Checking microphone...')
    ;(async () => {
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
        setMicChecked(true); setMicBlocked(false); setMicStatus('ready', 'Mic ready')
      } catch {
        setMicChecked(true); setMicBlocked(true)
        setMicStatus('blocked', 'Mic blocked — check browser settings')
      }
    })()
    return () => {
      stopLiveCaptions(); stopAvatarMouthSync()
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── scroll helpers ───────────────────────────────────────────────────────
  useEffect(() => {
    if (transcriptPanelRef.current) transcriptPanelRef.current.scrollTop = transcriptPanelRef.current.scrollHeight
  }, [history, latestTranscript])

  useEffect(() => {
    if (captionsRef.current) captionsRef.current.scrollTop = captionsRef.current.scrollHeight
  }, [captionsFinal, captionsInterim])

  // ── derived UI values ────────────────────────────────────────────────────
  const canStart = micChecked && !micBlocked && selectedRole && experienceLevel
  const toggleDisabled = !loopActiveRef.current && !canStart
  const toggleTitle = micBlocked
    ? 'Microphone blocked. Enable microphone in browser settings.'
    : !selectedRole || !experienceLevel ? 'Select a role and experience level to start.' : ''
  const statusInfo = STATUS_MAP[status] || STATUS_MAP.idle

  const transcriptLines = (() => {
    const rows = []
    for (const m of history) {
      if (m?.role === 'user') rows.push({ who: 'user', label: 'You', content: m.content || '' })
      if (m?.role === 'assistant') rows.push({ who: 'ai', label: 'Interviewer', content: m.content || '' })
    }
    if (!rows.length && latestTranscript) rows.push({ who: 'user', label: 'You', content: latestTranscript })
    return rows
  })()

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ minHeight: '100svh', background: '#000', display: 'flex', flexDirection: 'column' }}
    >
      {/* ── scoped styles ── */}
      <style>{`
        .mi-wrap { max-width: 720px; margin: 0 auto; padding: 24px; width: 100%; box-sizing: border-box; }
        .mi-topRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .mi-countdown { color: #9a9a9a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; }
        .mi-title { margin: 0; font-size: 20px; font-weight: 500; color: #f3f3f3; }
        .mi-subtitle { margin-top: 6px; color: #9a9a9a; font-size: 13px; }
        .mi-card { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 16px; }
        .mi-row { display: grid; grid-template-columns: 1fr; gap: 14px; }
        .mi-status { display: inline-flex; align-items: center; gap: 8px; color: #9a9a9a; font-size: 14px; }
        .mi-micStatus { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #9a9a9a; }
        .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .pulse { animation: mi-pulse 1.1s infinite ease-in-out; }
        .dot-idle { background: #8b8b8b; }
        .dot-recording { background: #ff6b6b; }
        .dot-thinking { background: #6aa1ff; }
        .dot-speaking { background: #44d17a; }
        @keyframes mi-pulse { 0% { opacity:.45;transform:scale(.9) } 50% { opacity:1;transform:scale(1.1) } 100% { opacity:.45;transform:scale(.9) } }
        .mi-toggleBtn { width: 100%; height: 52px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); color: #f3f3f3; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 200ms ease; }
        .mi-toggleBtn.idle { background: #2c2c2c; }
        .mi-toggleBtn.recording { background: #b93838; }
        .mi-error { color: #ffd0d5; background: rgba(255,94,108,0.12); border: 1px solid rgba(255,94,108,0.25); padding: 10px 12px; border-radius: 10px; font-size: 13px; }
        .mi-label { color: #9a9a9a; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; }
        .mi-transcriptPanel { margin-top: 10px; max-height: 340px; overflow: auto; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.45; }
        .mi-line { margin: 0 0 8px; white-space: pre-wrap; color: #f3f3f3; }
        .mi-who-user { color: #ffb547; }
        .mi-who-ai { color: #6aa1ff; }
        .mi-feedbackPanel { opacity: 0; transform: translateY(8px); max-height: 0; overflow: hidden; transition: opacity 260ms ease, transform 260ms ease, max-height 260ms ease; }
        .mi-feedbackPanel.show { opacity: 1; transform: translateY(0); max-height: 1800px; }
        .mi-scoreBlock { border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03); border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; text-align: center; font-size: 30px; font-weight: 700; }
        .mi-sectionBlock { border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
        .mi-sectionTitle { font-size: 12px; color: #9a9a9a; margin: 0 0 6px; }
        .mi-sectionBody { margin: 0; white-space: pre-wrap; word-break: break-word; line-height: 1.4; font-size: 12.5px; color: #f3f3f3; }
        .mi-fixItem { border: 1px solid rgba(255,107,107,0.5); background: rgba(255,107,107,0.1); border-radius: 10px; padding: 10px; margin-bottom: 8px; font-size: 13px; color: #f3f3f3; }
        .mi-collapsible details { border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; color: #f3f3f3; }
        .mi-field { display: grid; gap: 6px; }
        .mi-field input, .mi-field select { width: 100%; box-sizing: border-box; background: #121212; color: #f3f3f3; border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; padding: 11px 12px; font-size: 14px; font-family: inherit; }
        .mi-timeBanner { border: 1px solid rgba(255,181,71,0.45); color: #ffd69c; background: rgba(255,181,71,0.12); border-radius: 10px; padding: 10px 12px; font-size: 13px; }
        .mi-captions { margin-top: 16px; padding: 16px; background: #1a1a1a; border-radius: 8px; min-height: 80px; max-height: 160px; overflow-y: auto; font-size: 0.95rem; line-height: 1.6; }
        .mi-caption-interim { color: #666; font-style: italic; }
        .mi-caption-final { color: #f0f0f0; }
        .mi-interviewerStrip { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .mi-interviewerAvatarWrap { flex-shrink: 0; width: 88px; height: 88px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(145deg,rgba(106,161,255,0.18),rgba(26,34,53,0.95)); border: 2px solid rgba(106,161,255,0.35); box-shadow: 0 8px 28px rgba(0,0,0,0.45); transition: transform .35s ease,box-shadow .35s ease,border-color .35s ease,opacity .35s ease; }
        .mi-interviewerAvatarSvg { width: 76px; height: 76px; display: block; border-radius: 50%; }
        .mi-state-listening { opacity:.88; border-color:rgba(255,107,107,0.45)!important; box-shadow:0 0 0 3px rgba(255,107,107,0.12)!important; }
        .mi-state-thinking { animation: mi-avatarThinking 1.25s ease-in-out infinite; border-color:rgba(106,161,255,0.55)!important; }
        @keyframes mi-avatarThinking { 0%,100%{transform:scale(1);box-shadow:0 8px 28px rgba(0,0,0,0.45)} 50%{transform:scale(1.04);box-shadow:0 0 24px 6px rgba(106,161,255,0.22)} }
        .mi-state-speaking { animation: mi-avatarSpeaking 2.4s ease-in-out infinite; border-color:rgba(68,209,122,0.55)!important; }
        @keyframes mi-avatarSpeaking { 0%,100%{transform:scale(1);box-shadow:0 8px 28px rgba(0,0,0,0.45)} 50%{transform:scale(1.02);box-shadow:0 0 20px 6px rgba(68,209,122,0.22)} }
        .mi-state-completed { border-color:rgba(68,209,122,0.45)!important; opacity:1; animation:none; }
        .mi-interviewerBio { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .mi-interviewerBioName { font-size: 17px; font-weight: 600; color: #f3f3f3; letter-spacing: -0.02em; }
        .mi-interviewerBioTag { font-size: 13px; color: #9a9a9a; }
      `}</style>

      {/* ── header bar (from InterviewScreen) ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)',
        background: '#111', color: '#fff',
      }}>
        <strong style={{ fontSize: 14, letterSpacing: '0.02em' }}>Interview</strong>
        <button
          type="button"
          onClick={() => onExit?.()}
          style={{
            border: '1px solid rgba(255,255,255,0.25)', background: 'transparent',
            color: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
          }}
        >
          Exit
        </button>
      </div>

      {/* ── warning banners (from InterviewScreen) ── */}
      {apiUnreachable && (
        <div style={{ padding: '10px 16px', fontSize: 13, lineHeight: 1.45, color: '#fecaca', background: 'rgba(127,29,29,0.35)', borderBottom: '1px solid rgba(248,113,113,0.35)' }}>
          Cannot reach the API at <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>{API_BASE}</code>.
          Start <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>npm start</code> in{' '}
          <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>brutal-feedback-api</code> or set{' '}
          <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>VITE_API_BASE</code> in{' '}
          <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>frontend/.env</code>, then refresh.
        </div>
      )}

      {!apiUnreachable && groqKeyMissing && (
        <div style={{ padding: '10px 16px', fontSize: 13, lineHeight: 1.45, color: '#fde68a', background: 'rgba(180,83,9,0.25)', borderBottom: '1px solid rgba(251,191,36,0.35)' }}>
          Add <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>GROQ_API_KEY</code> to{' '}
          <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>.env</code> (see{' '}
          <code style={{ background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: 4 }}>.env.example</code>
          ), restart the API, refresh. Keys:{' '}
          <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: '#fde68a' }}>
            console.groq.com/keys
          </a>
        </div>
      )}

      {/* ── interview UI (replaces iframe) ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#0f0f0f' }}>
        <div className="mi-wrap">
          <div className="mi-topRow" style={{ marginBottom: 14 }}>
            <div>
              <h1 className="mi-title">Mock Interview</h1>
              <div className="mi-subtitle">Powered by AI — speak naturally</div>
            </div>
            <div className="mi-countdown">{formatMMSS(Math.max(0, remainingSec))}</div>
          </div>

          <div className="mi-card">
            <div className="mi-interviewerStrip">
              <InterviewerAvatar status={status} mouthOpen={mouthOpen} />
              <div className="mi-interviewerBio">
                <span className="mi-interviewerBioName">Jordan Lee</span>
                <span className="mi-interviewerBioTag">AI interviewer · listening and responding like a real panel</span>
              </div>
            </div>

            <div className="mi-row">
              <div className="mi-status">
                <span className={statusInfo.dot} />
                <span>{statusInfo.label}</span>
              </div>

              <div className="mi-micStatus">
                <span className={`dot ${micStatus.kind === 'ready' ? 'dot-speaking' : micStatus.kind === 'blocked' ? 'dot-recording' : 'dot-idle'}`} />
                <span>{micStatus.text}</span>
              </div>

              {showTimeBanner && <div className="mi-timeBanner">Time limit reached — here is your feedback</div>}

              {error && <div className="mi-error">{error}</div>}

              {showSetup && (
                <div>
                  <div className="mi-field">
                    <label className="mi-label" htmlFor="mi-roleInput">Role you are applying for</label>
                    <select id="mi-roleInput" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                      <option value="">Select role</option>
                      {ROLE_GROUPS.map((g) => (
                        <optgroup key={g.label} label={g.label}>
                          {g.roles.map((r) => <option key={r} value={r}>{r}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="mi-field" style={{ marginTop: 10 }}>
                    <label className="mi-label" htmlFor="mi-experienceLevel">Experience level</label>
                    <select id="mi-experienceLevel" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                      <option value="">Select experience level</option>
                      <option>Fresher</option>
                      <option>0-1 years</option>
                      <option>1-3 years</option>
                    </select>
                  </div>
                  <div className="mi-field" style={{ marginTop: 10 }}>
                    <label className="mi-label" htmlFor="mi-timerSelect">Session timer</label>
                    <select
                      id="mi-timerSelect"
                      value={totalDurationSec}
                      onChange={(e) => {
                        const val = Number(e.target.value || 600)
                        setTotalDurationSec(val); setRemainingSec(val)
                      }}
                    >
                      <option value="300">5 min</option>
                      <option value="600">10 min</option>
                      <option value="900">15 min</option>
                      <option value="1200">20 min</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="mi-card">
                <label className="mi-label">Transcript</label>
                <div className="mi-transcriptPanel" ref={transcriptPanelRef}>
                  {transcriptLines.length > 0
                    ? transcriptLines.map((r, i) => (
                        <p key={i} className="mi-line">
                          <span className={`mi-who-${r.who}`}>{r.label}:</span> {r.content}
                        </p>
                      ))
                    : <p className="mi-line">No transcript yet.</p>
                  }
                </div>
              </div>

              <div className={`mi-card mi-feedbackPanel${showFeedback ? ' show' : ''}`}>
                <label className="mi-label">Feedback</label>
                <div>{feedbackMessage && <FeedbackReport message={feedbackMessage} />}</div>
              </div>

              {showNewInterview && (
                <button className="mi-toggleBtn idle" onClick={resetInterviewState}>
                  Start New Interview
                </button>
              )}

              {showToggleBtn && (
                <button
                  className={`mi-toggleBtn ${isRecording ? 'recording' : 'idle'}`}
                  disabled={toggleDisabled}
                  title={toggleTitle}
                  onClick={handleToggle}
                >
                  {isRecording ? 'Stop Interview' : 'Start Interview'}
                </button>
              )}

              {showCaptions && (
                <div className="mi-captions" ref={captionsRef}>
                  <span className="mi-caption-final">{captionsFinal}</span>
                  <span className="mi-caption-interim">{captionsInterim}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
