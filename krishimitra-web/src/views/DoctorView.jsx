import { useEffect, useRef, useState } from 'react'
import { CROPS, CROP_BY_ID } from '../data/crops'
import { DISEASES, SYMPTOMS, HEALTHY } from '../data/diseases'
import { api } from '../lib/core'

// Crops our trained CNN (PlantVillage) knows. Everything else uses the rule-based symptom checker.
const CNN_CROPS = new Set(['maize', 'tomato'])

// Rule-based fallback: colour shares of leaf pixels plus ticked symptoms.
function analyse(img) {
  const S = 120, cv = document.createElement('canvas'); cv.width = cv.height = S
  const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, S, S)
  const { data } = ctx.getImageData(0, 0, S, S)
  const c = { green: 0, yellow: 0, brown: 0, dark: 0, white: 0 }; let leaf = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, v = mx, s = mx ? d / mx : 0
    let h = 0; if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60
    if (s < .12 && v > .78) continue
    leaf++
    if (v < .22) c.dark++
    else if (s < .2 && v > .7) c.white++
    else if (h >= 65 && h <= 170 && s > .22) c.green++
    else if (h >= 40 && h < 65 && s > .35) c.yellow++
    else if (h >= 8 && h < 40 && s > .25) c.brown++
    else c.dark += .3
  }
  const f = {}; for (const k in c) f[k] = leaf ? c[k] / leaf : 0
  return f
}

function rank(cropId, syms, px) {
  const pool = DISEASES.filter(d => !cropId || d.crop.includes(cropId))
  const scored = pool.map(d => {
    const hit = d.tags.filter(t => syms.includes(t)).length
    const sym = syms.length ? hit / Math.max(d.tags.length, 1) * 0.6 + hit / syms.length * 0.4 : 0
    let col = 0
    if (px) { for (const [k, w] of Object.entries(d.sig)) col += Math.min(px[k] / w, 1) * w; col = Math.min(col / Object.values(d.sig).reduce((a, b) => a + b, 0), 1) }
    return { d, score: px && syms.length ? sym * 0.65 + col * 0.35 : px ? col : sym }
  }).sort((a, b) => b.score - a.score)
  return scored.filter(s => s.score > 0.12).slice(0, 3)
}

const pct = (p) => `${(p * 100).toFixed(p > .995 ? 1 : 0)}%`

function AiResult({ r, info }) {
  const best = r.top[0]
  return <div className="dx fade-in">
    <div className="dx-h">
      <div><div className="eyebrow"><span className="pill g" style={{ marginRight: 8 }}>AI model</span>{r.status === 'ok' ? 'Most likely' : r.status === 'not_leaf' ? 'Rejected photo' : 'Uncertain'} · {best.crop}</div>
        <h4 style={{ marginTop: 6 }}>{r.status === 'not_leaf' ? 'No leaf found in this photo' : r.status === 'uncertain' ? 'Not sure. Please retake the photo' : best.isHealthy ? 'Healthy leaf' : best.advice?.name || best.condition}</h4></div>
      <div className="conf">{r.status === 'not_leaf' ? '—' : pct(r.confidence)}<small>model confidence</small></div>
    </div>
    <div className="dx-b">
      {r.status !== 'not_leaf' && <div><h5>Top predictions{r.restrictedTo ? ` within ${r.restrictedTo}` : ''}</h5>{r.top.map(t => <div className="pxbar" key={t.className} style={{ gridTemplateColumns: '180px 1fr 52px' }}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.crop} · {t.condition}</span><div><i style={{ width: `${t.probability * 100}%`, background: t === best ? 'var(--leaf)' : 'var(--ink-3)', transition: 'width .8s' }} /></div><span>{pct(t.probability)}</span></div>)}</div>}
      {r.note && <div className="verdict-line">{r.note}</div>}
      {r.quality.warnings.length > 0 && <div className="verdict-line">Photo check: {r.quality.warnings.join(' · ')}</div>}
      {r.status === 'ok' && !best.isHealthy && best.advice && <>
        <div><h5>Severity</h5><div className="meter">{[1, 2, 3, 4, 5].map(n => <i key={n} className={n <= best.advice.severity ? 'on' : ''} />)}</div></div>
        <div><h5>What to do ({best.advice.kind})</h5><ul>{best.advice.action.map(a => <li key={a}>{a}</li>)}</ul></div>
        <div><h5>Prevent it next time</h5><p>{best.advice.prevent}</p></div>
      </>}
      {r.status === 'ok' && best.isHealthy && <p>No disease detected. Keep scouting weekly.</p>}
      <p className="note-data">{info ? `${info.model} · ${info.classes} classes · ${(info.testAccuracy * 100).toFixed(1)}% accuracy on its test set` : 'MobileNetV2 leaf classifier'}{r.restrictedTo ? ` · limited to ${r.restrictedTo} classes` : ''}. Trained on PlantVillage photos taken on plain backgrounds, so field photos are harder: treat it as a strong hint, not a lab test.</p>
    </div>
  </div>
}

