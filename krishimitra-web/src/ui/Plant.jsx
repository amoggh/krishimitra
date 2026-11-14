// Procedural plant: one drawing that can be scrubbed through a whole crop life or stressed by nutrients.
const GRASS = new Set(['ragi', 'maize', 'paddy', 'jowar', 'sugarcane'])
export const plantKind = (id) => GRASS.has(id) ? 'grass' : 'broad'

const mix = (a, b, t) => {
  const p = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b)
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`
}

export default function Plant({ g = 1, kind = 'grass', hue = '#B5532F', height = 1, roots = 1, fruit = 1, tilt = 0, yellow = 0, purple = 0, scorch = 0, pests = 0, sway = true, label }) {
  const base = 232, H = Math.max(3, g * height * 186)
  const senes = Math.max(0, (g - .86) / .14) * .75
  const leaf = purple > .05 ? mix('#1F5A44', '#6C3A6E', Math.min(1, purple)) : mix('#1F5A44', '#C9A227', Math.min(1, yellow + senes))
  const n = Math.max(1, Math.floor(2 + g * 9))
  const leaves = []
  for (let i = 0; i < n; i++) {
    const f = (i + 1) / (n + 1), y = base - H * f, side = i % 2 ? 1 : -1, grow = Math.min(1, g * 2.4 - f * .55)
    if (grow <= 0) continue
    if (kind === 'grass') {
      const L = (46 + 62 * (1 - f * .55)) * grow * Math.min(1.25, height), dx = side * L, dy = L * .28
      leaves.push(<path key={i} d={`M100 ${y}Q${100 + dx * .5} ${y - L * .55} ${100 + dx} ${y + dy}Q${100 + dx * .42} ${y - L * .28} 100 ${y + 9}Z`} fill={leaf} fillOpacity=".92" />)
      if (scorch > .05) leaves.push(<circle key={`s${i}`} cx={100 + dx} cy={y + dy} r={2 + scorch * 5} fill="#7A4A25" />)
    } else {
      const L = (19 + 24 * (1 - f * .4)) * grow * Math.min(1.25, height), cx = 100 + side * L * 1.05, cy = y - 4
      leaves.push(<g key={i}><line x1="100" y1={y} x2={cx} y2={cy} stroke={leaf} strokeWidth="1.2" /><ellipse cx={cx} cy={cy} rx={L} ry={L * .56} fill={leaf} fillOpacity=".92" transform={`rotate(${side * -18} ${cx} ${cy})`} />{scorch > .05 && <circle cx={cx + side * L * .82} cy={cy} r={2 + scorch * 4} fill="#7A4A25" />}</g>)
    }
  }
  const showFruit = g > .68, fp = Math.min(1, (g - .68) / .22) * fruit, topY = base - H
  const dots = []
  if (showFruit && fp > .02) {
    if (kind === 'grass') for (let i = 0; i < 18; i++) { const a = i * 2.4, r = 2 + i * .9; dots.push(<circle key={i} cx={100 + Math.cos(a) * r * .55} cy={topY - 5 - i * 1.5 * fp} r={2.4 + fp * 1.8} fill={hue} />) }
    else for (let i = 0; i < 5; i++) { const y = base - H * (.5 + i * .11), s = i % 2 ? 1 : -1; dots.push(<ellipse key={i} cx={100 + s * 11} cy={y + 15} rx={4 + fp * 2.5} ry={8 + fp * 6} fill={hue} />) }
  }
  const rootN = 5 + Math.round(roots * 4)
  const rootL = (18 + 66 * g) * Math.max(.25, roots)
  const bugs = Array.from({ length: Math.round(pests * 14) }, (_, i) => <circle key={i} cx={100 + Math.sin(i * 7.3) * 56} cy={base - H * (.2 + ((i * .37) % .7))} r="2.4" fill="#3A2E25" />)
  return (
    <svg viewBox="0 0 200 320" className="plant" role="img" aria-label={label || 'Plant illustration'}>
      <defs><linearGradient id="soilg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E3DACB" /><stop offset="1" stopColor="#F2EEE6" /></linearGradient></defs>
      <rect x="0" y={base} width="200" height={320 - base} fill="url(#soilg)" />
      <line x1="0" y1={base} x2="200" y2={base} stroke="#8C7B63" strokeOpacity=".5" strokeWidth="1" />
      <g stroke="#8C7B63" strokeOpacity=".7" strokeWidth=".9" fill="none" strokeLinecap="round" className="plant-roots">
        {Array.from({ length: rootN }, (_, i) => { const a = (i - (rootN - 1) / 2) / rootN * 1.8; return <path key={i} d={`M100 ${base}Q${100 + a * rootL * .3} ${base + rootL * .45} ${100 + a * rootL * .75} ${base + rootL * .85}`} /> })}
      </g>
      <g className={sway ? 'plant-sway' : ''} style={{ transformOrigin: `100px ${base}px`, rotate: `${tilt}deg` }}>
        <path d={`M100 ${base}L100 ${topY}`} stroke={leaf} strokeWidth={kind === 'grass' ? 5 : 4} strokeLinecap="round" />
        {leaves}{dots}{bugs}
      </g>
    </svg>
  )
}
