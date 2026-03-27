import { useCallback, useEffect, useRef, useState } from 'react'

export function useMediaRecorder() {
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  const [status, setStatus] = useState('idle') // idle | recording | stopped | error | unavailable
  const [error, setError] = useState(null)
  const [blob, setBlob] = useState(null)

  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stop?.()
      } catch {
        // ignore
      }
      streamRef.current?.getTracks?.().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setBlob(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable')
      setError(new Error('MediaRecorder unavailable in this browser.'))
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const b = new Blob(chunksRef.current, { type: 'audio/webm' })
        setBlob(b)
        setStatus('stopped')
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      recorder.start()
      setStatus('recording')
    } catch (e) {
      setStatus('error')
      setError(e)
    }
  }, [])

  const stop = useCallback(() => {
    const r = recorderRef.current
    if (!r) return
    if (r.state === 'inactive') return
    r.stop()
  }, [])

  return { status, error, blob, start, stop }
}

