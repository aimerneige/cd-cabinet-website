import { useEffect, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'

export type ObiMode = 'attached' | 'hidden' | 'flat'

export function useObiAnimation(
  caseRef: RefObject<HTMLDivElement | null>,
  depth: number,
) {
  const paperRef = useRef<HTMLDivElement>(null)
  const animation = useRef<gsap.core.Timeline | null>(null)
  const closing = useRef(false)
  const [mode, setMode] = useState<ObiMode>('attached')
  const [isMoving, setIsMoving] = useState(false)
  useEffect(
    () => () => {
      animation.current?.kill()
    },
    [],
  )

  const selectMode = (next: ObiMode) => {
    if (closing.current || animation.current || next === mode) return
    const paper = paperRef.current!
    const folds = paper.querySelectorAll('.obi-spine-fold, .obi-back-fold')
    const body = caseRef.current!.querySelector('.case-body')!
    const reversed = Number(gsap.getProperty(body, 'rotationY')) > 90
    const centered =
      Math.abs(Number(gsap.getProperty(body, 'x'))) === 150 ? 150 : 0
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const duration = reduced ? 0 : 0.35
    setIsMoving(true)
    const tl = gsap.timeline({
      onComplete: () => {
        if (next === 'hidden') {
          gsap.set(folds, { rotationY: -90 })
          gsap.set(paper, {
            x: 0,
            y: 0,
            z: depth / 2 + 4,
            rotationY: 0,
            rotationZ: 0,
            scale: 1,
          })
        }
        setMode(next)
        setIsMoving(false)
        animation.current = null
      },
    })
    animation.current = tl
    if (next === 'flat') {
      tl.to(paper, {
        autoAlpha: 1,
        x: reversed ? centered - (depth + 8) * 0.6 : centered + (depth + 8) * 0.6,
        y: -25,
        scale: 1.2,
        z: reversed ? -90 : 90,
        rotationY: reversed ? 180 : 0,
        rotationZ: -2,
        duration,
        ease: 'power2.inOut',
      }).to(
        folds,
        {
          rotationY: 0,
          duration,
          stagger: reduced ? 0 : 0.08,
          ease: 'power2.inOut',
        },
        reduced ? 0 : 0.2,
      )
    } else if (next === 'hidden') {
      tl.to(paper, {
        x: '-=35',
        y: 8,
        z: reversed ? -80 : 80,
        rotationZ: -6,
        autoAlpha: 0,
        duration,
        ease: 'power2.in',
      })
    } else {
      tl.to(folds, {
        rotationY: -90,
        duration,
        stagger: reduced ? 0 : 0.06,
        ease: 'power2.inOut',
      }).to(
        paper,
        {
          autoAlpha: 1,
          x: 0,
          y: 0,
          z: depth / 2 + 4,
          rotationY: 0,
          rotationZ: 0,
          scale: 1,
          duration,
          ease: 'power2.inOut',
        },
        reduced ? 0 : 0.2,
      )
    }
  }

  const resetObi = (onAttached: () => void) => {
    if (closing.current) return
    closing.current = true
    const moving = !!animation.current
    animation.current?.kill()
    animation.current = null
    if (mode !== 'flat' && !moving) {
      onAttached()
      return
    }
    const paper = paperRef.current!
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    setIsMoving(true)
    animation.current = gsap
      .timeline({
        onComplete: () => {
          setMode('attached')
          onAttached()
        },
      })
      .to(paper.querySelectorAll('.obi-spine-fold, .obi-back-fold'), {
        rotationY: -90,
        duration: reduced ? 0 : 0.25,
        ease: 'power2.inOut',
      })
      .to(paper, {
        x: 0,
        y: 0,
        z: depth / 2 + 4,
        rotationY: 0,
        rotationZ: 0,
        scale: 1,
        autoAlpha: 1,
        duration: reduced ? 0 : 0.25,
        ease: 'power2.inOut',
      })
  }

  return { paperRef, mode, isMoving, selectMode, resetObi }
}
