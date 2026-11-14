import { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../ui/motion'
import Plant from '../ui/Plant'
import { CROPS, CROP_BY_ID } from '../data/crops'
import { DISTRICTS, DISTRICT_NAMES } from '../data/districts'
import { PUMP_LPH_PER_HP, IRR_EFF, MONTHS, inr } from '../lib/core'
import { SEASON_SHAPE } from '../data/market'

const Lab = ({ title, tag = 'Try it', children }) => <div className="lab"><div className="lab-h"><b>{title}</b><span>{tag}</span></div><div className="lab-b">{children}</div></div>
const Seg = ({ items, value, onChange }) => <div className="seg">{items.map(([v, l]) => <button key={v} className={`chip ${v === value ? 'on' : ''}`} onClick={() => onChange(v)}>{l}</button>)}</div>
const Ctl = ({ label, value, show, min, max, step = 1, onChange }) => <label className="ctl"><span>{label}</span><output>{show ?? value}</output><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>

// ---------- 1 · soil race ----------
const SOILS = [
  { n: 'Red sandy loam', c: '#B5613A', rate: 25, awc: 90, note: 'Drains in hours. Water often, in small amounts.' },
  { n: 'Laterite', c: '#96492B', rate: 18, awc: 100, note: 'Porous and acidic. Needs organic matter to hold anything.' },
  { n: 'Red loamy', c: '#9C5A3C', rate: 12, awc: 130, note: 'The balanced one. Holds enough and still breathes.' },
  { n: 'Black cotton', c: '#3A322C', rate: 3, awc: 190, note: 'Holds water for weeks, cracks when dry, floods if over-watered.' },
]
function SoilRace() {
  const [sel, setSel] = useState(3), [go, setGo] = useState(1)
  const clock = useRef({ h: 0 }), [h, setH] = useState(0)
  useEffect(() => { clock.current.h = 0; setH(0) }, [go])
  const ref = useCanvas((c, W, H, t, dt) => {
    const k = clock.current; k.h = Math.min(36, k.h + dt * 7)
    if (Math.floor(k.h * 2) !== Math.floor((k.h - dt * 7) * 2)) setH(k.h)
    c.clearRect(0, 0, W, H)
    const n = SOILS.length, gap = 12, cw = (W - gap * (n + 1)) / n, top = 46, soilH = H - top - 30
    SOILS.forEach((s, i) => {
      const x = gap + i * (cw + gap), hrs = 100 / s.rate, p = Math.min(1, k.h / hrs), depthM = 100 / s.awc, front = p * Math.min(1, depthM / 1.2) * soilH
      c.fillStyle = s.c; c.fillRect(x, top, cw, soilH)
      c.fillStyle = 'rgba(255,240,210,.22)'
      for (let q = 0; q < 90; q++) c.fillRect(x + (q * 37.7) % cw, top + (q * 61.3) % soilH, 2, 2)
      // wetted zone with a wavy leading edge
      c.fillStyle = 'rgba(20,50,70,.5)'; c.beginPath(); c.moveTo(x, top)
      for (let u = 0; u <= cw; u += 6) c.lineTo(x + u, top + front + (front > 2 ? Math.sin(u * .09 + t * 2 + i) * 4 : 0))
      c.lineTo(x + cw, top); c.fill()
      // ponded water on top
      const pond = (1 - p) * 22
      c.fillStyle = '#4F8496'; c.fillRect(x, top - pond, cw, pond)
      if (p < 1) { c.strokeStyle = 'rgba(79,132,150,.8)'; c.lineWidth = 1.5; for (let d = 0; d < 7; d++) { const dx = x + (d + .5) * cw / 7, yy = (t * 300 + d * 91) % (top - pond); c.beginPath(); c.moveTo(dx, yy); c.lineTo(dx, yy + 7); c.stroke() } }
      c.strokeStyle = '#171A17'; c.lineWidth = i === sel ? 3 : 1.2; c.strokeRect(x, top - 24, cw, soilH + 24)
      c.fillStyle = '#171A17'; c.font = '500 11px Inter'; c.textAlign = 'center'
      c.fillText(p >= 1 ? `DONE ${hrs < 10 ? hrs.toFixed(1) : Math.round(hrs)} H` : 'SOAKING', x + cw / 2, H - 10)
    })
    c.textAlign = 'left'
    if (k.h >= 36) return false
  }, [go, sel])
  const s = SOILS[sel], fits = CROPS.filter(c => c.good.includes(s.n)).map(c => c.name.split(' (')[0])
  return <Lab title="The soil race" tag="Pour 100 mm on four soils">
    <Seg items={SOILS.map((x, i) => [i, x.n])} value={sel} onChange={setSel} />
    <canvas ref={ref} style={{ height: 300 }} role="img" aria-label="Water soaking into four soil types at different speeds" />
    <div className="cta-row" style={{ marginTop: 10 }}><button className="btn sm" onClick={() => setGo(g => g + 1)}>Pour again</button><span className="mono" style={{ fontSize: 13 }}>{Math.round(h)} h elapsed</span></div>
    <div className="read"><div><span>Soaks in at</span><b>{s.rate} mm/h</b></div><div><span>Holds per metre</span><b>{s.awc} mm</b></div><div><span>100 mm wets</span><b>{Math.round(100 / s.awc * 100)} cm deep</b></div></div>
    <div className="verdict-line"><b>{s.note}</b> Good here: {fits.join(', ') || 'few of our crops'}.</div>
    <p className="lab-note">Typical textbook ranges. Your plot will differ, which is why the Soil Health Card matters.</p>
  </Lab>
}

// ---------- 2 · irrigation ----------
function WaterLab() {
  const [m, setM] = useState('flood'), [hp, setHp] = useState(5), [hrs, setHrs] = useState(6)
  const eff = IRR_EFF[m], st = useRef({ d: [], ok: 0, lost: 0 })
  useEffect(() => { st.current = { d: [], ok: 0, lost: 0 } }, [m])
  const [lo, hi] = PUMP_LPH_PER_HP[hp], daily = (lo + hi) / 2 * hrs, reach = daily * eff, mm = reach / 4047
  const ref = useCanvas((c, W, H, t, dt) => {
    const s = st.current, ground = H * .46, rootY = H * .72, nP = 6, px = i => W * (i + .75) / (nP + .5)
    c.clearRect(0, 0, W, H)
    c.fillStyle = '#B9A67A'; c.fillRect(0, ground, W, H - ground)
    c.fillStyle = 'rgba(46,91,58,.13)'; c.fillRect(0, ground, W, rootY - ground)
    c.strokeStyle = '#171A17'; c.setLineDash([5, 5]); c.lineWidth = 1; c.beginPath(); c.moveTo(0, rootY); c.lineTo(W, rootY); c.stroke(); c.setLineDash([])
    c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, ground); c.lineTo(W, ground); c.stroke()
    c.fillStyle = '#171A17'; c.font = '10px Inter'; c.fillText('ROOT ZONE', 8, rootY - 6)
    for (let i = 0; i < nP; i++) {
      const x = px(i); c.strokeStyle = '#1F5A44'; c.lineWidth = 3
      for (let b = -2; b <= 2; b++) { c.beginPath(); c.moveTo(x, ground); c.quadraticCurveTo(x + b * 5, ground - 34, x + b * 13 + Math.sin(t * 1.6 + i) * 3, ground - 46 + Math.abs(b) * 8); c.stroke() }
      c.strokeStyle = '#171A17'; c.lineWidth = .8; for (let b = -3; b <= 3; b++) { c.beginPath(); c.moveTo(x, ground); c.lineTo(x + b * 10, rootY - 16 - Math.abs(b) * 4); c.stroke() }
    }
    if (m === 'drip') { c.strokeStyle = '#171A17'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, ground - 5); c.lineTo(W, ground - 5); c.stroke() }
    const spawnN = Math.ceil(dt * 90)
    for (let k = 0; k < spawnN; k++) {
      const i = Math.floor(Math.random() * nP), good = Math.random() < eff, x = px(i)
      const fate = good ? 'root' : Math.random() < .5 ? 'air' : 'deep'
      if (m === 'flood') s.d.push({ x: Math.random() * W * .08, y: ground - 3, vx: 150 + Math.random() * 200, vy: 0, tx: x, fate, ph: 0 })
      else if (m === 'sprinkler') { const a = -1.25 - Math.random() * .6; s.d.push({ x: W / 2, y: ground - 70, vx: (x - W / 2) * 1.05, vy: Math.sin(a) * 170, tx: x, fate, ph: 0, arc: true }) }
      else s.d.push({ x, y: ground - 4, vx: 0, vy: 40, tx: x, fate, ph: 0 })
    }
    if (m === 'sprinkler') { c.fillStyle = '#171A17'; c.fillRect(W / 2 - 2, ground - 70, 4, 70) }
    for (const d of s.d) {
      d.ph += dt
      if (d.arc && d.y < ground - 2) { d.vy += 520 * dt; d.x += d.vx * dt; d.y += d.vy * dt }
      else if (m === 'flood' && d.x < d.tx && d.fate !== 'air') { d.x += d.vx * dt }
      else if (d.fate === 'air') { d.y -= 70 * dt; d.x += Math.sin(d.ph * 8) * .8; if (d.y < 4) d.dead = 'lost' }
      else if (d.fate === 'deep') { d.y += 150 * dt; if (d.y > H) d.dead = 'lost' }
      else { d.y += 90 * dt; if (d.y > rootY - 14) d.dead = 'ok' }
      c.fillStyle = d.fate === 'air' ? '#B8862F' : d.fate === 'deep' ? '#B4532A' : '#2F7FA0'
      c.beginPath(); c.arc(d.x, d.y, 2.6, 0, 7); c.fill()
    }
    s.ok += s.d.filter(d => d.dead === 'ok').length; s.lost += s.d.filter(d => d.dead === 'lost').length; s.d = s.d.filter(d => !d.dead).slice(-400)
    c.font = '11px Inter'; c.textAlign = 'right'; c.fillStyle = '#171A17'
    c.fillText(`AT THE ROOTS ${s.ok}  ·  WASTED ${s.lost}`, W - 8, 16); c.textAlign = 'left'
  }, [m, eff])
  return <Lab title="Where does the water go?" tag="Pick a method">
    <Seg items={[['flood', 'Flood'], ['sprinkler', 'Sprinkler'], ['drip', 'Drip']]} value={m} onChange={setM} />
    <canvas ref={ref} style={{ height: 270 }} role="img" aria-label={`${m} irrigation, ${Math.round(eff * 100)} percent of water reaches the roots`} />
    <p className="lab-note"><b style={{ color: '#2F7FA0' }}>Blue</b> reaches roots · <b style={{ color: '#B98A12' }}>gold</b> evaporates · <b style={{ color: 'var(--clay)' }}>red</b> sinks below the roots</p>
    <div className="lab-row">
      <div><Ctl label="Pump size" value={hp} show={`${hp} HP`} min={1} max={10} step={.5} onChange={v => setHp(PUMP_LPH_PER_HP[v] ? v : hp)} /><Ctl label="Hours a day" value={hrs} min={1} max={12} onChange={setHrs} /></div>
      <div className="read"><div><span>Pumped per day</span><b>{Math.round(daily).toLocaleString('en-IN')} L</b></div><div><span>Reaches roots</span><b>{Math.round(reach).toLocaleString('en-IN')} L</b></div><div><span>Depth on 1 acre</span><b>{mm.toFixed(1)} mm/day</b></div></div>
    </div>
    <div className="verdict-line">A single 25 mm watering of one acre takes about <b>{(25 * 4047 / ((lo + hi) / 2 * eff)).toFixed(1)} pump-hours</b> with {m}.</div>
  </Lab>
}

