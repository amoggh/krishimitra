import { useEffect, useMemo, useState } from 'react'
import { LESSONS, GLOSSARY, LESSON_EXTRA } from '../data/learn'
import { CROPS, CROP_BY_ID } from '../data/crops'
import { LABS } from './labs'
import Plant, { plantKind } from '../ui/Plant'
import { Reveal } from '../ui/motion'

const ls = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}
export function ytId(url) {
  try {
    const u = new URL(url.trim())
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0]
    if (u.pathname.startsWith('/watch')) return u.searchParams.get('v')
    const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]{6,})/); if (m) return m[2]
  } catch {}
  return null
}

// The course map: one plant that climbs out of the soil as lessons are finished.
function Climb({ cur, done, onPick }) {
  const n = LESSONS.length, base = 668, top = 66, y = i => base - 50 - i * ((base - 50 - top) / (n - 1))
  const stemLen = 640, finished = done.length / n
  return <div className="climb">
    <svg viewBox="0 0 340 760" role="group" aria-label="Course progress">
      <rect x="0" y={base} width="340" height="92" fill="#B9A67A" /><line x1="0" x2="340" y1={base} y2={base} stroke="#171A17" strokeWidth="1.5" />
      <g stroke="#171A17" fill="none" strokeWidth="1.2">{[-60, -36, -14, 12, 34, 62].map(d => <path key={d} d={`M170 ${base}Q${170 + d * .5} ${base + 34} ${170 + d} ${base + 74}`} />)}</g>
      <path d={`M170 ${base}C150 540 190 420 170 300S170 120 170 ${top - 20}`} fill="none" stroke="#D6CBAE" strokeWidth="6" />
      <path className="stem" d={`M170 ${base}C150 540 190 420 170 300S170 120 170 ${top - 20}`} fill="none" stroke="#1F5A44" strokeWidth="6" strokeLinecap="round" strokeDasharray={stemLen} strokeDashoffset={stemLen * (1 - Math.max(.04, finished))} />
      {finished === 1 && <g className="fade-in">{Array.from({ length: 22 }, (_, i) => <circle key={i} cx={170 + Math.cos(i * 2.4) * (3 + i * .55)} cy={top - 28 - i * 2} r="5" fill="#B5532F" stroke="#171A17" strokeWidth=".7" />)}</g>}
      {LESSONS.map((L, i) => {
        const side = i % 2 ? 1 : -1, yy = y(i), isDone = done.includes(L.id), on = cur === i, tipX = 170 + side * 76
        return <g key={L.id} className="node" role="button" tabIndex={0} aria-label={`Lesson ${L.n}: ${L.title}${isDone ? ', completed' : ''}`} onClick={() => onPick(i)} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick(i))}>
          <path className="lf" d={`M170 ${yy}Q${170 + side * 34} ${yy - 42} ${tipX} ${yy - 14}Q${170 + side * 42} ${yy + 16} 170 ${yy}Z`} fill={isDone ? '#1F5A44' : on ? '#B8862F' : '#EEECE5'} stroke="#171A17" strokeWidth="1.4" />
          {on && <circle className="cur" cx={tipX} cy={yy - 14} r="7" fill="#B4532A" />}
          <text x={tipX + side * 12} y={yy - 16} textAnchor={side > 0 ? 'start' : 'end'} fontSize="12" fontFamily="Inter" fill="#888E87">{L.n}</text>
          <text x={tipX + side * 12} y={yy + 2} textAnchor={side > 0 ? 'start' : 'end'} fontSize="13.5" fontFamily="Inter, sans-serif" fontWeight={on ? 600 : 400} fill="#171A17">{L.title.split(' ').slice(0, 1).join(' ')}<tspan x={tipX + side * 12} dy="15">{L.title.split(' ').slice(1).join(' ')}</tspan></text>
        </g>
      })}
    </svg>
  </div>
}

