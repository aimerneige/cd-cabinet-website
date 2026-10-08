import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { AlbumDisc } from '../types/album'

export function useDiscAnimation(discs: AlbumDisc[]) {
  const trayRef = useRef<HTMLDivElement>(null)
  const animation = useRef<gsap.core.Timeline | null>(null)
  const position = useRef(0)
  const closing = useRef(false)
  const [discIndex, setDiscIndex] = useState(0)
  const [faces, setFaces] = useState([0, Math.min(1, discs.length - 1)])
  const [isTurning, setIsTurning] = useState(false)

  useEffect(
    () => () => {
      animation.current?.kill()
    },
    [],
  )

  const selectDisc = (index: number) => {
    if (closing.current || animation.current || index === discIndex) return
    if (discs.length === 3 && discIndex > 0 && index > 0) {
      setDiscIndex(index)
      return
    }
    const tray = trayRef.current
    if (!tray) return
    const target = discs.length === 3 ? (index === 0 ? 0 : 1) : index % 2
    const finish = () => {
      position.current = target
      setDiscIndex(index)
      setIsTurning(false)
      animation.current = null
    }
    const updateFace = () => {
      if (discs.length !== 3 || index !== 2) {
        setFaces((previous) =>
          previous.map((face, side) => (side === target ? index : face)),
        )
      }
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      updateFace()
      gsap.set(tray, { rotationY: target * -150 })
      finish()
      return
    }
    setIsTurning(true)
    const tl = gsap.timeline({ onComplete: finish })
    animation.current = tl
    if (position.current === target) {
      // 同一面的跨页切换先翻开托盘，在隐藏面换页后再翻回。
      tl.to(tray, {
        rotationY: (1 - target) * -150,
        duration: 0.38,
        ease: 'power2.inOut',
      })
        .call(updateFace)
        .to(tray, {
          rotationY: target * -150,
          duration: 0.38,
          ease: 'power2.inOut',
        })
    } else {
      updateFace()
      tl.to(tray, {
        rotationY: target * -150,
        duration: 0.7,
        ease: 'power2.inOut',
      })
    }
  }

  const resetTray = (onClosed: () => void) => {
    if (closing.current) return
    closing.current = true
    animation.current?.kill()
    animation.current = null
    setIsTurning(true)
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !Number(gsap.getProperty(trayRef.current, 'rotationY'))
    ) {
      gsap.set(trayRef.current, { rotationY: 0 })
      onClosed()
      return
    }
    animation.current = gsap
      .timeline({ onComplete: onClosed })
      .to(trayRef.current, {
        rotationY: 0,
        duration: 0.3,
        ease: 'power2.inOut',
      })
  }

  return {
    trayRef,
    frontDisc: discs[faces[0]],
    backDisc: discs[faces[1]],
    discIndex,
    isTurning,
    selectDisc,
    resetTray,
  }
}
