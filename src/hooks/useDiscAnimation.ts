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
    // 一页翻完再翻下一页，避免托盘互相穿插；连续翻多页时每页更快。
    const duration = Math.abs(target - position.current) > 1 ? 0.5 : 0.68
    for (let page = position.current, turn = 0; page !== target; page += step, turn++) {
      const trayIndex = step > 0 ? page : page - 1
      const tray = trayRefs.current[trayIndex]
      const { rotationY, z } = trayTransform(trayIndex, step > 0)
      const at = turn * duration
      tl.to(tray, { rotationY, duration, ease: 'power3.inOut' }, at)
        // 翻页中途稍微抬起托盘，落下时贴合到目标层。
        .to(tray, {
          keyframes: {
            '50%': { z: Math.max(z, Number(gsap.getProperty(tray, 'z'))) + 10 },
            '100%': { z },
            easeEach: 'sine.inOut',
          },
          duration,
        }, at)
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
    let turn = 0
    for (let index = trayRefs.current.length - 1; index >= 0; index--) {
      const tray = trayRefs.current[index]
      if (Number(gsap.getProperty(tray, 'rotationY'))) {
        tl.to(tray, {
          ...trayTransform(index, false),
          duration: 0.3,
          ease: 'power2.inOut',
        }, turn++ * 0.3)
      } else tl.set(tray, trayTransform(index, false), 0)
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
