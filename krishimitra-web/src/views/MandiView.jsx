import { useEffect, useMemo, useRef, useState } from 'react'
import DATA from '../data/mandi.json'
import { CROPS, CROP_BY_ID } from '../data/crops'
import { SEASON_SHAPE, MSP_AT_SNAPSHOT } from '../data/market'
import { inr, MONTHS } from '../lib/core'
import { Reveal, Tween, useSeen } from '../ui/motion'
import { LiveBoard, ForecastPanel } from './MarketAI'
import { api } from '../lib/core'

const { meta, items } = DATA
const NAMES = Object.keys(items).filter(k => items[k].n >= 4)
const rs = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
const FMT = (v) => rs(v)

// ---------- split-flap ----------
const GLYPHS = 'ABCDEFGHIJKLMNOPRSTUVWXYZ0123456789₹'
function Cell({ ch, delay, gold }) {
  const [cur, setCur] = useState(ch), tick = useRef(0)
  useEffect(() => {
    if (cur === ch) return
    let n = 4 + Math.floor(Math.random() * 5), id
    const step = () => { if (n-- > 0) { setCur(GLYPHS[Math.floor(Math.random() * GLYPHS.length)]); tick.current++; id = setTimeout(step, 62) } else { setCur(ch); tick.current++ } }
    id = setTimeout(step, delay)
    return () => clearTimeout(id)
  }, [ch])
  return <span className={`cell ${gold ? 'gold' : ''}`}><b key={tick.current}>{cur === ' ' ? ' ' : cur}</b></span>
}
const Flap = ({ text, len = 24, gold }) => {
  const s = text.toUpperCase().slice(0, len).padEnd(len, ' ')
  return <div className="flaps" aria-label={text}>{s.split('').map((c, i) => <Cell key={i} ch={c} delay={i * 24} gold={gold} />)}</div>
}
const short = (m) => m.market.replace(/\(.*$/, '').replace(/ APMC| Market| Mandi/gi, '').trim()

function Board({ name, item }) {
  const hi = item.markets[0], lo = item.markets[item.markets.length - 1], ka = item.states.Karnataka
  return <div className="board" role="group" aria-label={`Price board for ${name}`}>
    <div className="board-row" style={{ borderTop: 0 }}><span>Commodity</span><Flap text={name} /></div>
    <div className="board-row"><span>Median ₹/q</span><Flap gold text={`${rs(item.median)}  ${item.n} RECORDS`} /></div>
    <div className="board-row"><span>Highest</span><Flap text={`${rs(hi.modal)} ${short(hi)}`} /></div>
    <div className="board-row"><span>Lowest</span><Flap text={`${rs(lo.modal)} ${short(lo)}`} /></div>
    <div className="board-row"><span>Karnataka</span><Flap gold text={ka ? `${rs(ka.median)}  ${ka.n} ${ka.n === 1 ? 'RECORD' : 'RECORDS'}` : 'NOT REPORTED THIS DAY'} /></div>
  </div>
}

// ---------- India tile map ----------
const TILES = [['JK', 'Jammu & Kashmir', 2, 0], ['LA', 'Ladakh', 3, 0], ['PB', 'Punjab', 2, 1], ['HP', 'Himachal Pradesh', 3, 1], ['CH', 'Chandigarh', 2, 2], ['UK', 'Uttarakhand', 3, 2],
  ['RJ', 'Rajasthan', 1, 3], ['HR', 'Haryana', 2, 3], ['DL', 'Delhi', 3, 3], ['UP', 'Uttar Pradesh', 4, 3], ['BR', 'Bihar', 5, 3], ['SK', 'Sikkim', 6, 3], ['AS', 'Assam', 7, 3], ['AR', 'Arunachal Pradesh', 8, 2], ['NL', 'Nagaland', 8, 3],
  ['GJ', 'Gujarat', 1, 4], ['MP', 'Madhya Pradesh', 2, 4], ['CG', 'Chhattisgarh', 3, 4], ['JH', 'Jharkhand', 4, 4], ['WB', 'West Bengal', 5, 4], ['ML', 'Meghalaya', 7, 4], ['MN', 'Manipur', 8, 4],
  ['MH', 'Maharashtra', 2, 5], ['TS', 'Telangana', 3, 5], ['OD', 'Odisha', 4, 5], ['TR', 'Tripura', 7, 5], ['MZ', 'Mizoram', 8, 5],
  ['GA', 'Goa', 1, 6], ['KA', 'Karnataka', 2, 6], ['AP', 'Andhra Pradesh', 3, 6], ['KL', 'Kerala', 2, 7], ['TN', 'Tamil Nadu', 3, 7], ['PY', 'Puducherry', 4, 7]]
const lerp = (a, b, t) => Math.round(a + (b - a) * t)
const seq = (t) => `rgb(${lerp(221, 31, t)},${lerp(228, 74, t)},${lerp(198, 44, t)})`

function IndiaMap({ name, item, state, setState }) {
  const vals = Object.values(item.states).map(s => s.median), mn = Math.min(...vals), mx = Math.max(...vals)
  const ladder = Object.entries(item.states).sort((a, b) => b[1].median - a[1].median)
  const s = item.states[state], inState = item.markets.filter(m => m.state === state).slice(0, 6)
  const [hov, setHov] = useState(null)
  return <div className="mgrid">
    <div>
      <div className="tiles" key={name}>
        {TILES.map(([ab, full, c, r]) => {
          const d = item.states[full], t = mx > mn && d ? (d.median - mn) / (mx - mn) : .5
          const style = { gridColumn: c + 1, gridRow: r + 1, animationDelay: `${(Math.abs(c - 2) + Math.abs(r - 6)) * 60}ms` }
          if (!d) return <div key={ab} className="t none flipwave" style={style} title={`${full}: no record`}>{ab}</div>
          return <button key={ab} className={`t flipwave ${state === full ? 'sel' : ''}`} style={{ ...style, background: seq(t), color: t > .5 ? '#FFFFFF' : '#171A17' }} onClick={() => setState(full)} onPointerEnter={() => setHov(full)} onPointerLeave={() => setHov(null)} aria-label={`${full}: median ${rs(d.median)} per quintal`}>{ab}</button>
        })}
      </div>
      <div className="ramp"><span>{rs(mn)}</span><i /><span>{rs(mx)}</span><span style={{ marginLeft: 10, color: 'var(--ink-3)' }}>{hov ? `${hov}: ${rs(item.states[hov].median)}` : 'median modal ₹/q'}</span></div>
    </div>
    <div>
      {s ? <div className="fade-in" key={name + state}>
        <div className="eyebrow">{state}</div>
        <div className="num" style={{ fontSize: 58, lineHeight: 1.05, marginTop: 4 }}><Tween to={s.median} fmt={FMT} /><span style={{ fontSize: 16, color: 'var(--ink-3)' }}> /quintal</span></div>
        <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>{s.n} records · from {rs(s.lo)} to {rs(s.hi)} · best at {s.best}</p>
        {inState.length > 0 && <div style={{ marginTop: 10 }}>{inState.map((m, i) => <div className="ladder-row" key={i} style={{ gridTemplateColumns: '1fr auto' }}><span>{short(m)}, {m.district} <span style={{ color: 'var(--ink-3)' }}>· {m.variety}</span></span><span>{rs(m.modal)}</span></div>)}</div>}
      </div> : <p className="serif" style={{ fontSize: 22 }}>{state} did not report {name} on this day. Pick a coloured state.</p>}
      <div className="eyebrow" style={{ marginTop: 20, marginBottom: 6 }}>Every reporting state, highest first</div>
      {ladder.slice(0, 10).map(([st, d]) => <button key={st} className={`ladder-row ${st === 'Karnataka' ? 'ka' : ''}`} onClick={() => setState(st)}><span>{st}</span><i style={{ width: `${d.median / mx * 100}%` }} /><span>{rs(d.median)}</span></button>)}
    </div>
  </div>
}

// ---------- truck ----------
const cut = (t, n = 34) => t.length > n ? t.slice(0, n - 1) + '…' : t
function Truck({ name, item }) {
  const list = item.markets
  const kaFirst = list.findIndex(m => m.state === 'Karnataka')
  const NEAR = new Set(['Karnataka', 'Tamil Nadu', 'Maharashtra', 'Andhra Pradesh', 'Telangana', 'Kerala'])
  const farPick = (ms, nearIdx) => { const i = ms.findIndex((m, k) => k !== nearIdx && NEAR.has(m.state)); return i >= 0 ? i : 0 }
  const [a, setA] = useState(kaFirst >= 0 ? kaFirst : list.length - 1), [b, setB] = useState(() => farPick(list, kaFirst))
  const [q, setQ] = useState(30), [nd, setNd] = useState(15), [fd, setFd] = useState(180), [rate, setRate] = useState(1.5)
  useEffect(() => { const k = item.markets.findIndex(m => m.state === 'Karnataka'); setA(k >= 0 ? k : item.markets.length - 1); setB(farPick(item.markets, k)) }, [name])
  const near = list[a] || list[0], far = list[b] || list[0], fee = 30
  const nn = near.modal - rate * nd - fee, fn = far.modal - rate * fd - fee, worth = fn > nn, be = (far.modal - near.modal) / rate + nd
  const mx = Math.max(near.modal, far.modal, 1), W = 760, tx = 90 + Math.min(1, fd / 800) * (W - 190)
  const opt = (m, i) => <option key={i} value={i}>{short(m)}, {m.state} · {rs(m.modal)}</option>
  return <div className="mgrid">
    <div>
      <svg viewBox="0 0 420 150" className="road" role="img" aria-label={`Route: ${nd} km to ${short(near)}, ${fd} km to ${short(far)}`}>
        {(() => { const x0 = 34, x1 = 386, pos = d => x0 + Math.sqrt(Math.min(1, d / 800)) * (x1 - x0), xn = pos(nd), xf = pos(fd)
          return <g fontFamily="Inter">
            <line x1={x0} x2={x1} y1="70" y2="70" stroke="#171A17" strokeOpacity=".1" strokeWidth="2" strokeLinecap="round" />
            <line key={`${fd}-${b}-${name}`} x1={x0} x2={xf} y1="70" y2="70" stroke="#1F5A44" strokeWidth="3" strokeLinecap="round" className="drawline" pathLength="1" />
            <circle cx={x0} cy="70" r="7" fill="#171A17" />
            <circle cx={xn} cy="70" r="6" fill="#FFFFFF" stroke="#888E87" strokeWidth="2" />
            <circle cx={xf} cy="70" r="8" fill="#1F5A44" stroke="#FFFFFF" strokeWidth="3" />
            <text x={x0} y="36" fontSize="11.5" fill="#888E87">Distance from your farm, {q} quintals on the truck</text>
            <circle cx={x0 + 4} cy="110" r="4" fill="#888E87" /><text x={x0 + 14} y="114" fontSize="12" fill="#4B524C">Near · {cut(short(near))} · {nd} km</text>
            <circle cx={x0 + 4} cy="132" r="4" fill="#1F5A44" /><text x={x0 + 14} y="136" fontSize="12" fontWeight="600" fill="#1F5A44">Far · {cut(short(far))} · {fd} km</text>
          </g> })()}
      </svg>
      <label className="ctl"><span>Nearby market</span><select className="sel" style={{ gridColumn: '1/-1', marginTop: 0, fontSize: 15, padding: 8 }} value={a} onChange={e => setA(Number(e.target.value))}>{list.map(opt)}</select></label>
      <label className="ctl"><span>Far market</span><select className="sel" style={{ gridColumn: '1/-1', marginTop: 0, fontSize: 15, padding: 8 }} value={b} onChange={e => setB(Number(e.target.value))}>{list.map(opt)}</select></label>
    </div>
    <div>
      {[['Load (quintals)', q, setQ, 5, 100, 5, `${q} q`], ['Distance to nearby market', nd, setNd, 2, 80, 1, `${nd} km`], ['Distance to far market', fd, setFd, 20, 800, 10, `${fd} km`], ['Transport rate (your estimate)', rate, setRate, .5, 4, .1, `₹${rate.toFixed(1)}/q/km`]].map(([l, v, f, mi, ma, st, sh]) =>
        <label className="ctl" key={l}><span>{l}</span><output>{sh}</output><input type="range" min={mi} max={ma} step={st} value={v} onChange={e => f(Number(e.target.value))} /></label>)}
      <div style={{ marginTop: 16 }}>
        {[[`Nearby: ${short(near)}`, nn, near.modal, '#9DB8A8'], [`Far: ${short(far)}`, fn, far.modal, '#1F5A44']].map(([l, n, g, col]) => <div key={l} style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span>{l}</span><b className="mono"><Tween to={n} fmt={FMT} />/q</b></div>
          <div style={{ height: 14, background: 'var(--paper-2)', border: '1px solid var(--ink)' }}><div style={{ height: '100%', width: `${Math.max(1, n) / mx * 100}%`, background: col, transition: 'width .7s cubic-bezier(.3,1.3,.5,1)' }} /></div>
        </div>)}
      </div>
      <div className="verdict-line">{worth ? <>The far market leaves you <b>{inr((fn - nn) * q)} more</b> on {q} quintals.</> : <>Stay nearby. The trip would cost you <b>{inr((nn - fn) * q)}</b> on {q} quintals.</>} {far.modal > near.modal && be < 1500 ? <>It stops paying beyond about <b>{Math.round(be)} km</b>.</> : ''}</div>
      <p className="lab-note">Prices are one day's records, for varieties that may differ ({near.variety} / {far.variety}). Includes ₹{fee}/q assumed loading and handling. Distances and transport rate are yours to set, so ask a local transporter.</p>
    </div>
  </div>
}

// ---------- MSP gauges ----------
function Gauges() {
  const [ref, seen] = useSeen(.2)
  const list = Object.entries(items).filter(([, v]) => v.crop && MSP_AT_SNAPSHOT[v.crop] && v.n >= 4)
  return <div className="gauges" ref={ref}>{list.map(([n, v], i) => {
    const msp = MSP_AT_SNAPSHOT[v.crop], r = v.median / msp, a = Math.max(-90, Math.min(90, (r - 1) / .4 * 90)), pct = Math.round((r - 1) * 100)
    return <div className="gauge" key={n}>
      <h4>{n}</h4>
      <svg viewBox="0 0 160 96" style={{ width: '100%' }} role="img" aria-label={`${n} median is ${Math.abs(pct)} percent ${pct >= 0 ? 'above' : 'below'} MSP`}>
        <path d="M14 82A66 66 0 0 1 80 16" stroke="#B4532A" strokeOpacity=".35" strokeWidth="5" strokeLinecap="round" fill="none" /><path d="M80 16A66 66 0 0 1 146 82" stroke="#1F5A44" strokeOpacity=".45" strokeWidth="5" strokeLinecap="round" fill="none" />
        <line x1="80" y1="10" x2="80" y2="22" stroke="#171A17" strokeOpacity=".4" strokeWidth="1.5" />
        <g className="needle" style={{ transform: `rotate(${seen ? a : -90}deg)`, transitionDelay: `${i * 90}ms` }}><line x1="80" y1="82" x2="80" y2="28" stroke={pct >= 0 ? '#1F5A44' : '#B4532A'} strokeWidth="2" strokeLinecap="round" /></g><circle cx="80" cy="82" r="4.5" fill="#171A17" />
      </svg>
      <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}><b style={{ color: pct >= 0 ? 'var(--leaf)' : 'var(--clay)', fontSize: 13 }}>{Math.abs(pct)}% {pct >= 0 ? 'above' : 'below'} MSP</b><br />{rs(v.median)} vs {rs(msp)} · {v.n} records</div>
    </div>
  })}</div>
}

