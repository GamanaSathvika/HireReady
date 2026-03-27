import { useEffect, useRef } from 'react'

export function useInterval(callback, delay) {
  const cbRef = useRef(callback)

  useEffect(() => {
    cbRef.current = callback
  }, [callback])

  useEffect(() => {
    if (delay == null) return
    const id = window.setInterval(() => cbRef.current(), delay)
    return () => window.clearInterval(id)
  }, [delay])
}