// ---------- 3 · season wheel ----------
const SEAS = [['Kharif', 5, 5, '#1F5A44'], ['Rabi', 9, 5, '#B8862F'], ['Summer', 1, 4, '#B4532A']]
const START = { kharif: 5, rabi: 9, summer: 1 }
function SeasonWheel() {
  const [dist, setDist] = useState('Mysuru'), [m, setM] = useState(new Date().getMonth()), [play, setPlay] = useState(false), drag = useRef(false), svg = useRef()
  useEffect(() => { if (!play) return; const i = setInterval(() => setM(x => (x + 1) % 12), 900); return () => clearInterval(i) }, [play])
  const d = DISTRICTS[dist], mx = Math.max(...d.monthly)
  const fromEv = (e) => { const r = svg.current.getBoundingClientRect(), a = Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) + Math.PI / 2; setM(Math.floor(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 12)) }
  const P = (r, a) => [200 + Math.cos(a - Math.PI / 2) * r, 200 + Math.sin(a - Math.PI / 2) * r]
  const arc = (r, m0, len) => { const [x0, y0] = P(r, m0 / 12 * 6.2832), [x1, y1] = P(r, (m0 + len) / 12 * 6.2832 - .03); return `M${x0} ${y0}A${r} ${r} 0 ${len > 6 ? 1 : 0} 1 ${x1} ${y1}` }
  const sow = [], harvest = []
  CROPS.forEach(c => c.seasons.forEach(s => {
    const st = START[s]; if (m === st || m === (st + 1) % 12) sow.push(`${c.name.split(' (')[0]}`)
    const hm = (st + Math.round(c.days / 30)) % 12; if (m === hm) harvest.push(c.name.split(' (')[0])
  }))
  const seasonNow = SEAS.filter(([, s, l]) => ((m - s + 12) % 12) < l).map(x => x[0]).join(' / ') || 'Off-season'
  const na = (m + .5) / 12 * 6.2832, [nx, ny] = P(148, na)
  return <Lab title="The farming year" tag="Drag the sun around">
    <div className="lab-row">
      <svg ref={svg} viewBox="0 0 400 400" className="wheel" role="img" aria-label={`Year wheel for ${dist}, ${MONTHS[m]} selected`}
        onPointerDown={e => { drag.current = true; setPlay(false); e.currentTarget.setPointerCapture(e.pointerId); fromEv(e) }} onPointerMove={e => drag.current && fromEv(e)} onPointerUp={() => { drag.current = false }}>
        {MONTHS.map((n, i) => { const a0 = (i + .5) / 12 * 6.2832, h = 8 + d.monthly[i] / mx * 56, [x0, y0] = P(70, a0), [x1, y1] = P(70 + h, a0), [lx, ly] = P(188, a0)
          return <g key={n}><line x1={x0} y1={y0} x2={x1} y2={y1} stroke={i === m ? '#171A17' : '#4F8496'} strokeWidth="13" strokeLinecap="round" style={{ transition: 'all .5s' }} /><text x={lx} y={ly + 4} textAnchor="middle" fontSize="12" fill="#171A17" fontWeight={i === m ? 700 : 400}>{n}</text></g> })}
        {SEAS.map(([n, s, l, col], i) => <path key={n} d={arc(150 + i * 0, s, l)} stroke={col} strokeWidth={8} fill="none" opacity={1} transform={`scale(${1 - i * .03})`} style={{ transformOrigin: '200px 200px' }} />)}
        <line x1="200" y1="200" x2={nx} y2={ny} stroke="#171A17" strokeWidth="1.5" strokeDasharray="3 4" />
        <circle cx={nx} cy={ny} r="15" fill="#B8862F" stroke="#171A17" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="54" fill="#FFFFFF" stroke="#171A17" strokeWidth="1.5" />
        <text x="200" y="196" textAnchor="middle" fontSize="22" style={{ fontFamily: 'var(--serif)' }} fill="#171A17">{d.monthly[m]} mm</text>
        <text x="200" y="215" textAnchor="middle" fontSize="10" fill="#7C827B">NORMAL RAIN</text>
      </svg>
      <div>
        <select className="sel" style={{ marginTop: 0 }} value={dist} onChange={e => setDist(e.target.value)} aria-label="district">{DISTRICT_NAMES.map(n => <option key={n}>{n}</option>)}</select>
        <div className="read"><div><span>Month</span><b>{MONTHS[m]}</b></div><div><span>Season</span><b>{seasonNow}</b></div></div>
        <div style={{ marginTop: 14 }}><span className="eyebrow">Can be sown now</span><p style={{ fontSize: 14.5 }}>{[...new Set(sow)].join(', ') || 'Nothing in the main sowing windows.'}</p></div>
        <div style={{ marginTop: 10 }}><span className="eyebrow">Coming to harvest</span><p style={{ fontSize: 14.5 }}>{[...new Set(harvest)].join(', ') || 'No main harvests.'}</p></div>
        <div className="cta-row" style={{ marginTop: 12 }}><button className="btn sm" onClick={() => setPlay(p => !p)}>{play ? 'Pause' : 'Play the year'}</button></div>
        <p className="lab-note">Ring: <b style={{ color: 'var(--leaf)' }}>Kharif</b>, <b style={{ color: '#B98A12' }}>Rabi</b>, <b style={{ color: 'var(--clay)' }}>Summer</b>. Blue spokes: monthly rain.</p>
      </div>
    </div>
  </Lab>
}