// ---------- seasonal heat + hold calculator ----------
const norm = (sh) => { const m = sh.reduce((a, b) => a + b, 0) / 12; return sh.map(x => x / m) }
const divColor = (d) => { const t = Math.min(1, Math.abs(d) / .25), [r, g, b] = d >= 0 ? [46, 91, 58] : [176, 78, 44]; return `rgb(${lerp(233, r, t)},${lerp(226, g, t)},${lerp(207, b, t)})` }
const PERISH = { onion: .04, tomato: .3, sugarcane: .3 }
const HSTART = { kharif: 5, rabi: 9, summer: 1 }
function Seasonal() {
  const [id, setId] = useState('onion'), [hold, setHold] = useState(0), [cost, setCost] = useState(30), now = new Date().getMonth()
  const [real, setReal] = useState(null)
  useEffect(() => { api('/forecast').then(d => { const ix = d.seasonality?.index; if (ix && Object.keys(ix).length) setReal(ix) }).catch(() => {}) }, [])
  const shapeOf = (cid) => real?.[cid] ? real[cid].map(Math.exp) : SEASON_SHAPE[cid]
  const c = CROP_BY_ID[id], sh = norm(shapeOf(id)), series = sh.map(s => c.price * s), loss = PERISH[id] ?? .007, noStore = loss >= .3
  const hm = (HSTART[c.seasons[0]] + Math.round(c.days / 30)) % 12
  useEffect(() => setHold(0), [id])
  const span = Array.from({ length: 9 }, (_, i) => i), gross = span.map(i => series[(hm + i) % 12]), net = span.map(i => gross[i] * Math.pow(1 - loss, i) - cost * i)
  const maxN = Math.max(...net), best = net.indexOf(maxN), W = 560, H = 230, top = Math.max(...gross) * 1.06, low = Math.min(...gross, ...net) * .9, X = i => 44 + i / 8 * (W - 66), Y = v => 16 + (1 - (v - low) / (top - low)) * (H - 56)
  const path = (a) => a.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('')
  const gain = net[hold] - net[0], remain = Math.pow(1 - loss, hold)
  return <>
    <div className="table-scroll"><div className="heat" role="table" aria-label="Seasonal price index by crop and month">
      <span />{MONTHS.map((m, i) => <span key={m} className={`hm ${i === now ? 'now' : ''}`}>{m}</span>)}
      {CROPS.filter(x => x.id !== 'sugarcane' && (!real || real[x.id])).flatMap((x, r) => { const s = norm(shapeOf(x.id)), bm = s.indexOf(Math.max(...s)); return [
        <button key={x.id} className={`hn ${x.id === id ? 'on' : ''}`} onClick={() => setId(x.id)}>{x.name.split(' (')[0]}</button>,
        ...s.map((v, i) => <button key={x.id + i} className="c" onClick={() => setId(x.id)} title={`${x.name.split(' (')[0]}, ${MONTHS[i]}: ${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)}% vs its year`} style={{ background: divColor(v - 1), color: Math.abs(v - 1) > .13 ? '#FFFFFF' : '#171A17', animationDelay: `${r * 28 + i * 16}ms` }}>{i === bm ? '★' : ''}</button>)] })}
    </div></div>
    <p className="note-data" style={{ marginTop: 0, marginBottom: 8 }}>{real ? 'SOURCE: AGMARKNET KARNATAKA HISTORY (median of each month vs its 12-month average).' : 'INDICATIVE PATTERN. Train the price model to replace this with real history.'}</p>
    <div className="ramp"><span>Cheaper</span><i style={{ background: 'linear-gradient(90deg,#B4532A,#F1EFE9,#1F5A44)' }} /><span>Dearer than its yearly average · ★ usual peak</span></div>
    <Reveal className="detail">
      <div>
        <div className="eyebrow">Hold-or-sell calculator</div>
        <div className="serif" style={{ fontSize: 40, letterSpacing: '-.03em', lineHeight: 1.05 }}>{c.name.split(' (')[0]}</div>
        <svg viewBox="0 0 120 130" width="110" style={{ display: 'block', margin: '10px 0' }} role="img" aria-label={`Sack at ${Math.round(remain * 100)} percent of original weight`}>
          <g style={{ transform: `scale(${.55 + .45 * remain})`, transformOrigin: '60px 124px', transition: 'transform .6s cubic-bezier(.3,1.5,.5,1)' }}><path d="M34 34C14 62 14 124 60 124S106 62 86 34z" fill="#C8AE7C" stroke="#171A17" strokeWidth="2" /><path d="M42 18c10 8 26 8 36 0l-6 18H48z" fill="#B59868" stroke="#171A17" strokeWidth="2" /></g>
        </svg>
        <label className="ctl"><span>Months held after harvest</span><output>{noStore ? 'cannot store' : hold}</output><input type="range" min="0" max="8" value={hold} disabled={noStore} onChange={e => setHold(Number(e.target.value))} /></label>
        <label className="ctl"><span>Storage cost</span><output>₹{cost}/q/mo</output><input type="range" min="0" max="120" step="5" value={cost} onChange={e => setCost(Number(e.target.value))} /></label>
        <div className="read"><div><span>Sell in</span><b>{MONTHS[(hm + hold) % 12]}</b></div><div><span>You keep /q</span><b><Tween to={net[hold]} fmt={FMT} /></b></div><div><span>Vs harvest day</span><b style={{ color: gain >= 0 ? 'var(--leaf)' : 'var(--clay)' }}>{gain >= 0 ? '+' : '−'}{rs(Math.abs(gain))}</b></div></div>
        <div className="verdict-line">{noStore ? 'Sell within days. This crop does not hold, so the choice is which market, not which month.' : best === 0 ? 'Selling at harvest wins at this storage cost.' : <>Best around <b>{MONTHS[(hm + best) % 12]}</b>, {best} {best === 1 ? 'month' : 'months'} after harvest.</>}</div>
      </div>
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }} role="img" aria-label="Mandi price and what you keep by month after harvest">
          {[0, .5, 1].map(f => { const v = low + (top - low) * f; return <g key={f}><line x1="44" x2={W - 22} y1={Y(v)} y2={Y(v)} stroke="rgba(23,38,27,.12)" /><text x="40" y={Y(v) + 3} textAnchor="end" fontSize="9.5" fontFamily="Inter" fill="#888E87">{Math.round(v / 10) * 10}</text></g> })}
          <path d={path(gross)} fill="none" stroke="#9AA08F" strokeWidth="2" /><path key={id + cost} d={path(net)} fill="none" stroke="#1F5A44" strokeWidth="2.6" pathLength="1" className="drawline" />
          <text x={X(8)} y={Y(gross[8]) - 8} textAnchor="end" fontSize="10" fontFamily="Inter" fill="#7C827B">MANDI PRICE</text>
          <text x={X(8)} y={Y(net[8]) + 15} textAnchor="end" fontSize="10" fontFamily="Inter" fill="#1F5A44">YOU KEEP</text>
          {span.map(i => <g key={i} onClick={() => !noStore && setHold(i)} onPointerEnter={() => !noStore && setHold(i)} style={{ cursor: 'pointer' }}><rect x={X(i) - 26} y="0" width="52" height={H} fill="transparent" /><text x={X(i)} y={H - 12} textAnchor="middle" fontSize="10.5" fontFamily="Inter" fill={i === hold ? '#171A17' : '#888E87'} fontWeight={i === hold ? 700 : 400}>{MONTHS[(hm + i) % 12]}</text></g>)}
          <line x1={X(hold)} x2={X(hold)} y1="14" y2={H - 28} stroke="#171A17" strokeDasharray="3 3" style={{ transition: 'all .25s' }} />
          <circle cx={X(hold)} cy={Y(net[hold])} r="7" fill="#B8862F" stroke="#171A17" style={{ transition: 'all .25s' }} />
        </svg>
        <p className="note-data">{real ? 'Seasonal shape from AGMARKNET history applied to a reference price. For a forecast with error bars, use the price forecast above.' : 'INDICATIVE. Seasonal shape reflects usual harvest-glut and lean-month patterns on a representative price.'}</p>
      </div>
    </Reveal>
  </>
}

