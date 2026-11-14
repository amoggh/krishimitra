import { useEffect, useState } from 'react'
import { defaultSeason } from './lib/core'
import { Form, Results, Playbook, PRESETS } from './views/PlanView'
import LearnView from './views/LearnView'
import DoctorView from './views/DoctorView'
import MandiView from './views/MandiView'
import SupportView from './views/SupportView'
import Assistant from './ui/Assistant'
import { api } from './lib/core'

const TABS = [['plan', 'Plan', '01'], ['learn', 'Learn', '02'], ['doctor', 'Doctor', '03'], ['mandi', 'Mandi', '04'], ['support', 'Support', '05']]
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }

export default function App() {
  const [tab, setTab] = useState(() => (location.hash.slice(1) || 'plan'))
  const [form, setForm] = useState(() => load('km-form', PRESETS[0].v))
  const [season, setSeason] = useState(() => load('km-season', defaultSeason()))
  const [submitted, setSubmitted] = useState(null)
  const [pb, setPb] = useState(null)
  const [health, setHealth] = useState(null)
  useEffect(() => { api('/health').then(setHealth).catch(() => setHealth({ down: true })) }, [])
  const nav = (id) => {
    if (id !== tab) setTab(id)
  }
  useEffect(() => { location.hash = tab; window.scrollTo({ top: 0 }) }, [tab])
  useEffect(() => {
    const on = () => { const h = location.hash.slice(1); if (TABS.some(t => t[0] === h)) setTab(h) }
    addEventListener('hashchange', on); return () => removeEventListener('hashchange', on)
  }, [])
  useEffect(() => { try { localStorage.setItem('km-form', JSON.stringify(form)); localStorage.setItem('km-season', JSON.stringify(season)) } catch {} }, [form, season])
  const go = () => { setSubmitted({ ...form, acres: Number(form.acres) || 1, budget: Number(form.budget) || 0, hours: Number(form.hours) || 1 }); setTimeout(() => document.getElementById('result-anchor')?.scrollIntoView({ behavior: 'smooth' }), 60) }
  return (
    <>
      <header className="mast">
        <div className="wrap">
          <div className="mast-top">
            <div className="brand" onClick={() => nav('plan')}><b>Krishi<i>Mitra</i></b><span>ಕೃಷಿ ಮಿತ್ರ</span></div>
            <div className="mast-meta">{health?.down ? <span style={{ color: 'var(--clay)' }}>Server offline</span> : health ? <span className="ai-status" title="Model status from /api/health">
              <i className={health.models.yield.ready ? 'on' : ''}>Yield</i><i className={health.models.price.trained ? 'on' : ''}>Price</i><i className="on">Vision</i><i className={health.models.chat.ready ? 'on' : ''}>Chat</i></span> : null}</div>
          </div>
          <nav className="nav">{TABS.map(([id, label, n]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => nav(id)}><em>{n}</em>{label}</button>)}</nav>
        </div>
      </header>

      {tab === 'plan' && <main>
        <section className="hero">
          <div className="wrap">
            <div>
              <div className="eyebrow" style={{ color: 'var(--leaf)', marginBottom: 18 }}>Farm planning for first-time farmers · Karnataka</div>
              <h1>Your first harvest, <em>planned with real data.</em></h1>
              <p className="hero-sub">Describe your land, water and budget. KrishiMitra works out what to grow, how to split the field, what it will cost and what could go wrong, before you spend a rupee.</p>
              <div className="proof">
                <div><b>1.1M</b><span>government mandi prices, 2001–2026</span></div>
                <div><b>99%</b><span>leaf-disease model test accuracy</span></div>
                <div><b>500</b><span>simulated seasons per plan</span></div>
              </div>
            </div>
            <Form value={form} onChange={setForm} onGo={go} season={season} setSeason={setSeason} />
          </div>
        </section>
        <div id="result-anchor" />
        {submitted && <Results inp={submitted} season={season} onPlaybook={setPb} />}
        {!submitted && <div className="wrap"><div className="sec" style={{ paddingTop: 30 }}>
          <div className="sec-head"><div className="idx">?</div><div><div className="eyebrow">How it works</div><h2>Four checks before a single seed</h2></div></div>
          <div className="schemes" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
            {[['Water budget', 'Pump HP, hours, borewell depth and irrigation type become litres, then millimetres on your field.'], ['Agronomy filter', 'Season, soil pH, skill level and budget rule crops out, each with a written reason.'], ['500 simulated seasons', 'Rain, yield, price and cost are randomised to show the bad year, not just the average.'], ['Pareto land split', 'We search thousands of field layouts and let you slide between safe and ambitious.']].map(([t, p], i) =>
              <div className="scheme" key={t}><div className="eyebrow" style={{ color: 'var(--leaf)' }}>Step {i + 1}</div><h3 style={{ marginTop: 8 }}>{t}</h3><p>{p}</p></div>)}</div></div></div>}
        {pb && submitted && <Playbook c={pb} inp={submitted} onClose={() => setPb(null)} />}
      </main>}
      {tab === 'learn' && <LearnView />}
      {tab === 'doctor' && <DoctorView />}
      {tab === 'mandi' && <MandiView />}
      {tab === 'support' && <SupportView />}

      <Assistant />
      <footer className="foot"><div className="wrap"><b>KrishiMitra</b> · Soil &amp; nutrient profiles from a 10,000-row Karnataka agronomy dataset · Rain from IMD normals · Live prices and price history from AGMARKNET (data.gov.in) · Yield and price models trained on Karnataka data · Leaf disease model: MobileNetV2 · Latest announced MSP · Planning aid, not financial advice. Verify with your local Raitha Samparka Kendra.</div></footer>
    </>
  )
}
