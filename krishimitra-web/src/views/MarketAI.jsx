import { useEffect, useMemo, useState } from 'react'
import { CROPS, CROP_BY_ID } from '../data/crops'
import { api, inr } from '../lib/core'
import { Tween } from '../ui/motion'

const rs = (n) => '₹' + Math.round(n).toLocaleString('en-IN')

// ---------- today's prices from data.gov.in ----------
export function LiveBoard() {
  const [d, setD] = useState(null), [err, setErr] = useState(null), [q, setQ] = useState(''), [onlyOurs, setOnlyOurs] = useState(false)
  useEffect(() => { api('/mandi/live?state=Karnataka').then(setD).catch(e => setErr(e.message)) }, [])
  const rows = useMemo(() => (d?.rows || []).filter(r => (!onlyOurs || r.crop) && (r.commodity + r.market + r.district).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.commodity.localeCompare(b.commodity) || b.modal - a.modal), [d, q, onlyOurs])
  if (err) return <div className="verdict-line">{err}</div>
  if (!d) return <p className="mono" style={{ fontSize: 13 }}>Fetching today's Karnataka prices from data.gov.in…</p>
  const live = d.source === 'live'
  return <div>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
      <span className={`signal ${live ? 'SELL' : 'HOLD'}`}>{live ? '● LIVE' : 'SNAPSHOT'}</span>
      <span className="mono" style={{ fontSize: 12.5 }}>{live ? `AGMARKNET via data.gov.in · arrivals dated ${d.date} · fetched ${new Date(d.fetchedAt).toLocaleTimeString('en-IN')} · ${d.rows.length} records` : `${d.error || 'Live feed unavailable.'} Snapshot dated ${d.date}.`}</span>
    </div>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
      <div className="urlbar" style={{ maxWidth: 360, flex: 1 }}><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search commodity, market or district…" aria-label="Filter prices" /></div>
      <button className={`chip ${onlyOurs ? 'on' : ''}`} onClick={() => setOnlyOurs(v => !v)}>Only crops in the planner</button>
    </div>
    {live && !d.keyType?.startsWith('own') && <p className="lab-note" style={{ marginTop: 0, marginBottom: 10 }}>Using data.gov.in's public demo key, which returns a limited number of rows. Add your own DATA_GOV_API_KEY in server/.env for the full feed.</p>}
    <div className="table-scroll" style={{ maxHeight: 420, overflowY: 'auto' }}><table className="mtable">
      <thead><tr><th>Commodity</th><th>Market</th><th>District</th><th>Min</th><th>Max</th><th>Modal ₹/q</th></tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}><td className="nm" style={{ fontSize: 16 }}>{r.commodity}{r.crop && <span className="pill g" style={{ marginLeft: 8, fontSize: 9 }}>planner</span>}</td><td>{r.market}</td><td>{r.district}</td>
        <td className="mono">{rs(r.min)}</td><td className="mono">{rs(r.max)}</td><td className="px">{rs(r.modal)}</td></tr>)}</tbody>
    </table></div>
    {rows.length === 0 && <p className="lab-note">No records match.</p>}
  </div>
}

// ---------- ML price forecast ----------
const FC_CROPS = CROPS.filter(c => c.id !== 'sugarcane')
export function ForecastPanel() {
  const [crop, setCrop] = useState('onion'), [f, setF] = useState(null), [err, setErr] = useState(null), [meta, setMeta] = useState(null), [hold, setHold] = useState(0), [cost, setCost] = useState(30)
  useEffect(() => { api('/forecast').then(setMeta).catch(() => setMeta({ status: { trained: false } })) }, [])
  useEffect(() => { setF(null); setErr(null); setHold(0); api(`/forecast/${crop}`).then(setF).catch(e => setErr(e.message)) }, [crop])
  const trained = meta?.status?.trained
  const crops = trained ? FC_CROPS.filter(c => meta.status.crops.includes(c.id)) : FC_CROPS
  return <div>
    <div className="seg">{crops.map(c => <button key={c.id} className={`chip ${c.id === crop ? 'on' : ''}`} onClick={() => setCrop(c.id)}>{c.name.split(' (')[0]}</button>)}</div>
    {err && <div className="verdict-line">{err === `No price model for ${crop} yet` ? 'The price model has not been trained for this crop. Run ml/fetch_price_history.py and ml/train_price.py on the server.' : err}</div>}
    {!f && !err && <p className="mono" style={{ fontSize: 13 }}>Running the price model…</p>}
    {f && <ForecastChart f={f} hold={hold} setHold={setHold} cost={cost} setCost={setCost} metrics={meta?.metrics} />}
  </div>
}

