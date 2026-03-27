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

export async function postInterviewTurn({
  blob,
  history = [],
  role = '',
  experienceLevel = '',
  timerExpired = false,
  message = '',
}) {
  const fd = new FormData()
  if (blob) {
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
    fd.append('audio', blob, `recording.${ext}`)
  }
  fd.append('history', JSON.stringify(history))
  fd.append('role', role)
  fd.append('experienceLevel', experienceLevel)
  fd.append('timerExpired', String(Boolean(timerExpired)))
  fd.append('message', message)

  const res = await fetch(`${API_BASE}/interview`, { method: 'POST', body: fd })
  return parseJsonResponse(res)
}

export async function postFeedbackAudio(blob) {
  const fd = new FormData()
  const ext = blob?.type?.includes('mp4') ? 'mp4' : 'webm'
  if (blob) fd.append('audio', blob, `recording.${ext}`)
  const res = await fetch(`${API_BASE}/feedback`, { method: 'POST', body: fd })
  return parseJsonResponse(res)
}

