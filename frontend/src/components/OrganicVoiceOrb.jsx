import { useEffect, useRef } from 'react'
import { cn } from '../lib/cn'

const TAU = Math.PI * 2

function lerp(current, target, alpha) {
  return current + (target - current) * alpha
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1))
  return t * t * (3 - 2 * t)
}

function drawFluidLayer({
  ctx,
  cx,
  cy,
  baseRadius,
  amplitude,
  chaos,
  phase,
  colorA,
  colorB,
  alpha,
  pointCount,
}) {
  const points = []
  for (let i = 0; i < pointCount; i += 1) {
    const t = i / pointCount
    const angle = t * TAU
    const wobble1 = Math.sin(angle * 2.3 + phase * 0.65) * amplitude
    const wobble2 = Math.sin(angle * 5.8 - phase * 1.3) * amplitude * 0.52
    const jitter = Math.sin(angle * 11.5 + phase * 2.1 + i * 0.4) * chaos
    const radius = baseRadius + wobble1 + wobble2 + jitter
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    })
  }

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    const mx = (current.x + next.x) * 0.5
    const my = (current.y + next.y) * 0.5
    ctx.quadraticCurveTo(current.x, current.y, mx, my)
  }
  ctx.closePath()

  const gradient = ctx.createRadialGradient(cx, cy, baseRadius * 0.2, cx, cy, baseRadius * 1.45)
  gradient.addColorStop(0, colorA)
  gradient.addColorStop(1, colorB)
  ctx.fillStyle = gradient
  ctx.shadowColor = colorA
  ctx.shadowBlur = baseRadius * 0.4
  ctx.fill()
  ctx.restore()
}

export function OrganicVoiceOrb({ stream, active = false, className, children }) {
  const canvasRef = useRef(null)
  const animationRef = useRef(0)
  const analyserRef = useRef(null)
  const audioCtxRef = useRef(null)
  const sourceRef = useRef(null)
  const freqRef = useRef(null)
  const smoothEnergyRef = useRef(0)
  const phaseRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const size = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(size.width * dpr))
      canvas.height = Math.max(1, Math.floor(size.height * dpr))
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    if (!stream) {
      analyserRef.current = null
      freqRef.current = null
      sourceRef.current?.disconnect?.()
      sourceRef.current = null
      audioCtxRef.current?.close?.().catch(() => {})
      audioCtxRef.current = null
      return undefined
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return undefined

    const audioCtx = new AudioCtx()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8

    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    audioCtxRef.current = audioCtx
    analyserRef.current = analyser
    sourceRef.current = source
    freqRef.current = new Uint8Array(analyser.frequencyBinCount)

    return () => {
      source.disconnect()
      analyser.disconnect()
      analyserRef.current = null
      freqRef.current = null
      audioCtx.close().catch(() => {})
      audioCtxRef.current = null
      sourceRef.current = null
    }
  }, [stream])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const render = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const cx = width / 2
      const cy = height / 2

      const analyser = analyserRef.current
      const freq = freqRef.current
      let instantEnergy = 0

      if (analyser && freq) {
        analyser.getByteFrequencyData(freq)
        let sum = 0
        for (let i = 0; i < freq.length; i += 1) sum += freq[i]
        instantEnergy = (sum / freq.length) / 255
      }

      const voiceBoost = smoothstep(0.06, 0.42, instantEnergy)
      const breathing = (Math.sin(performance.now() * 0.0017) + 1) * 0.5
      const targetEnergy = Math.max(voiceBoost, breathing * 0.18 + (active ? 0.06 : 0.04))
      smoothEnergyRef.current = lerp(smoothEnergyRef.current, targetEnergy, 0.12)
      const energy = smoothEnergyRef.current

      phaseRef.current += 0.009 + energy * 0.04
      const phase = phaseRef.current

      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'source-over'

      const maxRadius = Math.min(width, height) * 0.44
      const coreRadius = maxRadius * (0.44 + energy * 0.1)
      const amp = maxRadius * (0.035 + energy * 0.07)
      const chaos = maxRadius * (0.01 + energy * 0.03)

      const halo = ctx.createRadialGradient(cx, cy, coreRadius * 0.2, cx, cy, maxRadius * 1.5)
      halo.addColorStop(0, `rgba(250,204,21,${0.15 + energy * 0.26})`)
      halo.addColorStop(0.45, `rgba(255,214,88,${0.08 + energy * 0.17})`)
      halo.addColorStop(1, 'rgba(250,204,21,0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(cx, cy, maxRadius * 1.5, 0, TAU)
      ctx.fill()

      drawFluidLayer({
        ctx,
        cx,
        cy,
        baseRadius: coreRadius * 1.38,
        amplitude: amp * 1.35,
        chaos: chaos * 1.25,
        phase: phase + 0.9,
        colorA: 'rgba(255, 220, 120, 0.52)',
        colorB: 'rgba(250, 204, 21, 0.03)',
        alpha: 0.44 + energy * 0.24,
        pointCount: 56,
      })

      drawFluidLayer({
        ctx,
        cx,
        cy,
        baseRadius: coreRadius * 1.06,
        amplitude: amp,
        chaos: chaos,
        phase,
        colorA: 'rgba(255, 214, 110, 0.58)',
        colorB: 'rgba(250, 204, 21, 0.06)',
        alpha: 0.58 + energy * 0.22,
        pointCount: 52,
      })

      drawFluidLayer({
        ctx,
        cx,
        cy,
        baseRadius: coreRadius * 0.78,
        amplitude: amp * 0.72,
        chaos: chaos * 0.65,
        phase: phase - 0.7,
        colorA: 'rgba(255, 229, 164, 0.72)',
        colorB: 'rgba(255, 214, 102, 0.15)',
        alpha: 0.7 + energy * 0.18,
        pointCount: 44,
      })

      animationRef.current = window.requestAnimationFrame(render)
    }

    animationRef.current = window.requestAnimationFrame(render)
    return () => window.cancelAnimationFrame(animationRef.current)
  }, [active])

  return (
    <div className={cn('organic-orb', className)}>
      <canvas ref={canvasRef} className="organic-orb-canvas" aria-hidden="true" />
      <div className="organic-orb-center">{children}</div>
    </div>
  )
}