function ForecastChart({ f, hold, setHold, cost, setCost, metrics }) {
  const c = CROP_BY_ID[f.crop]
  const hist = f.history.slice(-24), fc = f.forecast, all = [...hist.map(h => h.modal), ...fc.map(x => x.hi), ...fc.map(x => x.lo)]
  const W = 760, H = 280, n = hist.length + fc.length, mx = Math.max(...all) * 1.05, mn = Math.min(...all) * .92
  const X = i => 46 + i / (n - 1) * (W - 70), Y = v => 14 + (1 - (v - mn) / (mx - mn)) * (H - 52)
  const line = (pts) => pts.map(([i, v], k) => `${k ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('')
  const base = hist.length - 1
  const histPath = line(hist.map((h, i) => [i, h.modal]))
  const fcPath = line([[base, f.lastPrice], ...fc.map((x, i) => [base + 1 + i, x.mid])])
  const band = `M${X(base)} ${Y(f.lastPrice)}` + fc.map((x, i) => `L${X(base + 1 + i)} ${Y(x.hi)}`).join('') + [...fc].reverse().map((x, i) => `L${X(base + fc.length - i)} ${Y(x.lo)}`).join('') + 'Z'
  const loss = ({ onion: .04, tomato: .3 })[c.id] ?? .007, perish = loss >= .3
  const keep = (k) => k === 0 ? f.lastPrice : fc[k - 1].mid * Math.pow(1 - loss, k) - cost * k
  const nets = [0, ...fc.map((_, i) => i + 1)].map(keep), best = nets.indexOf(Math.max(...nets))
  const bt = metrics?.backtest_by_crop?.[c.id], hErr = f.errorByHorizon
  const [tip, setTip] = useState(null)
  return <div className="detail" style={{ marginTop: 0, gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}>
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }} role="img" aria-label={`${c.name} price: last ${rs(f.lastPrice)}, forecast to ${fc[fc.length - 1].label}`}
        onPointerLeave={() => setTip(null)}>
        {[0, .5, 1].map(t => { const v = mn + (mx - mn) * t; return <g key={t}><line x1="46" x2={W - 24} y1={Y(v)} y2={Y(v)} stroke="rgba(23,38,27,.1)" /><text x="40" y={Y(v) + 3} textAnchor="end" fontSize="10" fontFamily="Inter" fill="#888E87">{Math.round(v / 10) * 10}</text></g> })}
        <path d={band} fill="rgba(217,154,30,.22)" />
        <path d={histPath} fill="none" stroke="#171A17" strokeWidth="2" />
        <path key={f.crop} d={fcPath} fill="none" stroke="#B8862F" strokeWidth="2.4" strokeDasharray="6 4" className="drawline" pathLength="1" style={{ strokeDasharray: 'none' }} />
        <line x1={X(base)} x2={X(base)} y1="10" y2={H - 38} stroke="#171A17" strokeDasharray="2 3" />
        <text x={X(base) + 5} y="20" fontSize="10" fontFamily="Inter" fill="#171A17">FORECAST →</text>
        {[...hist, ...fc].map((p, i) => i % 3 === 0 && <text key={i} x={X(i)} y={H - 18} textAnchor="middle" fontSize="9.5" fontFamily="Inter" fill="#888E87">{p.label.replace(' 20', " '")}</text>)}
        {[...hist.map((h, i) => [i, h.modal, h.label, false]), ...fc.map((x, i) => [base + 1 + i, x.mid, x.label, x])].map(([i, v, l, fx]) =>
          <rect key={i} x={X(i) - (W - 70) / n / 2} y="0" width={(W - 70) / n} height={H} fill="transparent" onPointerEnter={() => setTip({ x: X(i) / W * 100, l, v, fx })} />)}
        {tip && <circle cx={tip.x / 100 * W} cy={Y(tip.v)} r="5" fill="#B8862F" stroke="#171A17" />}
      </svg>
      {tip && <div className="tip" style={{ left: `${tip.x}%` }}><b>{tip.l}</b><br />{tip.fx ? `forecast ${rs(tip.v)} (${rs(tip.fx.lo)}–${rs(tip.fx.hi)})` : `recorded ${rs(tip.v)}`}</div>}
      <p className="lab-note"><b>Black</b>: Karnataka monthly median modal price from AGMARKNET, every market and trading day. <b style={{ color: '#B8862F' }}>Orange</b>: forecast. The shaded band is where 80% of past forecast errors fell{f.bandCoverage ? ` (on the latest two years, which it never saw, it held ${f.bandCoverage}% of prices)` : ''}.</p>
      {bt && <table className="mtable" style={{ marginTop: 10 }}>
        <thead><tr><th>Backtest: {metrics?.backtest_window?.split(' (')[0] || 'unseen prices'}, never seen in training</th><th>Median error</th></tr></thead>
        <tbody><tr><td><b>KrishiMitra model</b></td><td className="mono"><b>{bt.model}%</b></td></tr><tr><td>Assume no change</td><td className="mono">{bt.no_change}%</td></tr><tr><td>Usual seasonal swing</td><td className="mono">{bt.seasonal_naive}%</td></tr></tbody>
      </table>}
      {bt && (() => { const ours = bt.model, best = Math.min(bt.no_change, bt.seasonal_naive); return <p className="lab-note">{ours < best ? 'Beat both simple rules on prices it had not seen.' : ours <= best * 1.1 ? 'About as good as the best simple rule here. Prices for this crop are hard to call, so lean on the band.' : 'Did not beat the simple rules for this crop, so treat the forecast with extra caution.'} Tested on four separate 2-year windows, each predicted using only data from before it.</p> })()}
    </div>
    <div>
      <div className="eyebrow">Hold-or-sell calculator</div>
      <div className="serif" style={{ fontSize: 34, letterSpacing: '-.03em', lineHeight: 1.05 }}>{c.name.split(' (')[0]}</div>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6 }}>Latest month {f.history.at(-1).label}: <b>{rs(f.lastPrice)}</b>/q</p>
      <label className="ctl"><span>Months to hold</span><output>{perish ? 'cannot store' : hold}</output><input type="range" min="0" max={fc.length} value={hold} disabled={perish} onChange={e => setHold(Number(e.target.value))} /></label>
      <label className="ctl"><span>Storage cost</span><output>₹{cost}/q/mo</output><input type="range" min="0" max="120" step="5" value={cost} onChange={e => setCost(Number(e.target.value))} /></label>
      <div className="read"><div><span>Sell in</span><b>{hold === 0 ? 'Now' : fc[hold - 1].label}</b></div><div><span>You keep /q</span><b><Tween to={nets[hold]} fmt={rs} /></b></div><div><span>Typical error</span><b>±{hold === 0 ? 0 : Math.round(hErr?.[hold] ?? hErr?.[String(hold)] ?? 0)}%</b></div></div>
      <div className="verdict-line">{perish ? 'Tomatoes do not keep. Sell within days and compare markets instead.' : best === 0 ? 'At this storage cost, selling now is best on the forecast.' : <>The forecast favours holding about <b>{best} {best === 1 ? 'month' : 'months'}</b>, to {fc[best - 1].label}. The further ahead, the less certain.</>}</div>
      <p className="lab-note">Keeps {(loss * 100).toFixed(1)}% monthly weight loss in mind. A forecast, not a promise.</p>
    </div>
  </div>
}