function Lesson({ L, done, onDone, onNext }) {
  const [ans, setAns] = useState({})
  const allRight = L.quiz.every((q, i) => ans[i] === q.c), x = LESSON_EXTRA[L.id], LabC = LABS[L.id]
  useEffect(() => { setAns({}) }, [L.id])
  return (
    <div className="prose fade-in" key={L.id}>
      <div className="eyebrow">Lesson {L.n} · {L.min} min</div>
      <h3 style={{ marginTop: 8 }}>{L.title}</h3>
      <p className="lead">{L.lead}</p>
      <LabC />
      <div className="num3">{x.numbers.map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}</div>
      <div className="eyebrow">What to know</div>
      <ol style={{ marginTop: 8 }}>{L.points.map((p, i) => <li key={i}>{p}</li>)}</ol>
      <div className="eyebrow" style={{ marginTop: 18 }}>Rookie mistakes</div>
      <ul className="mist">{x.mistakes.map(m => <li key={m}>{m}</li>)}</ul>
      <div className="task"><div className="eyebrow">Do this today</div><p>{L.task}</p></div>
      <div className="quiz">
        <div className="eyebrow" style={{ marginBottom: 6 }}>Check yourself</div>
        {L.quiz.map((q, qi) => (
          <div className="q" key={qi}><b>{q.q}</b>
            {q.a.map((o, oi) => <button key={oi} className={`opt ${ans[qi] === undefined ? '' : oi === q.c && ans[qi] === oi ? 'right' : ans[qi] === oi ? 'wrong' : ''}`} onClick={() => setAns({ ...ans, [qi]: oi })}>{o}</button>)}
          </div>))}
      </div>
      <div className="cta-row">
        <button className={`btn ${done ? 'ghost' : ''}`} onClick={() => { const was = done; onDone(); if (!was) onNext() }} disabled={!allRight && !done} style={!allRight && !done ? { opacity: .45, cursor: 'not-allowed' } : {}}>{done ? 'Completed. Undo' : allRight ? 'Complete and grow a leaf' : 'Answer the quiz to complete'}</button>
        <a className="btn ghost sm" target="_blank" rel="noreferrer" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(L.query)}`}>Find videos on this ↗</a>
      </div>
    </div>
  )
}

// Drag through a whole crop life: plant, week, and the job for that week.
function CropScrubber() {
  const [id, setId] = useState('ragi'), [wk, setWk] = useState(0), [play, setPlay] = useState(false)
  const c = CROP_BY_ID[id], last = c.plan[c.plan.length - 1][0] + 1
  useEffect(() => { setWk(0); setPlay(true) }, [id])
  useEffect(() => {
    if (!play) return
    const i = setInterval(() => setWk(w => { if (w >= last) { setPlay(false); return w } return w + .25 }), Math.max(30, 3600 / (last * 4)))
    return () => clearInterval(i)
  }, [play, last])
  const stage = useMemo(() => { let s = c.plan[0]; for (const p of c.plan) if (p[0] <= wk) s = p; return s }, [c, wk])
  return <div className="scrub">
    <div style={{ maxWidth: 320, background: '#F4F2EC', borderRadius: 14, overflow: 'hidden' }}><Plant g={Math.min(1, .02 + wk / last)} kind={plantKind(id)} hue={c.hue} label={`${c.name} at week ${Math.round(wk)}`} /></div>
    <div>
      <div className="seg">{CROPS.map(x => <button key={x.id} className={`chip ${x.id === id ? 'on' : ''}`} onClick={() => setId(x.id)}>{x.name.split(' (')[0]}</button>)}</div>
      <div className="eyebrow" style={{ marginTop: 10 }}>Week {Math.round(wk)} of {last} · {c.kn}</div>
      <div className="serif" style={{ fontSize: 40, letterSpacing: '-.03em', lineHeight: 1.05, marginTop: 4 }}>{stage[1]}</div>
      <p style={{ marginTop: 8, minHeight: 50, color: 'var(--ink-2)' }}>{stage[2]}</p>
      <div className="scrub-track">
        {c.plan.map(p => <i key={p[0]} className={p[0] <= wk ? 'on' : ''} style={{ left: `${p[0] / last * 100}%` }} title={p[1]} onClick={() => { setPlay(false); setWk(p[0]) }} />)}
        <input type="range" min="0" max={last} step=".25" value={wk} onChange={e => { setPlay(false); setWk(Number(e.target.value)) }} aria-label="week of the season" />
      </div>
      <div className="read"><div><span>Days to harvest</span><b>{c.days}</b></div><div><span>Water use</span><b>{c.etc} mm</b></div><div><span>Seed and spacing</span><b style={{ fontSize: 15, fontFamily: 'var(--sans)' }}>{c.seed}</b></div></div>
      <div className="cta-row" style={{ marginTop: 12 }}><button className="btn sm" onClick={() => { if (wk >= last) setWk(0); setPlay(p => !p) }}>{play ? 'Pause' : 'Play the season'}</button></div>
    </div>
  </div>
}

export default function LearnView() {
  const [cur, setCur] = useState(0)
  const [done, setDone] = useState(() => ls.get('km-lessons', []))
  const [url, setUrl] = useState('')
  const [shelf, setShelf] = useState(() => { const old = ytId(ls.get('km-yt', '') || ''); return ls.get('km-shelf', old ? [old] : []) })
  const [vid, setVid] = useState(() => ls.get('km-shelf', [])[0] || ytId(ls.get('km-yt', '') || ''))
  const [notes, setNotes] = useState(() => ls.get('km-notes', ''))
  const [bad, setBad] = useState(false), [q, setQ] = useState(''), [flip, setFlip] = useState(null)
  useEffect(() => ls.set('km-lessons', done), [done])
  useEffect(() => ls.set('km-notes', notes), [notes])
  useEffect(() => ls.set('km-shelf', shelf), [shelf])
  const load = () => { const id = ytId(url); setBad(!id); if (id) { setVid(id); setShelf(s => [id, ...s.filter(x => x !== id)].slice(0, 12)); setUrl('') } }
  const L = LESSONS[cur], gloss = GLOSSARY.filter(([k, v]) => (k + v).toLowerCase().includes(q.toLowerCase()))
  const pick = (i) => { setCur(i); document.getElementById('lesson-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  return (
    <div className="wrap">
      <section className="sec" style={{ borderTop: 0 }}>
        <div className="sec-head"><div className="idx">01</div><div><div className="eyebrow">The Academy · 8 lessons</div><h2>Farming from zero, <em>by doing it</em></h2>
          <p>Eight lessons, eight working models. Pour water on soil, walk a field for pests, dry a harvest, play a market.</p></div></div>
        <div className="learn2" id="lesson-top" style={{ scrollMarginTop: 130 }}>
          <nav className="chipline" aria-label="Lessons">
            <div className="course-prog"><span>{done.length} of {LESSONS.length} complete</span><i><b style={{ width: `${done.length / LESSONS.length * 100}%` }} /></i></div>
            {LESSONS.map((x, i) => <button key={x.id} className={`chip ${i === cur ? 'on' : ''}`} onClick={() => setCur(i)}><em>{done.includes(x.id) ? '✓' : x.n}</em>{x.title}</button>)}
          </nav>
          <div style={{ minWidth: 0 }}>
            <Lesson L={L} done={done.includes(L.id)} onDone={() => setDone(d => d.includes(L.id) ? d.filter(x => x !== L.id) : [...d, L.id])} onNext={() => cur < LESSONS.length - 1 && pick(cur + 1)} />
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="sec-head"><div className="idx">02</div><div><div className="eyebrow">Crop atlas</div><h2>Watch a crop <em>live its whole life</em></h2><p>Drag through any crop, week by week, and see the job that week demands.</p></div></div>
        <Reveal><CropScrubber /></Reveal>
      </section>

      <section className="sec">
        <div className="sec-head"><div className="idx">03</div><div><div className="eyebrow">Your video shelf</div><h2>Paste a <em>YouTube link</em>, keep a shelf</h2>
          <p>Save tutorials from farmers and agricultural universities, then watch with your notebook open beside them. Everything stays on this device.</p></div></div>
        <div className="video" style={{ marginTop: 0 }}>
          <div>
            <div className="urlbar"><input value={url} onChange={e => { setUrl(e.target.value); setBad(false) }} onKeyDown={e => e.key === 'Enter' && load()} placeholder="https://www.youtube.com/watch?v=…" aria-label="YouTube link" /><button onClick={load}>Add</button></div>
            {bad && <p style={{ color: 'var(--clay)', fontSize: 13, marginTop: 8 }}>That does not look like a YouTube link. Try one that begins with youtube.com/watch or youtu.be.</p>}
            <div className="player" style={{ marginTop: 14 }}>{vid ? <iframe src={`https://www.youtube-nocookie.com/embed/${vid}`} title="Tutorial" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen /> : <div><div className="serif" style={{ fontSize: 26 }}>Your tutorial plays here</div><div className="mono" style={{ fontSize: 12, opacity: .7, marginTop: 6 }}>PASTE A LINK ABOVE</div></div>}</div>
            {shelf.length > 0 && <div className="shelf">{shelf.map(id => <div key={id} className={id === vid ? 'on' : ''}><img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="Saved video" onClick={() => setVid(id)} /><button className="rm" aria-label="Remove video" onClick={() => { setShelf(s => s.filter(x => x !== id)); if (vid === id) setVid(null) }}>✕</button></div>)}</div>}
            <div className="presets" style={{ marginTop: 14 }}><span className="eyebrow">Search YouTube</span>
              {['ragi cultivation Karnataka', 'drip irrigation setup small farm', 'organic farming for beginners', 'how to sell at APMC mandi'].map(s => <a key={s} className="chip" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(s)}`}>{s} ↗</a>)}</div>
          </div>
          <div><div className="eyebrow">Field notebook</div><textarea className="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Write down what you learn: seed rate, spacing, what to ask at the RSK…" aria-label="notes" /></div>
        </div>
      </section>

      <section className="sec">
        <div className="sec-head"><div className="idx">04</div><div><div className="eyebrow">Plain-language glossary</div><h2>Words the <em>old hands</em> use</h2></div></div>
        <div className="urlbar" style={{ maxWidth: 420, marginBottom: 16 }}><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search a word…" aria-label="Search glossary" /></div>
        <div className="flips">{gloss.map(([k, v]) => <button key={k} className={`flipc ${flip === k ? 'on' : ''}`} onClick={() => setFlip(flip === k ? null : k)}><span><em>{k}</em><u>{v}</u></span></button>)}</div>
      </section>
    </div>
  )
}