// ---------- 4 · spacing ----------
const SP = { maize: [60, 20], ragi: [25, 10], tur: [120, 30], sunflower: [60, 30] }
function Spacing() {
  const [id, setId] = useState('maize'), [k, setK] = useState(1), [row, pl] = SP[id]
  const r = row * k, p = pl * k, view = row * 6, plants = 40470000 / (r * p), rel = Math.max(.2, 1 - .9 * Math.pow(Math.log(k), 2))
  const cells = []; for (let y = p / 2; y < view; y += p) for (let x = r / 2; x < view; x += r) cells.push([x, y])
  const can = row * .52, crowded = k < .78, sparse = k > 1.35
  return <Lab title="Spacing is yield" tag="Top view of the field">
    <Seg items={Object.keys(SP).map(c => [c, CROP_BY_ID[c].name.split(' (')[0]])} value={id} onChange={(v) => { setId(v); setK(1) }} />
    <div className="lab-row">
      <svg viewBox={`0 0 ${view} ${view}`} style={{ width: '100%', background: '#C9B98F', borderRadius: 14, overflow: 'hidden' }} role="img" aria-label={`Plants spaced ${Math.round(r)} by ${Math.round(p)} centimetres`}>
        {cells.slice(0, 900).map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r={can} fill={crowded ? '#8A5A2B' : '#1F5A44'} opacity=".42" /><circle cx={x} cy={y} r={view * .006} fill="#171A17" /></g>)}
      </svg>
      <div>
        <Ctl label="Spacing vs recommended" value={k} show={`${Math.round(k * 100)}%`} min={.5} max={2} step={.05} onChange={setK} />
        <div className="read"><div><span>Rows × plants</span><b>{Math.round(r)} × {Math.round(p)} cm</b></div><div><span>Plants / acre</span><b>{Math.round(plants).toLocaleString('en-IN')}</b></div><div><span>Yield (illustrative)</span><b>{Math.round(rel * 100)}%</b></div></div>
        <div className="verdict-line">{crowded ? 'Leaves overlap and stay wet. Plants compete for light and disease moves fast.' : sparse ? 'Bare soil between plants invites weeds and wastes land you paid for.' : 'Close to the recommended spacing. Canopy closes without crowding.'}</div>
      </div>
    </div>
    <p className="lab-note">Plants per acre is exact arithmetic. The yield curve is an illustration of the shape, not a measurement.</p>
  </Lab>
}

