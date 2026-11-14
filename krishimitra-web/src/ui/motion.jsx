import { useEffect, useRef, useState } from 'react'

export const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Canvas with DPR handling. draw(ctx, w, h, t, dt) runs each frame while visible.
// Return false from draw to stop the loop until deps change.
export function useCanvas(draw, deps = []) {
  const ref = useRef(null), fn = useRef(draw)
  fn.current = draw
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const ctx = cv.getContext('2d')
    let w = 0, h = 0, raf = 0, last = 0, t = 0, seen = true, stopped = false
    const size = () => {
      const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2)
      w = r.width; h = r.height; cv.width = Math.round(w * d); cv.height = Math.round(h * d)
      ctx.setTransform(d, 0, 0, d, 0, 0)
    }
    const frame = (now) => {
      raf = 0
      if (!seen || stopped || document.hidden) return
      const dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now; t += dt
      if (fn.current(ctx, w, h, t, dt) === false) { stopped = true; return }
      raf = requestAnimationFrame(frame)
    }
    const kick = () => { if (!raf && !stopped) { last = 0; raf = requestAnimationFrame(frame) } }
    size()
    if (reduced()) { t = 99; fn.current(ctx, w, h, t, 0); return }
    fn.current(ctx, w, h, 0, 0)        // paint once so a hidden tab is never blank
    const ro = new ResizeObserver(() => { size(); stopped = false; if (reduced()) fn.current(ctx, w, h, 99, 0); else kick() }); ro.observe(cv)
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; kick() }); io.observe(cv)
    const vis = () => kick(); document.addEventListener('visibilitychange', vis)
    kick()
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', vis) }
  }, deps)
  return ref
}

// Fires once when scrolled into view.
export function useSeen(threshold = .25) {
  const ref = useRef(null), [seen, setSeen] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold })
    io.observe(ref.current); return () => io.disconnect()
  }, [])
  return [ref, seen]
}

// Number that glides from its previous value. Lands on the true value even if rAF is throttled.
export function Tween({ to, fmt = (v) => Math.round(v).toLocaleString('en-IN'), ms = 750 }) {
  const [v, setV] = useState(to), prev = useRef(to), raf = useRef()
  useEffect(() => {
    const from = prev.current; prev.current = to
    if (from === to || reduced() || document.hidden) { setV(to); return }
    const t0 = performance.now()
    const tick = (n) => { const p = Math.min(1, (n - t0) / ms); setV(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) raf.current = requestAnimationFrame(tick) }
    raf.current = requestAnimationFrame(tick)
    const safety = setTimeout(() => setV(to), ms + 120)
    return () => { cancelAnimationFrame(raf.current); clearTimeout(safety) }
  }, [to])
  return fmt(v)
}

export function Reveal({ children, className = '', as: Tag = 'div', ...rest }) {
  const [ref, seen] = useSeen(.12)
  return <Tag ref={ref} className={`reveal ${seen ? 'in' : ''} ${className}`} {...rest}>{children}</Tag>
}

// Ploughed-strip wipe shown between tabs.
export function PloughWipe({ label }) {
  return <div className="wipe" aria-hidden>
    {Array.from({ length: 11 }, (_, i) => <i key={i} style={{ animationDelay: `${Math.abs(i - 5) * 26}ms` }} />)}
    <b>{label}</b>
  </div>
}

// Thin growth bar: a shoot creeping across the masthead as you scroll.
export function GrowthBar() {
  const ref = useRef(null)
  useEffect(() => {
    const on = () => {
      const m = document.documentElement.scrollHeight - innerHeight
      ref.current?.style.setProperty('--p', m > 0 ? Math.min(1, scrollY / m) : 0)
    }
    on(); addEventListener('scroll', on, { passive: true }); addEventListener('resize', on)
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on) }
  }, [])
  return <div className="growbar" ref={ref} aria-hidden><i /><svg viewBox="0 0 22 16" width="22" height="16"><path d="M2 14C2 6 10 2 20 2c0 8-6 12-18 12z" fill="#1F5A44" /></svg></div>
}
