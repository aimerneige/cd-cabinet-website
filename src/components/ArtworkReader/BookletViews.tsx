import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { getBookletLayout, getSpread, getSpreadPages } from '../../lib/booklet'

/** 渲染一页；visible 为 false 时页面应对读屏和键盘隐藏。 */
export type RenderPage = (index: number | null, visible: boolean) => ReactNode

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 宽屏：像真实的骑马钉小册子一样按跨页翻动。 */
export function BookView({ count, index, renderPage }: { count: number; index: number; renderPage: RenderPage }) {
  const layout = useMemo(() => getBookletLayout(count), [count])
  const spread = getSpread(layout, index)
  const book = useRef<HTMLDivElement>(null)
  const leaves = useRef<(HTMLDivElement | null)[]>([])
  const shown = useRef(spread)
  const animation = useRef<gsap.core.Timeline | null>(null)
  // 右侧未翻的纸，序号小的在上；左侧已翻的纸，序号大的在上。
  const zIndex = (leaf: number, turned: boolean) => turned ? leaf + 1 : layout.leaves * 2 - leaf
  // 合上时只露出一页，把整本书平移半页让封面或封底居中。
  const offset = (value: number) => value === 0 ? -25 : value === layout.leaves ? 25 : 0

  useLayoutEffect(() => {
    leaves.current.forEach((leaf, number) => {
      if (leaf) gsap.set(leaf, { rotationY: number < shown.current ? -180 : 0, zIndex: zIndex(number, number < shown.current) })
    })
    gsap.set(book.current, { xPercent: offset(shown.current) })
    return () => { animation.current?.kill() }
  }, [layout])

  useLayoutEffect(() => {
    if (spread === shown.current) return
    const forward = spread > shown.current
    shown.current = spread
    animation.current?.kill()
    const reduced = reducedMotion()
    const turning = leaves.current
      .map((leaf, number) => ({ leaf, number, turned: number < spread }))
      .filter(({ leaf, turned }) => leaf && Math.abs(Number(gsap.getProperty(leaf, 'rotationY')) - (turned ? -180 : 0)) > 0.5)
    if (!forward) turning.reverse()
    // 连续跳页时像拨书页一样依次翻过，但每页更快。
    const duration = reduced ? 0 : turning.length > 2 ? 0.5 : 0.8
    const gap = reduced ? 0 : turning.length > 1 ? 0.13 : 0
    const timeline = gsap.timeline()
    turning.forEach(({ leaf, number, turned }, order) => {
      const at = order * gap
      timeline
        .set(leaf, { zIndex: 1000 + order }, at)
        .to(leaf, { rotationY: turned ? -180 : 0, duration, ease: 'power2.inOut' }, at)
        .to(leaf!.querySelectorAll('.booklet-shade'), {
          keyframes: { '50%': { opacity: 0.32 }, '100%': { opacity: 0 } },
          duration,
        }, at)
        .set(leaf, { zIndex: zIndex(number, turned) }, at + duration)
    })
    timeline.to(book.current, { xPercent: offset(spread), duration: reduced ? 0 : 0.7, ease: 'power2.inOut' }, 0)
    animation.current = timeline
  }, [spread])

  const visible = getSpreadPages(layout, spread)
  return (
    <div ref={book} className={`booklet-book${spread > 0 && spread < layout.leaves ? ' is-open' : ''}`}>
      {Array.from({ length: layout.leaves }, (_, number) => (
        <div className="booklet-leaf" key={number} ref={(element) => { leaves.current[number] = element }}>
          {[number * 2, number * 2 + 1].map((page) => (
            <div className={`booklet-face booklet-face-${page % 2 ? 'back' : 'front'}`} key={page}>
              {renderPage(layout.physical[page], page === visible.left || page === visible.right)}
              <i className="booklet-shade" aria-hidden="true" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** 窄屏：一次一页，绕左侧装订边翻页。 */
export function SinglePageView({ index, renderPage }: { index: number; renderPage: RenderPage }) {
  const previous = useRef(index)
  const [turn, setTurn] = useState<{ from: number; forward: boolean } | null>(null)
  const page = useRef<HTMLDivElement>(null)
  const ghost = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (index === previous.current) return
    const from = previous.current
    previous.current = index
    if (!reducedMotion()) setTurn({ from, forward: index > from })
  }, [index])

  useLayoutEffect(() => {
    if (!turn) return
    const done = () => {
      gsap.set(page.current, { clearProps: 'transform,opacity' })
      setTurn(null)
    }
    // 前进：旧页翻走露出新页；后退：上一页从左侧翻回盖住当前页。
    const tween = turn.forward
      ? gsap.to(ghost.current, { rotationY: -110, opacity: 0, duration: 0.6, ease: 'power2.in', onComplete: done })
      : gsap.fromTo(page.current, { rotationY: -110, opacity: 0 }, { rotationY: 0, opacity: 1, duration: 0.6, ease: 'power2.out', onComplete: done })
    return () => { tween.kill() }
  }, [turn])

  return (
    <div className="booklet-single">
      {turn && <div ref={ghost} className={`booklet-face booklet-single-page${turn.forward ? ' is-above' : ''}`} aria-hidden="true">
        {renderPage(turn.from, false)}
        <i className="booklet-shade" />
      </div>}
      <div ref={page} className="booklet-face booklet-single-page">
        {renderPage(index, true)}
      </div>
    </div>
  )
}

/** 单张插页：只有正反两面，像拿起纸片翻面。 */
export function SheetView({ index, renderPage }: { index: number; renderPage: RenderPage }) {
  const card = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  useEffect(() => {
    const rotationY = index ? 180 : 0
    if (first.current || reducedMotion()) {
      first.current = false
      gsap.set(card.current, { rotationY, z: 0 })
      return
    }
    const timeline = gsap.timeline()
      .to(card.current, { rotationY, duration: 0.8, ease: 'power2.inOut' }, 0)
      .to(card.current, { keyframes: { '50%': { z: 80 }, '100%': { z: 0 }, easeEach: 'sine.inOut' }, duration: 0.8 }, 0)
    return () => { timeline.kill() }
  }, [index])
  return (
    <div ref={card} className="booklet-sheet">
      {[0, 1].map((side) => (
        <div className={`booklet-face booklet-sheet-${side ? 'back' : 'front'}`} key={side}>
          {renderPage(side, side === index)}
        </div>
      ))}
    </div>
  )
}