// ---------- journey of a sack ----------
const STEPS = [
  ['Grade', 'Clean, dry and grade at home', 'Buyers bid on what they can see. Remove stones and damaged produce, fill bags evenly, and keep good and poor grades apart.', 'Mixing grades drags the whole lot down to the poorest quality.'],
  ['Gate', 'Gate entry at the yard', 'Your vehicle is logged at the APMC gate. The farmer name, commodity and bag count go on an entry slip, and the lot gets a number.', 'Keep the slip. It is the start of your record for that sale.'],
  ['Display', 'Lots are laid out', 'Your lot is displayed, usually at a commission agent or a marked spot, so traders can open the bags and inspect samples.', 'Stay with your lot. Note what is being sampled and by whom.'],
  ['Bid', 'Auction or e-tender', 'Traders bid openly, or online in yards using Karnataka’s Unified Market Platform. The highest bid is offered to you.', 'You may refuse a low bid. Check the day’s modal rate before you agree.'],
  ['Weigh', 'Weighment', 'Accepted lots are weighed on the yard’s scale. Handling and weighing labour charges apply and vary by yard.', 'Watch the scale. Ask before unloading what will be deducted.'],
  ['Paid', 'Sale bill and payment', 'You should receive a sale bill showing rate, weight, deductions and net amount. Payment is due from the buyer or agent as per yard rules.', 'Never leave without the bill. It supports loans, insurance and disputes.'],
]
function Journey() {
  const [s, setS] = useState(0), [auto, setAuto] = useState(true), [ref, seen] = useSeen(.3)
  useEffect(() => { if (!auto || !seen) return; const i = setInterval(() => setS(x => (x + 1) % STEPS.length), 3600); return () => clearInterval(i) }, [auto, seen])
  const W = 900, X = i => 75 + i * (W - 150) / 5
  const pick = (i) => { setAuto(false); setS(i) }
  return <div ref={ref}>
    <svg viewBox={`0 0 ${W} 160`} style={{ width: '100%', background: 'var(--card)', borderRadius: 14, overflow: 'hidden', display: 'block' }} role="img" aria-label={`Stage ${s + 1} of 6: ${STEPS[s][1]}`}>
      <path d={`M${X(0)} 120H${X(5)}`} stroke="#171A17" strokeOpacity=".12" strokeWidth="2" strokeLinecap="round" /><path d={`M${X(0)} 120H${X(s)}`} stroke="#1F5A44" strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'all .9s' }} />
      {STEPS.map((st, i) => <g key={st[0]} onClick={() => pick(i)} style={{ cursor: 'pointer' }}><circle cx={X(i)} cy="120" r="6" fill={i <= s ? '#1F5A44' : '#FFFFFF'} stroke={i <= s ? '#1F5A44' : '#B9BDB6'} strokeWidth="1.5" style={{ transition: 'fill .5s' }} /><text x={X(i)} y="148" textAnchor="middle" fontSize="11" fontFamily="Inter" fill="#171A17">{st[0].toUpperCase()}</text></g>)}
      <g className="sack" style={{ transform: `translateX(${X(s) - 34}px)` }}><circle cx="34" cy="120" r="17" fill="#1F5A44" fillOpacity=".12" /><circle cx="34" cy="120" r="9" fill="#1F5A44" stroke="#FFFFFF" strokeWidth="2.5" /><text x="34" y="88" textAnchor="middle" fontSize="12" fontWeight="600" fontFamily="Inter" fill="#1F5A44">Your sack</text></g>
    </svg>
    <div className="steps5">{STEPS.map((st, i) => <button key={st[0]} className={i === s ? 'on' : ''} onClick={() => pick(i)}>{st[0]}</button>)}</div>
    <div key={s} className="fade-in" style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 22 }}>
      <div><div className="serif" style={{ fontSize: 32, letterSpacing: '-.03em', lineHeight: 1.1 }}>{STEPS[s][1]}</div><p style={{ marginTop: 8, color: 'var(--ink-2)' }}>{STEPS[s][2]}</p></div>
      <div className="verdict-line" style={{ alignSelf: 'start' }}><b>Tip.</b> {STEPS[s][3]}</div>
    </div>
    <p className="note-data">Practice varies between yards and states. Ask at your APMC office what applies.</p>
  </div>
}