// ---------- 5 · nutrients ----------
function Nutrients() {
  const [n, setN] = useState(100), [p, setP] = useState(100), [k, setK] = useState(100), [split, setSplit] = useState(false)
  const f = x => x <= 100 ? .35 + .65 * x / 100 : 1 - .3 * (x - 100) / 100
  const rel = Math.min(f(n), f(p), f(k)), notes = []
  if (n < 65) notes.push('Low N: older, lower leaves turn pale yellow first.')
  if (n > 145) notes.push('Excess N: soft lush growth, more pests, weak stems that lodge.')
  if (p < 65) notes.push('Low P: weak roots, slow growth, purplish leaves.')
  if (k < 65) notes.push('Low K: leaf edges scorch brown, poor grain filling.')
  if (!notes.length) notes.push('Balanced. Growth, roots and grain all have what they need.')
  return <Lab title="Feed the plant" tag="Drag N, P and K">
    <div className="lab-row">
      <div style={{ background: '#F4F2EC', borderRadius: 14, overflow: 'hidden', maxWidth: 300 }}><Plant g={.86} kind="grass" hue="#B5532F" height={.55 + Math.min(1.5, n / 100) * .42} roots={.3 + Math.min(1.5, p / 100) * .7} fruit={Math.min(1.1, k / 100)} yellow={n < 100 ? (100 - n) / 100 * .85 : 0} purple={p < 65 ? (65 - p) / 65 : 0} scorch={k < 65 ? (65 - k) / 65 : 0} tilt={n > 145 ? (n - 145) * .4 : 0} pests={n > 130 ? (n - 130) / 70 : 0} label="Plant responding to nutrient levels" /></div>
      <div>
        <Ctl label="Nitrogen (N), leaf" value={n} show={`${n}%`} min={0} max={200} step={5} onChange={setN} />
        <Ctl label="Phosphorus (P), root" value={p} show={`${p}%`} min={0} max={200} step={5} onChange={setP} />
        <Ctl label="Potassium (K), grain" value={k} show={`${k}%`} min={0} max={200} step={5} onChange={setK} />
        <div className="read"><div><span>Yield (illustrative)</span><b>{Math.round(rel * 100)}%</b></div></div>
        <div className="verdict-line">{notes.map(x => <div key={x}>{x}</div>)}</div>
      </div>
    </div>
    <div style={{ marginTop: 16 }}>
      <Seg items={[[false, 'One big urea dose'], [true, 'Split in three']]} value={split} onChange={setSplit} />
      <div className="bar" style={{ height: 22 }}><i style={{ width: split ? '55%' : '33%', transition: 'width .8s cubic-bezier(.3,1.5,.5,1)' }} /></div>
      <p className="lab-note">About {split ? '55' : '33'}% of the applied nitrogen reaches the crop in this rough example. The rest is lost to air and water. The crop takes the smallest of the three, so the yield here follows the scarcest nutrient.</p>
    </div>
  </Lab>
}

