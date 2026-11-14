import { useEffect, useMemo, useRef, useState } from 'react'
import { inr, MONTHS, EXPERIENCE, api } from '../lib/core'
import { DISTRICT_NAMES, DISTRICTS } from '../data/districts'
import { ParcelMap, GrainHist, Dots } from '../ui/charts'
import { Tween } from '../ui/motion'
import { setPlanContext, summarisePlan } from '../lib/planContext'

export const PRESETS = [
  { id: 'techie', label: 'Laid-off techie, Mysuru', v: { district: 'Mysuru', acres: 3, budget: 120000, source: 'borewell', hp: 3, hours: 6, depthFt: 280, irrigation: 'drip', experience: 'none' } },
  { id: 'dry', label: 'Dry land, Koppal, no pump', v: { district: 'Koppal', acres: 8, budget: 90000, source: 'rainfed', hp: 5, hours: 6, depthFt: 300, irrigation: 'flood', experience: 'none' } },
  { id: 'canal', label: 'Canal farm, Mandya', v: { district: 'Mandya', acres: 5, budget: 250000, source: 'canal', hp: 5, hours: 6, depthFt: 300, irrigation: 'flood', experience: 'some' } },
  { id: 'coast', label: 'Coastal plot, Udupi', v: { district: 'Udupi', acres: 2, budget: 80000, source: 'canal', hp: 5, hours: 6, depthFt: 300, irrigation: 'flood', experience: 'none' } },
]