// ---------- price line explainer ----------
function ReadPrice({ item, name }) {
  const row = item.markets.find(m => m.state === 'Karnataka' && m.max > m.min) || item.markets.find(m => m.max > m.min) || item.markets[0]
  const span = (row.max - row.min) || 1, pad = span * .25, X = v => ((v - row.min + pad) / (span + pad * 2)) * 100
  return <div key={name} className="fade-in">
    <div className="eyebrow">{name} · {short(row)}, {row.district} · a real row from this day</div>
    <div style={{ position: 'relative', height: 92, marginTop: 14 }}>
      <div style={{ position: 'absolute', left: `${X(row.min)}%`, width: `${X(row.max) - X(row.min)}%`, top: 40, height: 14, background: 'var(--leaf-2)', borderRadius: 14, overflow: 'hidden' }} />
      {[['MIN', row.min, 'lowest lot'], ['MODAL', row.modal, 'most trade'], ['MAX', row.max, 'best lot']].map(([l, v, d]) => <div key={l} style={{ position: 'absolute', left: `${X(v)}%`, transform: 'translateX(-50%)', top: 0, textAlign: 'center', height: 92 }}>
        <div className="mono" style={{ fontSize: 10 }}>{l}</div><div className="mono" style={{ fontSize: 11, fontWeight: 600 }}>{rs(v)}</div>
        <div style={{ width: 2, height: 22, background: 'var(--ink)', margin: '2px auto' }} /><div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 14 }}>{d}</div></div>)}
    </div>
    <p style={{ fontSize: 14.5, color: 'var(--ink-2)', marginTop: 8 }}>Do not plan on the max: a single premium lot can set it. Budget on the modal, and expect the min if your produce is poorly graded. Across all {item.n} records of {name} that day, the usual gap between min and max was {item.spread}% of the modal.</p>
  </div>
}