// ---------- 6 · scouting ----------
const COLS = 18, ROWS = 11
function Scout() {
  const [round, setRound] = useState(1), [step, setStep] = useState(0), [choice, setChoice] = useState(null)
  const data = useMemo(() => {
    const rate = [.03, .22, .07, .16, .04, .28][round % 6], cells = Array.from({ length: COLS * ROWS }, (_, i) => Math.abs(Math.sin(i * 91.7 + round * 37.1)) % 1 < rate)
    const path = Array.from({ length: 20 }, (_, i) => { const q = i / 19 * 4, tri = q % 2 < 1 ? q % 2 : 2 - q % 2, wave = Math.floor(q) % 2 === 0 ? tri : tri; return [Math.round(i / 19 * (COLS - 1)), Math.round(wave * (ROWS - 1))] })
    return { cells, path, truth: cells.filter(Boolean).length / cells.length * 100 }
  }, [round])
  const idx = (c, r) => r * COLS + c, seen = data.path.slice(0, step), hits = seen.filter(([c, r]) => data.cells[idx(c, r)]).length, done = step >= 20, pct = hits / 20 * 100
  useEffect(() => { if (step === 0 || step >= 20) return; const t = setTimeout(() => setStep(s => s + 1), 230); return () => clearTimeout(t) }, [step])
  const [wx, wy] = data.path[Math.max(0, Math.min(19, step - 1))], should = data.truth >= 10
  const reset = () => { setRound(r => r + 1); setStep(0); setChoice(null) }
  return <Lab title="Scout, then decide" tag="Walk the W">
    <svg viewBox={`0 0 ${COLS * 30} ${ROWS * 30}`} className="scout" style={{ width: '100%', background: '#C9B98F', borderRadius: 14, overflow: 'hidden' }} role="img" aria-label="Field grid with sampled plants">
      {Array.from({ length: ROWS }).flatMap((_, r) => Array.from({ length: COLS }, (_, c) => {
        const inf = data.cells[idx(c, r)], sampled = seen.some(([a, b]) => a === c && b === r), reveal = choice !== null
        return <g key={`${c}-${r}`}><circle cx={c * 30 + 15} cy={r * 30 + 15} r={sampled ? 12 : 9} fill={(sampled || reveal) && inf ? '#B4532A' : sampled ? '#9DB8A8' : '#1F5A44'} opacity={sampled || reveal ? 1 : .55} style={{ transition: 'all .25s' }} /></g>
      }))}
      {step > 0 && <circle className="walker" cx={wx * 30 + 15} cy={wy * 30 + 15} r="7" fill="#B8862F" stroke="#171A17" strokeWidth="2" />}
    </svg>
    <div className="read"><div><span>Plants checked</span><b>{Math.min(step, 20)} / 20</b></div><div><span>Damaged</span><b>{hits}</b></div><div><span>Your sample</span><b>{pct.toFixed(0)}%</b></div><div><span>Act at</span><b>10%</b></div></div>
    <div className="cta-row" style={{ marginTop: 14 }}>
      {step === 0 && <button className="btn sm" onClick={() => setStep(1)}>Walk the field</button>}
      {done && choice === null && <><button className="btn sm" onClick={() => setChoice(true)}>Spray</button><button className="btn sm ghost" onClick={() => setChoice(false)}>Do not spray</button></>}
      {choice !== null && <button className="btn sm ghost" onClick={reset}>New field</button>}
    </div>
    {choice !== null && <div className="verdict-line"><b>{choice === should ? 'Right call.' : choice ? 'That spray was not needed.' : 'You let it spread.'}</b> True damage across the field was {data.truth.toFixed(0)}%, {should ? 'above' : 'below'} the 10% line. A 20-plant walk gets you close without checking all {COLS * ROWS}.</div>}
    <p className="lab-note">Thresholds differ by pest and crop. 10% is an example; the Doctor tab lists specifics.</p>
  </Lab>
}

