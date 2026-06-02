import { useEffect, useRef } from 'react'

const GLYPHS = ['>', 'o', '-']
const COLORS = ['rgba(155,187,215,0.58)', 'rgba(79,210,139,0.5)', 'rgba(214,168,77,0.42)']
const MAX_PARTICLES = 72
const MIN_DISTANCE = 12
const LIFETIME = 620

export default function CursorTrailCanvas() {
  const canvasRef = useRef(null)
  const glyphIndex = useRef(0)
  const lastPoint = useRef(null)
  const particles = useRef([])
  const rafId = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext?.('2d')
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!ctx || reduceMotion) return undefined

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function addParticle(event) {
      const point = { x: event.clientX, y: event.clientY, time: performance.now() }
      const previous = lastPoint.current

      if (previous) {
        const dx = point.x - previous.x
        const dy = point.y - previous.y
        const distance = Math.hypot(dx, dy)
        if (distance < MIN_DISTANCE) return

        const nextGlyphIndex = glyphIndex.current % GLYPHS.length
        particles.current.push({
          x: point.x,
          y: point.y,
          vx: -dx * 0.006,
          vy: -dy * 0.006,
          angle: Math.atan2(dy, dx),
          glyph: GLYPHS[nextGlyphIndex],
          color: COLORS[nextGlyphIndex],
          born: point.time,
        })
        glyphIndex.current += 1

        if (particles.current.length > MAX_PARTICLES) {
          particles.current.splice(0, particles.current.length - MAX_PARTICLES)
        }
      }

      lastPoint.current = point
    }

    function draw(now) {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      particles.current = particles.current.filter((particle) => {
        const age = now - particle.born
        if (age > LIFETIME) return false

        const progress = age / LIFETIME
        const eased = 1 - progress
        particle.x += particle.vx
        particle.y += particle.vy

        ctx.save()
        ctx.translate(particle.x, particle.y)
        ctx.rotate(particle.angle)
        ctx.globalAlpha = eased * eased
        ctx.fillStyle = particle.color
        ctx.fillText(particle.glyph, 0, 0)
        ctx.restore()

        return true
      })

      rafId.current = window.requestAnimationFrame(draw)
    }

    resize()
    rafId.current = window.requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', addParticle, { passive: true })

    return () => {
      window.cancelAnimationFrame(rafId.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', addParticle)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="cursor-trail-canvas"
      data-testid="cursor-trail-canvas"
      aria-hidden="true"
    />
  )
}
