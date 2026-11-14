// Shared constants and formatting for the UI. Planning maths lives in the Python API (server/app/services/planner.py).
export const PUMP_LPH_PER_HP = { 1: [500, 800], 2: [1000, 1600], 3: [1500, 2400], 5: [2500, 4000], 7.5: [3750, 6000], 10: [5000, 8000] }
export const IRR_EFF = { flood: 0.55, sprinkler: 0.8, drip: 0.92 }
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const EXPERIENCE = {
  none: { label: 'never farmed', maxCrops: 3 },
  some: { label: 'a little', maxCrops: 4 },
  pro: { label: 'for years', maxCrops: 5 },
}

export const inr = (n) => {
  const s = Math.round(Math.abs(n)), sign = n < 0 ? '-' : ''
  if (s >= 10000000) return `${sign}₹${(s / 10000000).toFixed(2)} Cr`
  if (s >= 100000) return `${sign}₹${(s / 100000).toFixed(2)} L`
  return `${sign}₹${s.toLocaleString('en-IN')}`
}

export const defaultSeason = () => { const m = new Date().getMonth() + 1; return m >= 6 && m <= 9 ? 'kharif' : m >= 10 || m <= 1 ? 'rabi' : 'summer' }

// Small fetch helper: JSON in, JSON out, readable errors.
export async function api(path, { body, method, form } = {}) {
  const opts = { method: method || (body || form ? 'POST' : 'GET') }
  if (form) opts.body = form
  else if (body) { opts.body = JSON.stringify(body); opts.headers = { 'Content-Type': 'application/json' } }
  let r
  try { r = await fetch(`/api${path}`, opts) } catch { throw new Error('Cannot reach the KrishiMitra server. Is it running on port 8000?') }
  if (!r.ok) {
    let msg = `${r.status}`
    try { const j = await r.json(); msg = j.detail || msg } catch {}
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return r.json()
}