// ---------- 7 · drying ----------
const DRY = { groundnut: [38, 8], maize: [28, 14], paddy: [24, 14], ragi: [22, 12] }
function Drying() {
  const [id, setId] = useState('groundnut'), [day, setDay] = useState(0), [bag, setBag] = useState(null)
  const [m0, safe] = DRY[id], M = d => (safe - 3) + (m0 - safe + 3) * Math.exp(-.42 * d), now = M(day), ok = now <= safe + .05
  useEffect(() => { setBag(null); setDay(0) }, [id])
  const stRef = useRef(0); useEffect(() => { stRef.current = 0 }, [bag])
  const ref = useCanvas((c, W, H, t, dt) => {
    c.clearRect(0, 0, W, H)
    if (bag === null) {
      c.fillStyle = '#CFC2A0'; c.fillRect(0, 0, W, H)
      const q = Math.min(1, (m0 - now) / (m0 - safe))
      for (let i = 0; i < 900; i++) { const x = (i * 47.31) % W, y = (i * 83.17) % H; c.fillStyle = `rgb(${90 + q * 120},${70 + q * 95},${40 + q * 45})`; c.beginPath(); c.ellipse(x, y, 5, 3.2, i, 0, 7); c.fill() }
      c.fillStyle = 'rgba(217,154,30,.13)'; c.fillRect(0, 0, W, H)
      for (let i = 0; i < 16 * (1 - q); i++) { const x = (i * 73) % W, y = H - ((t * 40 + i * 53) % H); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 10, y - 14, x, y - 28); c.stroke() }
      return
    }
    stRef.current = Math.min(60, stRef.current + dt * 12); const d = stRef.current
    c.fillStyle = '#E3D6B7'; c.fillRect(0, 0, W, H)
    const bx = W / 2 - 80, by = 24, bw = 160, bh = H - 48
    c.fillStyle = '#C8AE7C'; c.strokeStyle = '#171A17'; c.lineWidth = 2; c.beginPath(); c.roundRect(bx, by, bw, bh, 18); c.fill(); c.stroke()
    const over = Math.max(0, bag - safe), n = Math.round(Math.min(1, d / 60 * over / 6) * 150)
    for (let i = 0; i < n; i++) { const r = 3 + (i % 8); c.fillStyle = i % 3 ? 'rgba(52,84,62,.82)' : 'rgba(30,40,30,.9)'; c.beginPath(); c.arc(bx + 14 + (i * 41.7) % (bw - 28), by + 14 + (i * 67.3) % (bh - 28), r, 0, 7); c.fill() }
    c.fillStyle = '#171A17'; c.font = '13px Inter'; c.textAlign = 'center'; c.fillText(`DAY ${Math.round(d)} IN STORE`, W / 2, H - 6); c.textAlign = 'left'
    if (d >= 60) return false
  }, [bag, id, day])
  const W = 300, H = 130, ptX = d => 34 + d / 8 * (W - 44), ptY = v => 10 + (1 - v / 42) * (H - 34)
  const curve = Array.from({ length: 33 }, (_, i) => `${i ? 'L' : 'M'}${ptX(i / 4).toFixed(1)} ${ptY(M(i / 4)).toFixed(1)}`).join('')
  return <Lab title="Dry it before you bag it" tag="Sun-drying time-lapse">
    <Seg items={Object.keys(DRY).map(c => [c, CROP_BY_ID[c].name.split(' (')[0]])} value={id} onChange={setId} />
    <div className="lab-row">
      <canvas ref={ref} style={{ height: 240 }} role="img" aria-label={bag === null ? `Grain drying, moisture ${now.toFixed(1)} percent` : 'Stored bag time-lapse'} />
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }} role="img" aria-label="Moisture falling over days">
          <line x1="34" x2={W - 10} y1={ptY(safe)} y2={ptY(safe)} stroke="#B4532A" strokeDasharray="4 3" /><text x={W - 10} y={ptY(safe) - 4} textAnchor="end" fontSize="9.5" fontFamily="Inter" fill="#B4532A">SAFE {safe}%</text>
          <path d={curve} fill="none" stroke="#1F5A44" strokeWidth="2" />
          <circle cx={ptX(day)} cy={ptY(now)} r="6" fill="#B8862F" stroke="#171A17" style={{ transition: 'all .25s' }} />
          <text x="34" y={H - 8} fontSize="9.5" fontFamily="Inter" fill="#7C827B">DAY 0</text><text x={W - 10} y={H - 8} textAnchor="end" fontSize="9.5" fontFamily="Inter" fill="#7C827B">DAY 8</text>
        </svg>
        <Ctl label="Days in the sun" value={day} min={0} max={8} step={.5} onChange={(v) => { setDay(v); setBag(null) }} />
        <div className="read"><div><span>Moisture</span><b>{now.toFixed(1)}%</b></div><div><span>Safe below</span><b>{safe}%</b></div></div>
        <div className="cta-row" style={{ marginTop: 10 }}><button className="btn sm" onClick={() => setBag(now)}>Bag it and store 60 days</button></div>
        {bag !== null && <div className="verdict-line">{bag <= safe + .05 ? 'Dry enough. The bag stays clean through storage.' : 'Too wet. Mould spreads through the bag, and in groundnut and maize it can produce aflatoxin, which makes grain unsaleable.'}</div>}
      </div>
    </div>
    <p className="lab-note">Safe moisture levels are standard. Drying speed is an illustration; weather changes it.</p>
  </Lab>
}

