import { useEffect, useMemo, useState } from 'react'
import Icon from './Icons.jsx'
import { Reveal } from './Sections.jsx'
import { createBooking } from '../lib/api.js'
import { SITE } from '../data/site.js'

const TIMES = [
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM',
]

const todayStr = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

const empty = { name: '', phone: '', email: '', for_whom: 'ladies', service: '', date: '', time: '', notes: '' }

export default function Booking({ menu }) {
  const [f, setF] = useState(empty)
  const [state, setState] = useState({ status: 'idle', error: '' })

  useEffect(() => {
    const on = (e) => setF((p) => ({ ...p, for_whom: e.detail.who, service: e.detail.service }))
    // "Book this offer": pre-select the audience and note the offer so the salon knows.
    const offer = (e) =>
      setF((p) => ({ ...p, for_whom: e.detail.who || p.for_whom, service: '', notes: `Offer: ${e.detail.title} (${e.detail.badge})` }))
    window.addEventListener('pick-service', on)
    window.addEventListener('pick-offer', offer)
    return () => {
      window.removeEventListener('pick-service', on)
      window.removeEventListener('pick-offer', offer)
    }
  }, [])

  const groups = useMemo(() => menu[f.for_whom] || [], [menu, f.for_whom])
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value, ...(k === 'for_whom' ? { service: '' } : {}) }))

  async function submit(e) {
    e.preventDefault()
    setState({ status: 'sending', error: '' })
    try {
      await createBooking({ ...f, email: f.email || undefined, notes: f.notes || undefined })
      setState({ status: 'done', error: '' })
      setF(empty)
    } catch (err) {
      setState({ status: 'error', error: err.name === 'AbortError' ? 'The server is waking up — please try again in a moment.' : err.message })
    }
  }

  return (
    <section className="section book" id="book">
      <div className="wrap book-in">
        <Reveal className="book-copy">
          <h2>Book an appointment</h2>
          <p>
            Choose your service, date and time. We will contact you to confirm your slot.
          </p>
          <ul className="ticks">
            <li><Icon name="shield" size={18} /> No payment needed to book</li>
            {SITE.offers?.length > 0 && <li><Icon name="sparkle" size={18} /> Offer prices need a booking before the offer ends</li>}
                        <li><Icon name="users" size={18} /> Booking for the family? Mention it in the notes</li>
          </ul>
        </Reveal>

        <Reveal delay={100} as="form" className="form" onSubmit={submit}>
          {state.status === 'done' ? (
            <div className="success" role="status">
              <span className="ico"><Icon name="sparkle" size={28} /></span>
              <h3>Request received!</h3>
              <p>Thank you. We will contact you to confirm your appointment.</p>
              <button type="button" className="btn btn-ghost sm" onClick={() => setState({ status: 'idle', error: '' })}>
                Book another
              </button>
            </div>
          ) : (
            <>
              <div className="seg full" role="radiogroup" aria-label="Booking for">
                {[
                  ['ladies', 'Ladies'],
                  ['men', 'Gents'],
                ].map(([k, l]) => (
                  <button type="button" key={k} role="radio" aria-checked={f.for_whom === k} className={f.for_whom === k ? 'on' : ''} onClick={() => set('for_whom')({ target: { value: k } })}>
                    {l}
                  </button>
                ))}
              </div>

              <div className="two">
                <label>
                  Full name
                  <input required minLength={2} maxLength={80} value={f.name} onChange={set('name')} autoComplete="name" placeholder="Your name" />
                </label>
                <label>
                  Phone
                  <input required type="tel" inputMode="tel" pattern="[0-9+\-\s]{8,16}" title="Enter a valid phone number" value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="98765 43210" />
                </label>
              </div>

              <label>
                Email <small>(optional)</small>
                <input type="email" maxLength={120} value={f.email} onChange={set('email')} autoComplete="email" placeholder="you@email.com" />
              </label>

              <label>
                Service
                <select required value={f.service} onChange={set('service')}>
                  <option value="" disabled>Choose a service…</option>
                  {groups.map((g) => (
                    <optgroup key={g.id} label={g.title}>
                      {g.items.map((i) => (
                        <option key={i.name} value={`${g.title} — ${i.name}`}>{i.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <div className="two">
                <label>
                  Date
                  <input required type="date" min={todayStr()} value={f.date} onChange={set('date')} />
                </label>
                <label>
                  Time
                  <select required value={f.time} onChange={set('time')}>
                    <option value="" disabled>Select time…</option>
                    {TIMES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
              </div>

              <label>
                Notes <small>(optional)</small>
                <textarea rows={3} maxLength={500} value={f.notes} onChange={set('notes')} placeholder="Hair length, preferences, extra guests…" />
              </label>

              {state.status === 'error' && <p className="err" role="alert">{state.error}</p>}

              <button className="btn btn-gold block" disabled={state.status === 'sending'}>
                {state.status === 'sending' ? 'Sending…' : 'Request appointment'} <Icon name="arrow" size={18} />
              </button>
            </>
          )}
        </Reveal>
      </div>
    </section>
  )
}
