const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3001').replace(/\/+$/, '')

async function parseJsonResponse(res) {
  const text = await res.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`)
  }
  if (!res.ok) {
    throw new Error(payload?.error || `Request failed (${res.status})`)
  }
  return payload
}

export async function getApiHealth() {
  const res = await fetch(`${API_BASE}/health`)
  return parseJsonResponse(res)
}

export async function loginApi(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  return parseJsonResponse(res)
}

export async function signupApi(name, email, password) {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  })
  return parseJsonResponse(res)
}

export async function initInterviewSession(role, experienceLevel, jobDescription = '') {
  const token = localStorage.getItem('hireready_token');
  const res = await fetch(`${API_BASE}/api/sessions/init`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ role, experienceLevel, jobDescription })
  })
  return parseJsonResponse(res)
}

export async function generateInterviewFeedback(sessionId) {
  const token = localStorage.getItem('hireready_token');
  const res = await fetch(`${API_BASE}/api/interview/generate-feedback`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ sessionId })
  })
  return parseJsonResponse(res)
}

export async function postFeedbackAudio(blob) {
  const fd = new FormData()
  const ext = blob?.type?.includes('mp4') ? 'mp4' : 'webm'
  if (blob) fd.append('audio', blob, `recording.${ext}`)
  const res = await fetch(`${API_BASE}/feedback`, { method: 'POST', body: fd })
  return parseJsonResponse(res)
}

export async function respondStreamApi(formData) {
  const res = await fetch(`${API_BASE}/api/interview/respond-stream`, {
    method: 'POST',
    body: formData
  })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res
}


