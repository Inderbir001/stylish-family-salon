import { useEffect, useState } from 'react'
import Icon from './Icons.jsx'
import { Reveal } from './Sections.jsx'
import { SITE, activeOffers } from '../data/site.js'
import { rupee } from '../data/menu.js'

// Whole-day deadline in IST (the salon's timezone).
const endOf = (d) => new Date(`${d}T23:59:59+05:30`).getTime()

function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

const pad = (n) => String(n).padStart(2, '0')

export function Countdown({ ends, compact = false }) {
  const now = useNow()
  const ms = Math.max(0, endOf(ends) - now)
  const d = Math.floor(ms / 86400000)
  const h = Math.floor(ms / 3600000) % 24
  const m = Math.floor(ms / 60000) % 60
  const s = Math.floor(ms / 1000) % 60
  const parts = [
    [d, 'days'],
    [pad(h), 'hrs'],
    [pad(m), 'min'],
    [pad(s), 'sec'],
  ]
  if (compact) return <span className="cd-compact">{d}d {pad(h)}h {pad(m)}m {pad(s)}s</span>
  return (
    <div className="cd" role="timer" aria-label="Time left on this offer">
      {parts.map(([v, l]) => (
        <span key={l}>
          <b>{v}</b>
          <small>{l}</small>
        </span>
      ))}
    </div>
  )
}

const fmtDate = (d) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

// Slim bar above the header: nearest-ending live offer.
export function AnnounceBar() {
  const live = activeOffers()
  if (!live.length) return null
  const next = live[0]
  return (
    <a href="#offers" className="announce">
      <span className="flame" aria-hidden="true">
        <Icon name="sparkle" size={16} />
      </span>
      <span>
        <b>{next.badge}</b> {next.title}
      </span>
      <span className="announce-cd">
        Ends in <Countdown ends={next.ends} compact />
      </span>
      <span className="announce-go">
        Claim <Icon name="arrow" size={14} />
      </span>
    </a>
  )
}

export function Offers() {
  const live = activeOffers()
  if (!live.length) return null

  const claim = (o) => {
    window.dispatchEvent(new CustomEvent('pick-offer', { detail: o }))
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="section offers" id="offers">
      <div className="wrap">
        <Reveal className="head">
          <span className="tagpill">
            <i /> Limited-time offers
          </span>
          <h2>
            Book now, <span className="grad-light">save more</span>
          </h2>
          <p>{SITE.offerNote || 'These prices are only valid for bookings made before the offer ends.'}</p>
        </Reveal>

        <div className="offer-grid">
          {live.map((o, i) => (
            <Reveal key={o.id} delay={i * 110} className="offer">
              <span className="ribbon">{o.badge}</span>
              <h3>{o.title}</h3>
              <p className="od">{o.desc}</p>
              {o.items?.length > 0 && (
                <ul>
                  {o.items.map((it) => (
                    <li key={it}>
                      <Icon name="star" size={14} stroke={1.5} /> {it}
                    </li>
                  ))}
                </ul>
              )}
              {o.now != null && (
                <div className="op">
                  {o.was != null && <s>{rupee(o.was)}</s>}
                  <b>{rupee(o.now)}</b>
                </div>
              )}
              <div className="oend">
                <small>Offer ends {fmtDate(o.ends)}</small>
                <Countdown ends={o.ends} />
              </div>
              <button className="btn btn-gold block pulse" onClick={() => claim(o)}>
                Book this offer <Icon name="arrow" size={18} />
              </button>
              {o.terms && <small className="terms">{o.terms}</small>}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
