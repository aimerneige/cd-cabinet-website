import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { AlbumDisc } from '../types/album'

export function useDiscAnimation(discs: AlbumDisc[], caseDepth: number, initialIndex = 0) {
  const trayRefs = useRef<(HTMLDivElement | null)[]>([])
  const animation = useRef<gsap.core.Timeline | null>(null)
  const position = useRef(Math.ceil(initialIndex / 2))
  const closing = useRef(false)
  const [discIndex, setDiscIndex] = useState(initialIndex)
  const [isTurning, setIsTurning] = useState(false)
  const frontDepth = discs.length > 3 ? caseDepth / 2 - 3 : 3
  const trayTransform = (index: number, turned: boolean) => ({
    rotationY: turned ? -150 : 0,
    // 厚盒托盘靠近盒盖铰链，翻开后反向叠放，避免盒盖和前页遮住碟片。
    z: frontDepth + (turned ? index : -index) * 6,
  })

  useLayoutEffect(() => {
    trayRefs.current.forEach((tray, index) => {
      gsap.set(tray, trayTransform(index, index < position.current))
    })
  }, [])

  useEffect(
    () => () => {
      animation.current?.kill()
    },
    [],
  )

  const selectDisc = (index: number) => {
    if (closing.current || animation.current || index === discIndex) return
    const target = Math.ceil(index / 2)
    if (position.current === target) {
      setDiscIndex(index)
      return
    }
    const finish = () => {
      position.current = target
      setDiscIndex(index)
      setIsTurning(false)
      animation.current = null
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      trayRefs.current.forEach((tray, trayIndex) => {
        gsap.set(tray, trayTransform(trayIndex, trayIndex < target))
      })
      finish()
      return
    }
    setIsTurning(true)
    const tl = gsap.timeline({ onComplete: finish })
    animation.current = tl
    const step = target > position.current ? 1 : -1
    for (let page = position.current; page !== target; page += step) {
      const trayIndex = step > 0 ? page : page - 1
      tl.to(trayRefs.current[trayIndex], {
        ...trayTransform(trayIndex, step > 0),
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
      trayRefs.current.every((tray) => !Number(gsap.getProperty(tray, 'rotationY')))
    ) {
      trayRefs.current.forEach((tray, index) => {
        gsap.set(tray, trayTransform(index, false))
      })
      onClosed()
      return
    }
    const tl = gsap.timeline({ onComplete: onClosed })
    animation.current = tl
    for (let index = trayRefs.current.length - 1; index >= 0; index--) {
      const tray = trayRefs.current[index]
      if (Number(gsap.getProperty(tray, 'rotationY'))) {
        tl.to(tray, {
          ...trayTransform(index, false),
          duration: 0.3,
          ease: 'power2.inOut',
        })
      } else tl.set(tray, trayTransform(index, false))
    }
  }

  return {
    trayRefs,
    discIndex,
    isTurning,
    selectDisc,
    resetTray,
  }
}
