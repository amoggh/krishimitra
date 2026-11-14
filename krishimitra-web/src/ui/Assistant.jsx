import { useEffect, useRef, useState } from 'react'
import { getPlanContext } from '../lib/planContext'

const SUGGEST = ['What should I do in my first week?', 'How much water does my plan need?', 'When should I sell?', 'ನಾನು ರಾಗಿ ಹೇಗೆ ಬೆಳೆಯಲಿ?']

// Floating farm assistant. Streams answers from the API, which grounds the LLM in the user's plan and today's prices.
export default function Assistant() {
  const [open, setOpen] = useState(false), [msgs, setMsgs] = useState([]), [text, setText] = useState(''), [busy, setBusy] = useState(false)
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, open])

  const send = async (q) => {
    const content = (q ?? text).trim(); if (!content || busy) return
    const next = [...msgs, { role: 'user', content }]
    setMsgs([...next, { role: 'assistant', content: '' }]); setText(''); setBusy(true)
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next, context: getPlanContext() }) })
      if (!r.ok) { let m = `Error ${r.status}`; try { m = (await r.json()).detail } catch {} throw new Error(m) }
      const reader = r.body.getReader(), dec = new TextDecoder()
      let acc = ''
      for (;;) {
        const { done, value } = await reader.read(); if (done) break
        acc += dec.decode(value, { stream: true })
        setMsgs(m => [...m.slice(0, -1), { role: 'assistant', content: acc }])
      }
    } catch (e) {
      setMsgs(m => [...m.slice(0, -1), { role: 'assistant', content: e.message.includes('fetch') ? 'Cannot reach the KrishiMitra server.' : e.message, error: true }])
    }
    setBusy(false)
  }

  return <>
    <button className={`ask-fab ${open ? 'on' : ''}`} onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? 'Close ✕' : <>Ask <i>KrishiMitra</i></>}</button>
    {open && <aside className="ask" role="dialog" aria-label="Farm assistant">
      <div className="ask-h"><b>Farm assistant</b><span>AI · grounded in your plan and today's mandi prices</span></div>
      <div className="ask-body">
        {msgs.length === 0 && <div className="ask-empty"><p>Ask anything about growing, water, pests or selling. Make a plan first and I will answer about your farm.</p>
          <div className="seg">{SUGGEST.map(s => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div></div>}
        {msgs.map((m, i) => <div key={i} className={`msg ${m.role} ${m.error ? 'err' : ''}`}>{m.content || <span className="dots3"><i /><i /><i /></span>}</div>)}
        <div ref={end} />
      </div>
      <form className="ask-in" onSubmit={e => { e.preventDefault(); send() }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a question…" aria-label="Question" disabled={busy} />
        <button disabled={busy || !text.trim()}>Send</button>
      </form>
      <p className="ask-foot">AI answers can be wrong. Confirm chemicals and doses with your RSK or KVK.</p>
    </aside>}
  </>
}