export default function DoctorView() {
  const [crop, setCrop] = useState('')
  const [syms, setSyms] = useState([])
  const [img, setImg] = useState(null), [file, setFile] = useState(null), [px, setPx] = useState(null), [busy, setBusy] = useState(false)
  const [ai, setAi] = useState(null), [rules, setRules] = useState(null), [err, setErr] = useState(null), [info, setInfo] = useState(null)
  const fileRef = useRef()
  useEffect(() => { api('/disease/info').then(setInfo).catch(() => {}) }, [])
  const useCnn = !crop || CNN_CROPS.has(crop)

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    const url = URL.createObjectURL(f), im = new Image()
    im.onload = () => {
      setImg(url); setFile(f); setAi(null); setRules(null); setErr(null)
      const a = analyse(im); setPx(a)
      const auto = []
      if (a.yellow > .16) auto.push('yellow'); if (a.brown + a.dark > .12) auto.push('spots'); if (a.white > .14) auto.push('powder')
      setSyms(s => [...new Set([...s, ...auto])])
    }
    im.src = url
  }
  const run = async () => {
    setBusy(true); setErr(null); setAi(null); setRules(null)
    try {
      if (useCnn && file) {
        const form = new FormData(); form.append('image', file); if (crop) form.append('crop', crop)
        setAi(await api('/disease', { form }))
      }
      if (!useCnn || !file) setRules(rank(crop, syms, px))
    } catch (e) { setErr(e.message); setRules(rank(crop, syms, px)) }
    setBusy(false)
  }
  const toggle = (id) => setSyms(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  return (
    <div className="wrap">
      <section className="sec" style={{ borderTop: 0 }}>
        <div className="sec-head"><div className="idx">03</div><div><div className="eyebrow">Disease Doctor</div><h2>Photograph the leaf. <em>Name the problem.</em></h2>
          <p>For maize and tomato, your photo goes to a trained neural network (MobileNetV2, 38 leaf classes). For other crops, a rule-based checker matches leaf colours and the symptoms you tick against our disease library.</p></div></div>
        <div className="doc-grid">
          <div>
            <div className="eyebrow">1 · Crop</div>
            <select className="sel" value={crop} onChange={e => { setCrop(e.target.value); setAi(null); setRules(null) }} aria-label="crop"><option value="">Not sure / any crop</option>{CROPS.map(c => <option key={c.id} value={c.id}>{c.name} · {c.kn}{CNN_CROPS.has(c.id) ? '  (AI model)' : ''}</option>)}</select>
            <p className="lab-note">{useCnn ? 'Diagnosis by the trained AI model.' : `${CROP_BY_ID[crop].name.split(' (')[0]} is not in the AI model's training data, so the rule-based checker is used.`}</p>
            <div className="eyebrow" style={{ marginTop: 20 }}>2 · Photo</div>
            <div className="drop" style={{ marginTop: 10 }} onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
              {img ? <><img src={img} alt="Uploaded leaf" />{busy && <div className="scanline" />}</> : <div><div className="serif" style={{ fontSize: 28 }}>Drop a leaf photo</div><div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>CLICK TO CHOOSE · JPG / PNG</div></div>}
            </div>
          </div>
          <div>
            {!useCnn && <><div className="eyebrow">3 · What else do you see?</div>
              <div className="sym">{SYMPTOMS.map(s => <button key={s.id} className={syms.includes(s.id) ? 'on' : ''} onClick={() => toggle(s.id)}>{s.label}</button>)}</div></>}
            <div className="cta-row"><button className="btn" onClick={run} disabled={busy || (useCnn ? !file : (!px && !syms.length))} style={(useCnn ? !file : (!px && !syms.length)) ? { opacity: .4 } : {}}>{busy ? 'Analysing…' : 'Diagnose'} <span>→</span></button>
              <button className="chip" onClick={() => { setSyms([]); setPx(null); setImg(null); setFile(null); setAi(null); setRules(null); setErr(null) }}>Reset</button></div>
            <div style={{ marginTop: 26 }}>
              {err && <div className="verdict-line">{err}{rules ? ' Showing the rule-based checker instead.' : ''}</div>}
              {ai && <AiResult r={ai} info={info} />}
              {rules && rules.length === 0 && <div className="dx fade-in"><div className="dx-h"><h4>{HEALTHY.name}</h4></div><div className="dx-b"><p>{HEALTHY.note}</p></div></div>}
              {rules?.map(({ d, score }, i) => (
                <div className="dx fade-in" key={d.id} style={{ animationDelay: `${i * .1}s` }}>
                  <div className="dx-h"><div><div className="eyebrow"><span className="pill y" style={{ marginRight: 8 }}>Rule-based</span>{i === 0 ? 'Best match' : 'Also consider'} · {d.kind}</div><h4 style={{ marginTop: 6 }}>{d.name}</h4><div className="serif" style={{ color: 'var(--ink-3)' }}>{d.kn}</div></div>
                    <div className="conf">{Math.round(score * 100)}<small>match score</small></div></div>
                  <div className="dx-b">
                    <div><h5>Severity</h5><div className="meter">{[1, 2, 3, 4, 5].map(n => <i key={n} className={n <= d.severity ? 'on' : ''} />)}</div></div>
                    <div><h5>What it looks like</h5><p>{d.look}</p></div>
                    <div><h5>Why it happens</h5><p>{d.cause}</p></div>
                    <div><h5>Organic first</h5><ul>{d.organic.map(o => <li key={o}>{o}</li>)}</ul></div>
                    <div><h5>If it spreads</h5><ul>{d.chem.map(o => <li key={o}>{o}</li>)}</ul></div>
                    <div><h5>Prevent it next time</h5><p>{d.prevent}</p></div>
                  </div>
                </div>))}
              <p className="warn">Decision support, not a lab test. Read the pesticide label, wear protection, and confirm with your nearest KVK before spraying. Kisan Call Centre: 1800-180-1551 (toll-free).</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
