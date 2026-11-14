import { SCHEMES } from '../data/learn'

export default function SupportView() {
  return (
    <div className="wrap">
      <section className="sec" style={{ borderTop: 0 }}>
        <div className="sec-head"><div className="idx">06</div><div><div className="eyebrow">Money &amp; help</div><h2>Schemes that <em>pay you</em> to start</h2>
          <p>Most new farmers miss these. Check eligibility with your local Raitha Samparka Kendra (RSK) or CSC before applying; rules and amounts are revised from time to time.</p></div></div>
        <div className="schemes">{SCHEMES.map(s => <div className="scheme" key={s.name}><h3>{s.name}</h3><p>{s.what}</p><p className="how"><b>How to get it:</b> {s.how}</p></div>)}</div>
        <div className="task" style={{ marginTop: 40, display: 'flex', gap: 30, flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div><div className="eyebrow">Stuck? Ask a real person</div><p>Kisan Call Centre. Free, in Kannada, 6am to 10pm.</p></div>
          <div className="num" style={{ fontSize: 48, color: 'var(--gold)' }}>1800-180-1551</div>
        </div>
      </section>
    </div>
  )
}