// ---------- 8 · sell game ----------
const GAME = { onion: [3, 40, .04], maize: [10, 15, .005], tur: [11, 18, .005], groundnut: [10, 20, .007] }
function SellGame() {
  const [id, setId] = useState('onion'), [t, setT] = useState(0), [sold, setSold] = useState(null), [seed, setSeed] = useState(3)
  const c = CROP_BY_ID[id], [h, cost, loss] = GAME[id], len = 9
  const raw = useMemo(() => { const sh = SEASON_SHAPE[id], av = sh.reduce((a, b) => a + b, 0) / 12; return Array.from({ length: len }, (_, i) => { const noise = 1 + Math.sin(seed * 13.7 + i * 4.3) * (c.pVol * .3); return Math.round(c.price * sh[(h + i) % 12] / av * noise / 10) * 10 }) }, [id, seed])
  const net = raw.map((p, i) => Math.round(p * Math.pow(1 - loss, i) - cost * i)), best = Math.max(...net), bi = net.indexOf(best)
  const reset = (v = id) => { setId(v); setT(0); setSold(null); setSeed(s => s + 1) }
  const final = sold !== null, W = 560, H = 210, mx = Math.max(...raw) * 1.06, mn = Math.min(...raw, ...net) * .92, X = i => 40 + i / (len - 1) * (W - 56), Y = v => 14 + (1 - (v - mn) / (mx - mn)) * (H - 46)
  const upto = final ? (sold + 0) : t
  const line = (arr, end) => arr.slice(0, end + 1).map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('')
  return <Lab title="Sell now or hold?" tag="Play a season">
    <Seg items={Object.keys(GAME).map(k => [k, CROP_BY_ID[k].name.split(' (')[0]])} value={id} onChange={reset} />
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', background: 'var(--card)', borderRadius: 14, overflow: 'hidden' }} role="img" aria-label="Price by month after harvest">
      {[...Array(len)].map((_, i) => <text key={i} x={X(i)} y={H - 10} textAnchor="middle" fontSize="10" fontFamily="Inter" fill={i === upto ? '#171A17' : '#888E87'}>{MONTHS[(h + i) % 12]}</text>)}
      <path d={line(raw, final ? len - 1 : upto)} fill="none" stroke="#9AA08F" strokeWidth="2" strokeDasharray={final ? '' : ''} />
      <path d={line(net, final ? len - 1 : upto)} fill="none" stroke="#1F5A44" strokeWidth="2.4" />
      {!final && <circle cx={X(t)} cy={Y(net[t])} r="7" fill="#B8862F" stroke="#171A17" style={{ transition: 'all .4s' }} />}
      {final && <><circle cx={X(sold)} cy={Y(net[sold])} r="8" fill="#B8862F" stroke="#171A17" /><circle cx={X(bi)} cy={Y(best)} r="8" fill="none" stroke="#B4532A" strokeWidth="2" /></>}
    </svg>
    <p className="lab-note"><b>Grey</b>: mandi price. <b style={{ color: 'var(--leaf)' }}>Green</b>: what you keep per quintal after storage cost (₹{cost}/q/month) and {(loss * 100).toFixed(1)}% monthly weight loss.</p>
    <div className="read"><div><span>Month</span><b>{MONTHS[(h + upto) % 12]}</b></div><div><span>Mandi today</span><b>{inr(raw[upto])}</b></div><div><span>You keep</span><b>{inr(net[upto])}</b></div></div>
    <div className="cta-row" style={{ marginTop: 12 }}>
      {!final && <><button className="btn sm" onClick={() => setSold(t)}>Sell now</button><button className="btn sm ghost" disabled={t >= len - 1} onClick={() => setT(x => x + 1)} style={t >= len - 1 ? { opacity: .4 } : {}}>Hold one more month</button></>}
      {final && <button className="btn sm ghost" onClick={() => reset()}>Play again</button>}
    </div>
    {final && <div className="verdict-line">You kept <b>{inr(net[sold])}</b> a quintal. Selling at harvest would have given {inr(net[0])}. The best month this year was {MONTHS[(h + bi) % 12]} at {inr(best)}, red circle. {id === 'onion' ? 'Onions rot and shrink in store, so holding is only worth it with a ventilated shed.' : 'Pulses and grain store well if dry, so patience tends to pay.'}</div>}
    <p className="lab-note">Practice data built on typical seasonal shapes. Not a price forecast.</p>
  </Lab>
}

export const LABS = { l1: SoilRace, l2: WaterLab, l3: SeasonWheel, l4: Spacing, l5: Nutrients, l6: Scout, l7: Drying, l8: SellGame }
