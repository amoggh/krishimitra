import { useEffect, useRef } from 'react'
import { useCanvas } from './motion'
import { DISTRICTS } from '../data/districts'

// A living linocut. The field is drawn from the sentence the visitor is writing:
// acres set the number of rows, the district and season set the weather, the water source sets what runs down the furrows.
const INK = '#171A17', LEAF = '#1F5A44', LEAF2 = '#5D8450', SOIL = '#C9B98F', SOIL2 = '#B3A173', GOLD = '#B8862F', CLAY = '#B4532A', WATER = '#4F8496'
const START = { kharif: 5, rabi: 9, summer: 1 }, LEN = { kharif: 4, rabi: 5, summer: 4 }

function seasonRain(district, season) {
  const m = DISTRICTS[district]?.monthly; if (!m) return 300
  let s = 0; for (let i = 0; i < LEN[season]; i++) s += m[(START[season] + i) % 12]
  return s
}

export default function LivingField({ scene, wave, horizonEl }) {
  const st = useRef({ mx: -999, my: -999, wind: 0, lx: 0, blooms: [], seeds: [], rain: [], birds: [], wave: -1, plants: null, sig: '', hz: 300 })
  const S = useRef(scene); S.current = scene

  useEffect(() => { st.current.wave = 0 }, [wave])

  const ref = useCanvas((c, W, H, t, dt) => {
    const s = st.current, sc = S.current
    const r = horizonEl?.current?.getBoundingClientRect(), own = c.canvas.getBoundingClientRect()
    if (r && r.height) s.hz = Math.max(180, Math.min(H * .72, r.bottom - own.top + 58))
    const hz = s.hz, cx = W * .36
    const rainMm = seasonRain(sc.district, sc.season), wet = Math.min(1, rainMm / 700)
    c.clearRect(0, 0, W, H)

    // sun
    const sunR = Math.min(118, W * .1) * (sc.season === 'summer' ? 1.2 : sc.season === 'rabi' ? .82 : 1)
    const sunX = W * (.8 + Math.sin(t * .05) * .015) + (s.mx > -900 ? (s.mx - W / 2) * .012 : 0), sunY = hz - sunR * (sc.season === 'rabi' ? .35 : .62)
    c.save(); c.beginPath(); c.rect(0, 0, W, hz); c.clip()
    c.fillStyle = GOLD; c.beginPath(); c.arc(sunX, sunY, sunR, 0, 7); c.fill()
    c.strokeStyle = INK; c.lineWidth = 1.1
    const rays = 44
    for (let i = 0; i < rays; i++) {
      const a = i / rays * Math.PI * 2 + t * .05, in1 = sunR + 10, out = sunR + 26 + (i % 2 ? 26 : 0) + Math.sin(t * 1.4 + i) * 5
      c.beginPath(); c.moveTo(sunX + Math.cos(a) * in1, sunY + Math.sin(a) * in1); c.lineTo(sunX + Math.cos(a) * out, sunY + Math.sin(a) * out); c.stroke()
    }
    // engraved sun hatch
    c.save(); c.beginPath(); c.arc(sunX, sunY, sunR, 0, 7); c.clip(); c.strokeStyle = 'rgba(23,38,27,.28)'; c.lineWidth = 1
    for (let y = sunY - sunR; y < sunY + sunR; y += 7) { c.beginPath(); c.moveTo(sunX - sunR, y); c.lineTo(sunX + sunR, y); c.stroke() }
    c.restore()
    // clouds thicken with the season's rain
    const nClouds = Math.round(wet * 6)
    for (let i = 0; i < nClouds; i++) {
      const cw = 110 + (i * 53) % 90, zone = W < 900 ? 0 : W * .54, x = zone + ((i * 271 + t * (7 + i)) % (W - zone + 200)) - 100, y = 40 + (i * 37) % Math.max(40, hz * .4)
      c.fillStyle = '#F6F5F0'; c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath()
      c.moveTo(x, y + 18); c.bezierCurveTo(x - 12, y - 8, x + cw * .25, y - 16, x + cw * .36, y - 2); c.bezierCurveTo(x + cw * .45, y - 28, x + cw * .8, y - 22, x + cw * .78, y + 2); c.bezierCurveTo(x + cw + 16, y, x + cw + 6, y + 20, x + cw - 8, y + 20); c.closePath(); c.fill(); c.stroke()
      c.lineWidth = .8; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + 14 * k, y + 13); c.lineTo(x + cw - 20 * k, y + 13); c.stroke() }
    }
    // birds scatter away from the cursor
    if (!s.birds.length) for (let i = 0; i < 7; i++) s.birds.push({ x: Math.random() * W, y: 14 + Math.random() * 26, v: 16 + Math.random() * 14, p: Math.random() * 6, sc: 0 })
    c.strokeStyle = INK; c.lineWidth = 1.5
    for (const b of s.birds) {
      const d = Math.hypot(b.x - s.mx, b.y - s.my); if (d < 130) b.sc = 1
      b.sc = Math.max(0, b.sc - dt * .6)
      b.x += (b.v + b.sc * 170) * dt; b.y -= b.sc * 70 * dt; if (b.x > W + 30 || b.y < -20) { b.x = -30; b.y = 14 + Math.random() * 26; b.sc = 0 }
      const f = Math.sin(t * (7 + b.sc * 10) + b.p) * 5
      c.beginPath(); c.moveTo(b.x - 8, b.y - f); c.quadraticCurveTo(b.x - 3, b.y - 3, b.x, b.y); c.quadraticCurveTo(b.x + 3, b.y - 3, b.x + 8, b.y - f); c.stroke()
    }
    c.restore()

    // far hills
    c.fillStyle = '#7E9270'; c.beginPath(); c.moveTo(0, hz)
    for (let x = 0; x <= W; x += 18) c.lineTo(x, hz - 18 - Math.sin(x * .007 + 1) * 15 - Math.sin(x * .021) * 6)
    c.lineTo(W, hz); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.3; c.stroke()

    // ground with perspective furrows
    const rows = Math.max(24, Math.min(64, Math.round(24 + sc.acres * 2.6)))
    const X = (u, y) => cx + u * W * 2.8 * ((y - hz) / (H - hz))
    c.fillStyle = sc.source === 'rainfed' && wet < .35 ? '#D3C49B' : SOIL; c.fillRect(0, hz, W, H - hz)
    c.fillStyle = SOIL2
    for (let i = -rows; i < rows; i += 2) {
      const a = i / rows, b = (i + 1) / rows
      c.beginPath(); c.moveTo(X(a, hz + .01), hz); c.lineTo(X(a, H), H); c.lineTo(X(b, H), H); c.lineTo(X(b, hz + .01), hz); c.fill()
    }
    c.strokeStyle = 'rgba(23,38,27,.32)'; c.lineWidth = 1
    for (let i = -rows; i <= rows; i++) { const a = i / rows; c.beginPath(); c.moveTo(cx, hz); c.lineTo(X(a, H), H); c.stroke() }
    c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, hz); c.lineTo(W, hz); c.stroke()

    // water running down the furrows
    if (sc.source === 'borewell') {
      c.strokeStyle = WATER; c.lineCap = 'round'
      const flow = .08 + (sc.hours || 6) * .018
      for (let i = -rows + 1; i < rows; i += 2) {
        const a = (i + .5) / rows
        for (let k = 0; k < 4; k++) {
          const d = ((t * flow + k / 4 + i * .037) % 1 + 1) % 1, d2 = Math.min(1, d + .05)
          const y1 = hz + Math.pow(d, 2.1) * (H - hz), y2 = hz + Math.pow(d2, 2.1) * (H - hz)
          c.lineWidth = .8 + d * 4; c.beginPath(); c.moveTo(X(a, y1), y1); c.lineTo(X(a, y2), y2); c.stroke()
        }
      }
      c.lineCap = 'butt'
    }
    if (sc.source === 'canal') {
      const y0 = hz + (H - hz) * .1, y1 = hz + (H - hz) * .17
      c.fillStyle = WATER; c.beginPath(); c.rect(0, y0, W, y1 - y0); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.3; c.strokeRect(-2, y0, W + 4, y1 - y0)
      c.strokeStyle = 'rgba(248,243,230,.75)'; c.lineWidth = 1.2
      for (let i = 0; i < 46; i++) { const x = ((i * 67 + t * 34) % (W + 60)) - 30, y = y0 + 5 + (i * 13) % Math.max(4, y1 - y0 - 8); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 24, y); c.stroke() }
    }

    // plants, far to near
    const sig = `${rows}|${Math.round(W / 40)}`
    if (s.sig !== sig) {
      s.sig = sig; s.plants = []
      const narrow = W < 720, depth = narrow ? 9 : 13
      for (let d = 0; d < depth; d++) {
        const dn = (d + 1) / depth
        for (let i = -rows + 1; i < rows; i += narrow ? 4 : 2) s.plants.push({ u: (i + 1.5) / rows, d: dn, seed: Math.abs(Math.sin(i * 12.9 + d * 78.2)), born: d * .1 + Math.abs(i) * .012, bloom: 0, kick: 0 })
      }
    }
    // pointer wind
    const v = s.mx - s.lx; s.lx = s.mx; if (Math.abs(v) < 200) s.wind += v * .004; s.wind *= .93
    if (s.wave >= 0) { s.wave += dt * 1.15; if (s.wave > 1.6) s.wave = -1 }

    const dark = new Path2D(), light = new Path2D(), heads = new Path2D()
    const live = []
    for (const p of s.plants) {
      const y = hz + Math.pow(p.d, 1.5) * (H - hz) * .985
      const x = X(p.u, y); if (x < -80 || x > W + 80) continue
      const sc2 = Math.max(.07, (y - hz) / (H - hz))
      let g = Math.min(1, Math.max(0, (t - p.born) * .9)); g = 1 - Math.pow(1 - g, 3)
      let h = (10 + 86 * sc2) * g * (.8 + p.seed * .35)
      let lean = Math.sin(t * 1.25 + x * .012 + p.d * 4) * (.14 + wet * .08) + s.wind
      const d = Math.hypot(x - s.mx, y - h * .6 - s.my)
      if (d < 150) lean += (x - s.mx) / 150 * (1 - d / 150) * 1.5
      if (s.wave >= 0) { const q = Math.exp(-Math.pow((1 - p.d - s.wave + .2) * 6, 2)); h *= 1 + q * .75; p.kick = Math.max(p.kick, q) }
      p.kick *= .94
      const path = p.seed > .55 ? dark : light
      const blades = sc2 > .3 ? 5 : 3, top = lean * h
      for (let b = 0; b < blades; b++) {
        const o = (b - (blades - 1) / 2) / blades, bh = h * (1 - Math.abs(o) * .55), bw = 1 + sc2 * 5
        const ex = x + top * .9 + o * h * .9, ey = y - bh
        path.moveTo(x - bw, y); path.quadraticCurveTo(x + o * h * .25 + top * .3, y - bh * .7, ex, ey); path.quadraticCurveTo(x + o * h * .35 + top * .3 + bw, y - bh * .55, x + bw, y); path.closePath()
      }
      if (sc2 > .18 && g > .9 && p.seed > .25) { const r = 1.6 + sc2 * 4; heads.moveTo(x + top + r, y - h * 1.03); heads.arc(x + top, y - h * 1.03, r, 0, 7) }
      if (p.bloom > 0) live.push({ x: x + top, y: y - h, r: (4 + sc2 * 16) * Math.min(1, p.bloom), a: t * .6 + p.seed * 6 })
      else if (s.click && Math.hypot(x - s.click.x, y - s.click.y) < 110 + sc2 * 60) p.bloom = .01
      if (p.bloom > 0 && p.bloom < 1) p.bloom = Math.min(1, p.bloom + dt * 3)
    }
    s.click = null
    c.fillStyle = LEAF2; c.fill(light); c.fillStyle = LEAF; c.fill(dark); c.strokeStyle = INK; c.lineWidth = .5; c.stroke(dark)
    c.fillStyle = CLAY; c.fill(heads)
    // marigolds left by clicks
    for (const b of live) {
      c.fillStyle = GOLD; c.strokeStyle = INK; c.lineWidth = .8
      c.beginPath(); for (let i = 0; i < 16; i++) { const a = b.a + i / 16 * 6.283, r = b.r * (i % 2 ? .62 : 1); c[i ? 'lineTo' : 'moveTo'](b.x + Math.cos(a) * r, b.y + Math.sin(a) * r) } c.closePath(); c.fill(); c.stroke()
      c.fillStyle = CLAY; c.beginPath(); c.arc(b.x, b.y, b.r * .32, 0, 7); c.fill()
    }
    // thrown seed
    for (const q of s.seeds) { q.vy += 620 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.l -= dt; c.fillStyle = INK; c.beginPath(); c.ellipse(q.x, q.y, 3, 1.7, q.x * .1, 0, 7); c.fill() }
    s.seeds = s.seeds.filter(q => q.l > 0)

    // rain, in proportion to the season's real rainfall
    const nRain = Math.round(wet * 150)
    while (s.rain.length < nRain) s.rain.push({ x: Math.random() * W, y: Math.random() * H, v: 500 + Math.random() * 300 })
    s.rain.length = nRain
    c.strokeStyle = 'rgba(52,92,108,.55)'; c.lineWidth = 1.1; c.beginPath()
    for (const d of s.rain) { d.y += d.v * dt; d.x += (s.wind * 60 - 30) * dt; if (d.y > H) { d.y = -20; d.x = Math.random() * W }; if (d.x < 0) d.x += W; if (d.y < hz && d.x < W * .56) continue; c.moveTo(d.x, d.y); c.lineTo(d.x - 3 - s.wind * 8, d.y + 15) }
    c.stroke()

    // caption tag
    c.font = '500 10.5px Inter, sans-serif'; c.fillStyle = 'rgba(23,38,27,.72)'; c.textAlign = 'right'
    c.fillText(`${sc.district.toUpperCase()} · ${sc.season.toUpperCase()} NORMAL RAIN ${Math.round(rainMm)} MM`, W - 18, 22)
    c.textAlign = 'left'
  }, [])

  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  return <canvas ref={ref} className="field-canvas"
    onPointerMove={e => { const [x, y] = pos(e); st.current.mx = x; st.current.my = y }}
    onPointerLeave={() => { st.current.mx = -999; st.current.my = -999 }}
    onPointerDown={e => {
      const [x, y] = pos(e), s = st.current
      if (y < s.hz) return
      s.click = { x, y }
      for (let i = 0; i < 16; i++) s.seeds.push({ x, y: y - 8, vx: (Math.random() - .5) * 260, vy: -220 - Math.random() * 220, l: .9 })
    }} aria-label="Animated field drawn from your farm details. Click the soil to make it bloom." role="img" />
}
