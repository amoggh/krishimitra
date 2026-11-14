import { useRef, useState } from 'react'
import { inr } from '../lib/core'
import { useCanvas, reduced } from './motion'

// ---- parcel map: land split drawn as furrowed strips ----
function slice(items, x, y, w, h, out) {
  if (items.length === 1) { out.push({ ...items[0], x, y, w, h }); return }
  const total = items.reduce((t, i) => t + i.v, 0)
  let acc = 0, k = 0
  while (k < items.length - 1 && acc + items[k].v <= total / 2) { acc += items[k].v; k++ }
  if (k === 0) { acc = items[0].v; k = 1 }
  const a = items.slice(0, k), b = items.slice(k), fa = acc / total
  if (w >= h) { slice(a, x, y, w * fa, h, out); slice(b, x + w * fa, y, w * (1 - fa), h, out) }
  else { slice(a, x, y, w, h * fa, out); slice(b, x, y + h * fa, w, h * (1 - fa), out) }
}
export function ParcelMap({ crops, fallow, total, hover }) {
  const W = 640, H = 400
  const items = crops.map(c => ({ v: c.acres, hue: c.crop.hue, name: c.crop.name.split(' (')[0], kn: c.crop.kn, acres: c.acres, id: c.crop.id }))
  if (fallow > 0) items.push({ v: fallow, hue: '#9AA08F', name: 'Fallow', acres: fallow, id: 'fallow', fallow: true })
  const rects = []; slice(items, 6, 6, W - 12, H - 12, rects)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="parcel" role="img" aria-label={`Field split: ${items.map(i => `${i.name} ${i.acres} acres`).join(', ')}`}>
      <defs>
        {rects.map(r => (
          <pattern key={r.id} id={`f-${r.id}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform={`rotate(${r.fallow ? 45 : 90 + (r.id.length * 7) % 25})`}>
            <rect width="14" height="14" fill={r.hue} opacity={r.fallow ? .18 : .78} />
            <line x1="0" y1="7" x2="14" y2="7" stroke="#fff" strokeOpacity={r.fallow ? .5 : .16} strokeWidth="1" />
          </pattern>
        ))}
      </defs>
      {rects.map(r => {
        const show = r.w > 120 && r.h > 70
        return <g key={r.id} style={{ opacity: hover && hover !== r.id ? .35 : 1, transition: 'opacity .2s' }}>
          <rect className="pm" style={{ x: r.x + 3, y: r.y + 3, width: r.w - 6, height: r.h - 6 }} fill={`url(#f-${r.id})`} rx="8" />
          <g className="pm-l" style={{ transform: `translate(${r.x + 12}px,${r.y + 12}px)`, opacity: show ? 1 : 0 }}>
            <rect width="168" height="52" rx="8" fill="#FFFFFF" fillOpacity=".94" />
            <text x="12" y="22" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600" fill="#171A17">{r.name.length > 17 ? r.name.slice(0, 16) + '…' : r.name}</text>
            <text x="12" y="40" fontFamily="Inter, sans-serif" fontSize="12" fill="#7C827B">{r.acres} {r.acres === 1 ? 'acre' : 'acres'}{r.kn ? '  ' + r.kn : ''}</text>
          </g>
        </g>
      })}
      <text x={W - 14} y={H - 16} textAnchor="end" fontFamily="Inter" fontSize="11" fontWeight="500" fill="#171A17" opacity=".55">{total} AC · N ↑</text>
    </svg>
  )
}

// ---- profit distribution ----
// Each simulated season falls as a grain and lands in the pile for its profit band.
export function GrainHist({ opt }) {
  const G = useRef({ grains: [], made: 0, order: [], stacks: [] })
  const [tip, setTip] = useState(null)
  const { hist, p10, p50, p90 } = opt
  if (G.current.opt !== opt) {
    const order = []; hist.bins.forEach((c, i) => { for (let k = 0; k < c; k++) order.push(i) })
    for (let i = order.length - 1; i > 0; i--) { const j = (i * 7919 + 13) % (i + 1); [order[i], order[j]] = [order[j], order[i]] }
    G.current = { opt, grains: [], made: 0, order, stacks: hist.bins.map(() => 0) }
  }
  const colorFor = (i) => { const mid = hist.lo + (i + .5) * hist.w; return mid < 0 ? '#B4532A' : mid < p10 || mid > p90 ? '#9DB8A8' : '#1F5A44' }
  const ref = useCanvas((c, W, H, t, dt) => {
    const g = G.current, pad = 12, base = H - 62, n = hist.bins.length, bw = (W - pad * 2) / n, perRow = Math.max(2, Math.floor(bw / 5))
    const maxBin = Math.max(...hist.bins), rows = Math.ceil(maxBin / perRow), cell = Math.min(5.2, (base - 26) / rows), X = v => pad + ((v - hist.lo) / (hist.hi - hist.lo || 1)) * (W - pad * 2)
    const settle = reduced() || document.hidden
    const spawn = settle ? g.order.length : Math.min(g.order.length, g.made + Math.ceil(dt * 240))
    for (; g.made < spawn; g.made++) { const i = g.order[g.made]; g.grains.push({ i, k: g.stacks[i]++, y: -10 - Math.random() * 60, v: 0, done: settle }) }
    c.clearRect(0, 0, W, H)
    let flying = 0
    for (const q of g.grains) {
      const col = q.k % perRow, row = Math.floor(q.k / perRow), tx = pad + q.i * bw + (bw - perRow * 4.6) / 2 + col * 4.6 + 2, ty = base - 3 - row * cell
      if (!q.done) { q.v += 1500 * dt; q.y += q.v * dt; if (q.y >= ty) { q.y = ty; q.done = true } else flying++ }
      c.fillStyle = colorFor(q.i); c.beginPath(); c.ellipse(tx, q.done ? ty : q.y, 2.1, 1.7, q.k, 0, 7); c.fill()
    }
    c.strokeStyle = '#171A17'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(pad, base + .5); c.lineTo(W - pad, base + .5); c.stroke()
    if (hist.lo < 0 && hist.hi > 0) { const z = X(0); c.strokeStyle = '#B4532A'; c.setLineDash([4, 3]); c.lineWidth = 1; c.beginPath(); c.moveTo(z, 8); c.lineTo(z, base); c.stroke(); c.setLineDash([]); c.fillStyle = '#B4532A'; c.font = '10px Inter'; c.fillText('BREAK-EVEN', z + 5, 16) }
    ;[[p10, 'BAD YEAR', 'left', pad], [p50, 'TYPICAL', 'center', W / 2], [p90, 'GOOD YEAR', 'right', W - pad]].forEach(([v, l, a, lx]) => {
      const x = X(v); c.strokeStyle = '#171A17'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, base); c.lineTo(x, base + 6); c.lineTo(lx, base + 13); c.stroke()
      c.textAlign = a; c.fillStyle = '#7C827B'; c.font = '10px Inter'; c.fillText(l, lx, base + 26); c.fillStyle = '#171A17'; c.font = '16px Inter, sans-serif'; c.fillText(inr(v), lx, base + 46)
    }); c.textAlign = 'left'
    if (g.made >= g.order.length && flying === 0) return false
  }, [opt])
  const move = (e) => {
    const r = ref.current.getBoundingClientRect(), i = Math.floor((e.clientX - r.left - 12) / ((r.width - 24) / hist.bins.length))
    if (i < 0 || i >= hist.bins.length) return setTip(null)
    setTip({ x: e.clientX - r.left, n: hist.bins[i], a: hist.lo + i * hist.w, b: hist.lo + (i + 1) * hist.w })
  }
  return <div className="grain-wrap"><canvas ref={ref} className="grain" onPointerMove={move} onPointerLeave={() => setTip(null)} aria-label={`Profit outcomes: bad year ${inr(p10)}, typical ${inr(p50)}, good year ${inr(p90)}`} role="img" />
    {tip && <div className="tip" style={{ left: tip.x }}><b>{tip.n} seasons</b><br />{inr(tip.a)} to {inr(tip.b)}</div>}</div>
}

export function Spark({ data, hi, w = 110, h = 34, color = '#1F5A44' }) {
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1
  const pts = data.map((v, i) => [2 + (i / (data.length - 1)) * (w - 4), h - 4 - ((v - mn) / r) * (h - 8)])
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('')
  const last = pts[hi ?? pts.length - 1]
  return <svg width={w} height={h}><path d={d} fill="none" stroke={color} strokeWidth="1.6" /><circle cx={last[0]} cy={last[1]} r="3" fill={color} /></svg>
}

export function Dots({ n, max = 5 }) {
  return <span className="dots">{Array.from({ length: max }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}</span>
}
