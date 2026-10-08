import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

export interface Origin {
  x: number
  y: number
  width: number
  height: number
}

export function useAlbumAnimation(origin: Origin, onReturned: () => void) {
  const layer = useRef<HTMLDivElement>(null)
  const caseRef = useRef<HTMLDivElement>(null)
  const timeline = useRef<gsap.core.Timeline | null>(null)
  const closeRequested = useRef(false)
  const returnCallback = useRef(onReturned)
  returnCallback.current = onReturned

  useLayoutEffect(() => {
    const root = layer.current!
    const jewel = caseRef.current!
    const lid = jewel.querySelector('.case-lid')!
    const details = root.querySelector('.album-details')!
    const overlay = root.querySelector('.collection-overlay')!
    const controls = root.querySelector('.viewer-controls')!
    const compact = window.innerWidth <= 700
    const size = Math.min(
      compact ? (window.innerWidth - 48) / 1.94 : 360,
      window.innerHeight * 0.39,
    )
    const endX = window.innerWidth / 2 + size * 0.03
    const endY = Math.max(90, window.innerHeight * 0.17)
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const initialScale = origin.height / 300
    gsap.set(jewel, {
      x: origin.x + origin.width / 2 - 150,
      y: origin.y + origin.height / 2 - 150,
      scale: initialScale,
      rotationY: 90,
      transformOrigin: 'center center',
      '--case-depth': `${origin.width / initialScale}px`,
    })
    gsap.set([details, overlay, controls], { opacity: 0 })
    gsap.set(details, { top: endY + size + 36 })
    const tl = gsap.timeline({
      onReverseComplete: () => returnCallback.current(),
    })
    if (reduced) {
      gsap.set(jewel, {
        x: endX,
        y: endY,
        scale: size / 300,
        rotationY: 0,
        opacity: 0,
        transformOrigin: 'top left',
        '--case-depth': '14px',
      })
      gsap.set(lid, { rotationY: -165 })
      tl.to(overlay, { opacity: 1, duration: 0.15 }, 0)
        .to(jewel, { opacity: 1, duration: 0.2 }, 0)
        .to([details, controls], { opacity: 1, duration: 0.15 }, 0.1)
    } else {
      tl.to(jewel, {
        z: 70,
        x: '+=18',
        y: '-=8',
        duration: 0.22,
        ease: 'power2.out',
      })
        .to(overlay, { opacity: 1, duration: 0.45 }, 0.15)
        .to(
          jewel,
          {
            x: endX + size / 2 - 150,
            y: endY + size / 2 - 150,
            z: 0,
            duration: 0.6,
            ease: 'power3.inOut',
          },
          0.22,
        )
        .to(
          jewel,
          {
            rotationY: 0,
            scale: size / 300,
            '--case-depth': '14px',
            duration: 0.65,
            ease: 'power3.inOut',
          },
          0.38,
        )
        .to(lid, { rotationY: -165, duration: 0.6, ease: 'power2.inOut' }, 1.12)
        .to([details, controls], { opacity: 1, duration: 0.3 }, 1.4)
    }
    timeline.current = tl
    if (closeRequested.current) tl.reverse()
    return () => {
      tl.kill()
      timeline.current = null
    }
  }, [origin])

  const close = () => {
    if (closeRequested.current) return
    closeRequested.current = true
    timeline.current?.reverse()
  }
  return { layer, caseRef, close }
}