export default function MandiView() {
  const [name, setName] = useState('Tomato'), [auto, setAuto] = useState(true), [state, setState] = useState('Karnataka')
  const item = items[name]
  useEffect(() => { if (!auto) return; const i = setInterval(() => setName(n => NAMES[(NAMES.indexOf(n) + 1) % NAMES.length]), 6500); return () => clearInterval(i) }, [auto])
  const choose = (n) => { setAuto(false); setName(n) }
  const Chips = useMemo(() => NAMES.map(n => <button key={n} className={`chip ${n === name ? 'on' : ''}`} onClick={() => choose(n)}>{n}</button>), [name])
  return (
    <div className="wrap">
      <section className="sec" style={{ borderTop: 0 }}>
        <div className="sec-head"><div className="idx">01</div><div><div className="eyebrow">Today in Karnataka</div><h2>Live mandi prices, <em>straight from AGMARKNET</em></h2>
          <p>Fetched from the Government of India's open data API every 30 minutes. If the feed is down, the saved snapshot is shown and labelled.</p></div></div>
        <LiveBoard />
      </section>

      <section className="sec">
        <div className="sec-head"><div className="idx">02</div><div><div className="eyebrow">Price forecast · machine learning</div><h2>Where prices are <em>likely to go</em></h2>
          <p>A gradient-boosted model trained on years of Karnataka AGMARKNET prices forecasts the next nine months. It is checked against data it never saw, and the error is shown next to every forecast.</p></div></div>
        <ForecastPanel />
      </section>

      <section className="sec">
        <div className="sec-head"><div className="idx">03</div><div><div className="eyebrow">Mandi board · AGMARKNET snapshot dated {meta.date}</div><h2>{meta.rows.toLocaleString('en-IN')} wholesale prices. {meta.markets} markets. <em>One day of India.</em></h2>
          <p>Real wholesale records from {meta.states} states, every figure in rupees per quintal. {meta.retail.toLocaleString('en-IN')} Tamil Nadu farmer-to-consumer market rows are left out because their retail-style prices are not comparable. This is a saved snapshot, so check today's rate on e-NAM or at your APMC before you load a truck.</p></div></div>
        <div className="seg">{Chips}</div>
        <Board name={name} item={item} />
      </section>

      <section className="sec"><div className="sec-head"><div className="idx">04</div><div><div className="eyebrow">Where it pays</div><h2>The same crop, <em>a different price</em> in every state</h2><p>Pick a state. The map flips outward from Karnataka whenever the commodity changes.</p></div></div>
        <IndiaMap name={name} item={item} state={state} setState={setState} /></section>

      <section className="sec"><div className="sec-head"><div className="idx">05</div><div><div className="eyebrow">Read the numbers</div><h2>What <em>min, modal and max</em> really mean</h2></div></div>
        <ReadPrice item={item} name={name} /></section>

      <section className="sec"><div className="sec-head"><div className="idx">06</div><div><div className="eyebrow">Transport maths</div><h2>Is the far market <em>worth the diesel?</em></h2><p>A higher price is only real after you pay to get there. Change the distance and watch the truck, and the margin, move.</p></div></div>
        <Truck name={name} item={item} /></section>

      <section className="sec"><div className="sec-head"><div className="idx">07</div><div><div className="eyebrow">Price floor</div><h2>Market price <em>vs MSP</em></h2><p>Needle right of centre: the wholesale median was above the Minimum Support Price in force that day. Left: farmers selling privately were below it, which is when government procurement matters.</p></div></div>
        <Gauges /></section>

      <section className="sec"><div className="sec-head"><div className="idx">08</div><div><div className="eyebrow">Seasonal pattern</div><h2>When <em>each crop</em> usually pays best</h2><p>Each cell compares a month with that crop's yearly average. When the price model is trained, this uses real AGMARKNET history; otherwise an indicative pattern, labelled as such.</p></div></div>
        <Seasonal /></section>

      <section className="sec"><div className="sec-head"><div className="idx">09</div><div><div className="eyebrow">First time at the yard</div><h2>The journey of <em>one sack</em></h2></div></div>
        <Journey /></section>
    </div>
  )
}
