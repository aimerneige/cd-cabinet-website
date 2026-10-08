import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'

export interface Origin {
  x: number
  y: number
  width: number
  height: number
}
export type CaseView = 'front' | 'inside' | 'back'

export function useAlbumAnimation(
  origin: Origin,
  caseDepth: number,
  onReturned: () => void,
) {
  const layer = useRef<HTMLDivElement>(null)
  const caseRef = useRef<HTMLDivElement>(null)
  const timeline = useRef<gsap.core.Timeline | null>(null)
  const closeRequested = useRef(false)
  const viewTimeline = useRef<gsap.core.Timeline | null>(null)
  const opened = useRef(true)
  const trayAngle = useRef(0)
  const [view, setView] = useState<CaseView>('inside')
  const [isChangingView, setIsChangingView] = useState(true)
  const returnCallback = useRef(onReturned)
  returnCallback.current = onReturned

  useLayoutEffect(() => {
    const root = layer.current!
    const jewel = caseRef.current!
    const lid = jewel.querySelector('.case-lid')!
    const paper = jewel.querySelector('.obi-strip')!
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
      onComplete: () => setIsChangingView(false),
    })
    if (reduced) {
      gsap.set(jewel, {
        x: endX,
        y: endY,
        scale: size / 300,
        rotationY: 0,
        opacity: 0,
        transformOrigin: 'top left',
        '--case-depth': `${caseDepth}px`,
      })
      gsap.set(lid, { rotationY: -165 })
      gsap.set(paper, { autoAlpha: 0 })
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
            '--case-depth': `${caseDepth}px`,
            duration: 0.65,
            ease: 'power3.inOut',
          },
          0.38,
        )
        .to(paper, { autoAlpha: 0, duration: 0.22 }, 0.9)
        .to(lid, { rotationY: -165, duration: 0.6, ease: 'power2.inOut' }, 1.12)
        .to([details, controls], { opacity: 1, duration: 0.3 }, 1.4)
    }
    timeline.current = tl
    if (closeRequested.current) tl.reverse()
    return () => {
      tl.kill()
      viewTimeline.current?.kill()
      timeline.current = null
    }
  }, [origin, caseDepth])

  const selectView = (next: CaseView) => {
    if (closeRequested.current || isChangingView || next === view) return
    const jewel = caseRef.current!
    const body = jewel.querySelector('.case-body')!
    const lid = jewel.querySelector('.case-lid')!
    const tray = jewel.querySelector('.tray-leaf')!
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (opened.current)
      trayAngle.current = Number(gsap.getProperty(tray, 'rotationY'))
    if (next !== 'back') opened.current = next === 'inside'
    setIsChangingView(true)
    const tl = gsap.timeline({
      onComplete: () => {
        setView(next)
        setIsChangingView(false)
        viewTimeline.current = null
      },
    })
    viewTimeline.current = tl
    // 背面只转动整个盒体，保留盒盖和内部托盘的展开角度。
    tl.to(
      body,
      {
        rotationY: next === 'back' ? 180 : 0,
        x:
          next === 'back'
            ? opened.current
              ? -300
              : -150
            : next === 'front'
              ? -150
              : 0,
        duration: reduced ? 0 : 0.65,
        ease: 'power2.inOut',
      },
      0,
    )
    if (next !== 'back') {
      tl.to(
        lid,
        {
          rotationY: opened.current ? -165 : 0,
          duration: reduced ? 0 : 0.4,
          ease: 'power2.inOut',
        },
        0,
      ).to(
        tray,
        {
          rotationY: opened.current ? trayAngle.current : 0,
          duration: reduced ? 0 : 0.4,
          ease: 'power2.inOut',
        },
        0,
      )
    }
  }

  const close = (foldTray: (onFolded: () => void) => void) => {
    if (closeRequested.current) return
    closeRequested.current = true
    const changedView = !!viewTimeline.current || view !== 'inside'
    viewTimeline.current?.kill()
    foldTray(() => {
      if (changedView) {
        const jewel = caseRef.current!
        const lid = jewel.querySelector('.case-lid')!
        const reduced = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches
        // 视角改变后单独合盖，避免原开盒时间线把闭合的盒盖重新打开。
        for (const tween of timeline.current!.getChildren(
          false,
          true,
          false,
        ) as gsap.core.Tween[]) {
          if (tween.targets().includes(lid)) tween.kill()
        }
        viewTimeline.current = gsap
          .timeline({ onComplete: () => timeline.current?.reverse() })
          .to(
            jewel.querySelector('.case-body'),
            {
              rotationY: 0,
              x: 0,
              duration: reduced ? 0 : 0.35,
              ease: 'power2.inOut',
            },
            0,
          )
          .to(
            lid,
            {
              rotationY: 0,
              duration: reduced ? 0 : 0.35,
              ease: 'power2.inOut',
            },
            0,
          )
        return
      }
      timeline.current?.reverse()
    })
  }
  return {
    layer,
    caseRef,
    close,
    view,
    isOpen: opened.current,
    isChangingView,
    selectView,
  }
}
