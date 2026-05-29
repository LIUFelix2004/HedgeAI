import { animate, createScope, createTimeline, stagger } from 'animejs'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function enterCards(targets, options = {}) {
  if (!targets || prefersReducedMotion()) return null

  return animate(targets, {
    opacity: [0, 1],
    translateY: [12, 0],
    delay: stagger(options.stagger ?? 70),
    duration: options.duration ?? 360,
    ease: 'outCubic',
  })
}

export function pulseRisk(target, options = {}) {
  if (!target || prefersReducedMotion()) return null

  return animate(target, {
    scale: [1, 1.015, 1],
    boxShadow: [
      '0 10px 24px rgba(112,130,173,0.08)',
      '0 16px 34px rgba(217,75,96,0.16)',
      '0 10px 24px rgba(112,130,173,0.08)',
    ],
    duration: options.duration ?? 720,
    ease: 'outCubic',
  })
}

export function slideIn(target, options = {}) {
  if (!target || prefersReducedMotion()) return null

  return animate(target, {
    opacity: [0, 1],
    translateX: [options.from ?? 18, 0],
    duration: options.duration ?? 280,
    ease: 'outCubic',
  })
}

export function countNumber(target, from, to, formatter = value => String(Math.round(value))) {
  if (!target) return null
  if (prefersReducedMotion()) {
    target.textContent = formatter(to)
    return null
  }

  return animate({ value: from }, {
    value: to,
    duration: 520,
    ease: 'outCubic',
    onUpdate: self => {
      target.textContent = formatter(self.animatables[0].target.value)
    },
  })
}

export function makeScope(rootRef, setup) {
  if (!rootRef?.current || typeof setup !== 'function') return null
  return createScope({ root: rootRef.current }).add(setup)
}

export { animate, createTimeline, stagger }