const Seg = ({ value, options, onChange, label }) => <div className="seg2" role="radiogroup" aria-label={label}>
  {options.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
</div>

export function Form({ value, onChange, onGo, season, setSeason }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  const num = (k) => (e) => set(k, e.target.value === '' ? '' : Number(e.target.value))
  const preset = PRESETS.find(p => Object.entries(p.v).every(([k, v]) => value[k] === v))?.id
  return (
    <form className="madlib" onSubmit={e => { e.preventDefault(); onGo() }}>
      <div className="madlib-h"><b>Your farm</b><span className="eyebrow">Takes 20 seconds</span></div>
      <div className="fgrid">
        <label className="fld"><span>District</span><select value={value.district} onChange={e => set('district', e.target.value)}>{DISTRICT_NAMES.map(d => <option key={d}>{d}</option>)}</select></label>
        <label className="fld"><span>Land (acres)</span><input type="number" min="0.25" step="0.25" value={value.acres} onChange={num('acres')} /></label>
        <div className="fld full"><span>Water source</span><Seg label="Water source" value={value.source} onChange={v => set('source', v)} options={[['borewell', 'Borewell'], ['canal', 'Canal / river'], ['rainfed', 'Rain only']]} /></div>
        {value.source === 'borewell' && <>
          <label className="fld"><span>Pump</span><select value={value.hp} onChange={e => set('hp', Number(e.target.value))}>{[1, 2, 3, 5, 7.5, 10].map(h => <option key={h} value={h}>{h} HP</option>)}</select></label>
          <label className="fld"><span>Pumping hours a day</span><input type="number" min="1" max="24" value={value.hours} onChange={num('hours')} /></label>
          <div className="fld full"><span>Irrigation</span><Seg label="Irrigation" value={value.irrigation} onChange={v => set('irrigation', v)} options={[['drip', 'Drip'], ['sprinkler', 'Sprinkler'], ['flood', 'Flood']]} /></div>
        </>}
        <label className="fld"><span>Budget this season</span><div className="pre"><input type="number" step="5000" min="0" value={value.budget} onChange={num('budget')} /></div></label>
        <label className="fld"><span>Season</span><select value={season} onChange={e => setSeason(e.target.value)}>
          <option value="kharif">Kharif · Jun–Oct</option><option value="rabi">Rabi · Oct–Feb</option><option value="summer">Summer · Feb–May</option></select></label>
        <div className="fld full"><span>Farming experience</span><Seg label="Experience" value={value.experience} onChange={v => set('experience', v)} options={[['none', 'None'], ['some', 'A little'], ['pro', 'Years']]} /></div>
      </div>
      <div className="cta-row"><button className="btn block" type="submit">Plan my harvest <span>→</span></button></div>
      <div className="presets"><span className="eyebrow">Examples</span>{PRESETS.map(p => <button type="button" key={p.id} className={`chip ${preset === p.id ? 'on' : ''}`} onClick={() => onChange({ ...value, ...p.v })}>{p.label}</button>)}</div>
    </form>
  )
}

const CountUp = ({ to }) => <Tween to={to} fmt={inr} />

// The plan is computed by the Python API (yield model, price forecast, simulation, land-split search).
const runPlan = (inp) => api('/plan', { body: inp })

const STEPS = ['Reading soil & rain normals for the district…', 'Building your water budget…', 'Predicting district yields with the trained model…', 'Pricing each crop at harvest from live mandi data…', 'Running 500 simulated seasons and searching land splits…']

export function Results({ inp, season, onPlaybook }) {
  const [res, setRes] = useState(null)
  const [step, setStep] = useState(0)
  const [idx, setIdx] = useState(0)
  const [hover, setHover] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => {
    let live = true
    setRes(null); setStep(0); setErr(null)
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i + 1), i * 380))
    const wait = new Promise(r => setTimeout(r, STEPS.length * 380))
    Promise.all([runPlan({ ...inp, season }), wait]).then(([r]) => { if (live) { setRes(r); setIdx(r.defaultIdx ?? 0) } }).catch(e => live && setErr(e.message))
    return () => { live = false; timers.forEach(clearTimeout) }
  }, [inp, season])

  if (err) return <div className="wrap sec"><div className="empty"><div className="serif" style={{ fontSize: 30 }}>Could not make a plan.</div><p style={{ marginTop: 10, color: 'var(--ink-2)' }}>{err}</p></div></div>

  if (!res) return <div className="thinking wrap"><div className="eyebrow">Working</div><div className="serif" style={{ fontSize: 40, letterSpacing: '-.03em', marginTop: 8 }}>Doing the maths a good agronomist would…</div>
    <div className="seedline"><i style={{ width: `${step / STEPS.length * 100}%` }} /></div><div className="steps">{STEPS.slice(0, step).map(s => <div key={s}>{s}</div>)}</div></div>

  if (res.empty) return <div className="wrap sec"><div className="empty"><div className="serif" style={{ fontSize: 34 }}>Nothing pays here this season.</div>
    <p style={{ marginTop: 10, color: 'var(--ink-2)' }}>Planting now would most likely lose money, so we will not suggest it. Try another season, add a water source or raise the budget. Here is why each crop was ruled out:</p></div><Rejected list={res.rejected} /></div>

  const opt = res.options[idx], d = res.district, ex = EXPERIENCE[inp.experience]
  setPlanContext(summarisePlan(inp, season, opt))
  const gainVsAllIn = opt.p10 - res.allIn.p10
  return (
    <div className="fade-in">
      <section className="sec" id="result">
        <div className="wrap">
          <div className="sec-head"><div className="idx">i.</div><div>
            <div className="eyebrow">Recommendation · {inp.district} · {season} · {inp.acres} acres</div>
            <h2>Grow {opt.crops.map((c, i, a) => <span key={c.crop.id}>{i > 0 && (i === a.length - 1 ? ' and ' : ', ')}<em>{c.crop.name.split(' (')[0]}</em></span>)}.</h2>
            <p>{opt.crops.length === 1 ? 'A single crop suits your farm best.' : `Splitting across ${opt.crops.length} crops keeps one bad price or one bad pest from sinking the season.`} {ex.maxCrops < 5 && inp.experience === 'none' ? 'We kept it to three crops at most so it stays manageable for a first season.' : ''}</p>
          </div></div>

          <div className="verdict">
            <div className="verdict-l">
              <div className="eyebrow">If the season goes the way it usually does</div>
              <div className={`num ${opt.mean >= 0 ? '' : ''}`} style={{ fontSize: 'clamp(54px,7vw,92px)', lineHeight: 1, marginTop: 12, color: opt.mean >= 0 ? 'var(--leaf)' : 'var(--clay)' }}><CountUp to={opt.p50} /></div>
              <div style={{ color: 'var(--ink-2)', marginTop: 6 }}>typical profit after all costs · average over simulations {inr(opt.mean)}</div>
              <div className="slider-block">
                <div className="slider-labels"><span>◀ Play safe</span><span>Chase profit ▶</span></div>
                <input className="risk" type="range" min="0" max={res.options.length - 1} step="1" value={idx} onChange={e => setIdx(Number(e.target.value))} aria-label="risk appetite" />
                <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{res.options.length} efficient land splits found · drag to compare</div>
              </div>
            </div>
            <div className="verdict-r">
              <div className="stat"><div className="lab">You put in</div><div className="val"><CountUp to={opt.invest} /></div><div className="sub">of {inr(inp.budget)} budget{opt.fallow > 0 && ` · ${opt.fallow} ac left fallow`}</div></div>
              <div className="stat"><div className="lab">Chance of a loss</div><div className={`val ${opt.probLoss > .15 ? 'neg' : 'pos'}`}>{Math.round(opt.probLoss * 100)}%</div><div className="sub">across 500 simulated seasons</div></div>
              <div className="stat"><div className="lab">A bad year (1 in 10)</div><div className={`val ${opt.p10 < 0 ? 'neg' : ''}`}><CountUp to={opt.p10} /></div><div className="sub">the floor you should plan for</div></div>
              <div className="stat"><div className="lab">A good year (1 in 10)</div><div className="val pos"><CountUp to={opt.p90} /></div><div className="sub">return on cost: {Math.round(opt.roi * 100)}% expected</div></div>
            </div>
          </div>

          <div className="field-wrap">
            <div><div className="eyebrow" style={{ marginBottom: 10 }}>Your field, drawn to scale</div><ParcelMap crops={opt.crops} fallow={opt.fallow} total={inp.acres} hover={hover} /></div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 10 }}>The split</div>
              {opt.crops.map(c => (
                <div className="legend-row" key={c.crop.id} onPointerEnter={() => setHover(c.crop.id)} onPointerLeave={() => setHover(null)}>
                  <span className="sw" style={{ background: c.crop.hue }} />
                  <div><b>{c.crop.name.split(' (')[0]} <span style={{ color: 'var(--ink-3)', fontWeight: 400, fontSize: 14 }}>{c.crop.kn}</span></b><small>{inr(c.cost)} to grow · sow {c.window.sow}, harvest {c.window.harvest}</small></div>
                  <div className="ac">{c.acres}<small> ac · {Math.round(c.share * 100)}%</small></div>
                </div>
              ))}
              {res.allIn && res.allInCrop && <p style={{ marginTop: 18, fontSize: 14, color: 'var(--ink-2)', borderLeft: '3px solid var(--gold)', paddingLeft: 12 }}>
                <b>Why split?</b> Putting all {inp.acres} acres in {res.allInCrop.name.split(' (')[0]} would give a bad year of {inr(res.allIn.p10)}.{' '}
                {gainVsAllIn > 0 ? <>This split improves your bad-year result by <b>{inr(gainVsAllIn)}</b>.</> : <>This split gives a similar floor with simpler workload.</>}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="sec"><div className="wrap">
        <div className="sec-head"><div className="idx">ii.</div><div><div className="eyebrow">Money</div><h2>How the <em>season's profit</em> could land</h2>
          <p>We replayed this plan through 500 randomised seasons, varying rain, yield, mandi price and cost. Every grain is one season; the tallest piles are what you should expect most often. Move the slider above and watch the pile re-form.</p></div></div>
        <div className="detail" style={{ marginTop: 0, gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)' }}>
          <div><GrainHist opt={opt} />
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>Yields start from the district yield model and are scaled to {Math.round(res.experienceFactor * 100)}% for your experience. A procurement floor (92% of MSP, never above the expected price) applies where MSP exists.</p></div>
          <div>
            <table className="mtable" style={{ border: 0 }}>
              <thead><tr><th>Crop</th><th>Cost</th><th>Bad</th><th>Typical</th><th>Good</th></tr></thead>
              <tbody>{opt.crops.map(c => <tr key={c.crop.id}><td className="nm" style={{ fontSize: 16 }}>{c.crop.name.split(' (')[0]}</td><td className="mono" style={{ fontSize: 12.5 }}>{inr(c.cost)}</td>
                <td className={`mono ${c.p10 < 0 ? 'down' : ''}`} style={{ fontSize: 12.5 }}>{inr(c.p10)}</td><td className="mono" style={{ fontSize: 12.5 }}>{inr(c.p50)}</td><td className="mono up" style={{ fontSize: 12.5 }}>{inr(c.p90)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div></section>

      <section className="sec"><div className="wrap">
        <div className="sec-head"><div className="idx">iii.</div><div><div className="eyebrow">Water</div><h2>Your <em>water budget</em></h2><p>{res.wb.note}</p></div></div>
        <div className="water">
          <div><div className="eyebrow">Rain in season</div><div className="num" style={{ fontSize: 38 }}>{Math.round(opt.crops.reduce((t, c) => t + c.rain * c.acres, 0) / Math.max(1, opt.used))} mm</div><div className="sub" style={{ fontSize: 13, color: 'var(--ink-2)' }}>effective (70% of {d.annual} mm/yr normal, plus stored soil moisture)</div></div>
          <div><div className="eyebrow">Pump supply</div><div className="num" style={{ fontSize: 38 }}>{res.wb.supplyM3 == null ? 'Assured' : `${Math.round(res.wb.supplyM3).toLocaleString('en-IN')} m³`}</div><div className="sub" style={{ fontSize: 13, color: 'var(--ink-2)' }}>{res.wb.supplyM3 == null ? 'canal command' : res.wb.supplyM3 === 0 ? 'no irrigation' : '120 pumping days'}</div></div>
          <div><div className="eyebrow">Crops need extra</div><div className="num" style={{ fontSize: 38 }}>{Math.round(opt.waterNeed).toLocaleString('en-IN')} m³</div><div className="sub" style={{ fontSize: 13, color: 'var(--ink-2)' }}>beyond rain, for this split</div></div>
          <div><div className="eyebrow">Demand met</div><div className="num" style={{ fontSize: 38 }}>{Math.round(opt.waterRatio * 100)}%</div><div className="bar"><i style={{ width: `${opt.waterRatio * 100}%`, background: opt.waterRatio < .6 ? 'var(--clay)' : 'var(--leaf)' }} /></div></div>
        </div>
      </div></section>

      <section className="sec"><div className="wrap">
        <div className="sec-head"><div className="idx">iv.</div><div><div className="eyebrow">The crops</div><h2>Know <em>what you're growing</em></h2><p>Each card shows the evidence behind the pick. Open the playbook for a week-by-week plan.</p></div></div>
        <div className="cards">{opt.crops.map(c => <CropCard key={c.crop.id} c={c} perAcre={res.perAcre.find(p => p.id === c.crop.id)} onPlaybook={() => onPlaybook(c)} />)}</div>
      </div></section>

      <section className="sec"><div className="wrap">
        <div className="sec-head"><div className="idx">v.</div><div><div className="eyebrow">Transparency</div><h2>What we <em>ruled out</em>, and why</h2><p>Every crop in our database was tested. Here are the ones that failed and the exact reason.</p></div></div>
        <Rejected list={res.rejected} />
        <p className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 22 }}>Soil: {d.soil}, pH {d.ph}, N {d.n} / P {d.p} / K {d.k} kg/ha ({d.zone}) · derived from 10,000-row Karnataka soil &amp; mandi dataset · Rain: IMD long-period normals</p>
      </div></section>
    </div>
  )
}

function CropCard({ c, perAcre, onPlaybook }) {
  const cr = c.crop
  return (
    <article className="ccard" style={{ '--hue': cr.hue }}>
      <div className="ccard-top"><h3>{cr.name}</h3><div className="kn">{cr.kn} · {c.acres} acres</div></div>
      <div className="ccard-body">
        <p>{cr.beginner}</p>
        <div className="kv">
          <div><span>Expected yield</span><b>{(c.yieldQtl / c.acres).toFixed(1)} q/ac</b></div>
          <div><span>Price used</span><b>{inr(c.price.expected)}/q</b></div>
          <div><span>Cost per acre</span><b>{inr(cr.cost)}</b></div>
          <div><span>Days to harvest</span><b>{cr.days}</b></div>
          <div><span>Difficulty</span><Dots n={cr.difficulty} /></div>
          <div><span>Labour</span><Dots n={cr.labour} /></div>
        </div>
        <div className="source">
          <div><i className={c.yieldSource.kind === 'ml' ? 'ai' : ''}>{c.yieldSource.kind === 'ml' ? 'ML' : 'REF'}</i> Yield: {c.yieldSource.label}{c.yieldSource.kind === 'ml' ? ` · district average ${c.yieldSource.qtlPerAcre} q/ac · ±${c.yieldSource.validationErrorPct}% validation error` : ''}</div>
          <div><i className={c.price.source === 'forecast' ? 'ai' : c.price.source === 'live' ? 'live' : ''}>{c.price.source === 'forecast' ? 'ML' : c.price.source === 'live' ? 'LIVE' : 'REF'}</i> Price: {c.price.label}</div>
        </div>
        <div className="tags">
          {c.inDistrictTop && <span className="tag ok">Widely grown in district</span>}
          {c.soilNote === 'good' && <span className="tag ok">Soil suits it</span>}
          {c.soilNote === 'poor' && <span className="tag">Soil is marginal (-15% yield)</span>}
          {cr.msp && <span className="tag ok">MSP ₹{cr.msp.toLocaleString('en-IN')}/q</span>}
          {c.coverage < .75 && <span className="tag">Water {Math.round(c.coverage * 100)}% of need</span>}
          {c.coverage >= .95 && <span className="tag ok">Water fully met</span>}
        </div>
      </div>
      <div className="ccard-foot"><span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>per acre: {inr(perAcre?.p10 ?? 0)} to {inr(perAcre?.p50 ?? 0)}</span><button className="btn sm" onClick={onPlaybook}>Open playbook →</button></div>
    </article>
  )
}

function Rejected({ list }) {
  return <div className="rej">{list.map(r => (
    <div className="rej-item" key={r.crop.id}><span className={`pill ${r.tag === 'Skill' ? 'y' : r.tag === 'Water' ? 's' : 'c'}`}>{r.tag}</span><div><b>{r.crop.name.split(' (')[0]}</b><p>{r.why}</p></div></div>
  ))}</div>
}

export function Playbook({ c, onClose, inp }) {
  const key = `km-pb-${c.crop.id}`
  const [done, setDone] = useState(() => { try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] } })
  const toggle = (i) => { const n = done.includes(i) ? done.filter(x => x !== i) : [...done, i]; setDone(n); try { localStorage.setItem(key, JSON.stringify(n)) } catch {} }
  const cr = c.crop
  const startIdx = MONTHS.indexOf(c.window.sow)
  const dateFor = (wk) => `${MONTHS[(startIdx + Math.floor(wk / 4.33)) % 12]} · week ${wk}`
  return <>
    <div className="scrim" onClick={onClose} />
    <aside className="drawer" role="dialog" aria-label="Crop playbook">
      <button className="x" onClick={onClose}>Close ✕</button>
      <div className="eyebrow">Playbook · {c.acres} acres · {inp.district}</div>
      <h2 style={{ marginTop: 10 }}><em>{cr.name.split(' (')[0]}</em> from seed to sale</h2>
      <p style={{ color: 'var(--ink-2)', marginTop: 12 }}>{cr.blurb}</p>
      <div className="kv" style={{ margin: '22px 0 6px' }}>
        <div><span>Sow</span><b>{c.window.sow}</b></div><div><span>Harvest</span><b>{c.window.harvest}</b></div>
        <div><span>Seed &amp; spacing</span><b style={{ fontSize: 15, fontFamily: 'var(--sans)' }}>{cr.seed}</b></div><div><span>Budget for {c.acres} acres</span><b>{inr(c.cost)}</b></div>
      </div>
      <div className="timeline">{cr.plan.map(([wk, t, txt], i) => (
        <div key={i} className={`tl ${done.includes(i) ? 'done' : ''}`}>
          <div className="wk">{dateFor(wk)}</div><h4>{t}</h4><p>{txt}</p>
          <label><input type="checkbox" checked={done.includes(i)} onChange={() => toggle(i)} /> Mark done</label>
        </div>))}</div>
      <p className="warn">Doses and timings are typical for Karnataka. Confirm with your Raitha Samparka Kendra or KVK for your exact variety and field.</p>
    </aside>
  </>
}
