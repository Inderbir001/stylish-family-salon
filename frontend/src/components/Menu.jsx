import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icons.jsx'
import { Reveal } from './Sections.jsx'
import { rupee } from '../data/menu.js'

// Photo + one-line blurb per category (keyed by section id from the menu data).
const META = {
  'l-cuts': ['stylist', 'Precision cuts, layers and signature styles.'],
  'l-colour': ['hair-back', 'Colour, highlights and smoothing that last.'],
  'l-spa': ['spa', 'Deep-conditioning rituals for healthy, glossy hair.'],
  'l-wax': ['beauty', 'Rika, Aloe or Choco: pick the wax that suits your skin.'],
  'l-brazil': ['salon-rose', 'Gentle, specialised waxing for face and body.'],
  'l-thread': ['salon-light', 'Clean, defined brows and face threading.'],
  'l-massage': ['foot-spa', 'Unwind with soothing oil and body massages.'],
  'l-facial': ['facial', 'Glow-giving facials from fruit to Hydra and Diamond.'],
  'l-skin': ['spa', 'Remove tan and brighten, area by area.'],
  'l-nails': ['nails', 'Manicure and pedicure rituals, simple to spa.'],
  'm-cuts': ['barber-fade', 'Sharp cuts, shaves and beard shaping.'],
  'm-colour': ['barber-dryer', 'Colour, smoothing and keratin for him.'],
  'm-spa': ['spa', 'Hair spa and scalp treatments that repair and refresh.'],
  'm-facial': ['facial', 'Clean-ups and facials for fresh, even skin.'],
  'm-detan': ['shave', 'Quick de-tan therapy for a brighter look.'],
  'm-massage': ['foot-spa', 'Relaxing oil massages to melt the stress.'],
  'm-bleach': ['facial', 'Oxy bleach therapy for a lighter, even tone.'],
  'm-nails': ['nails', 'Manicure and pedicure care, from basic to spa.'],
}

const lowest = (s) => Math.min(...s.items.flatMap((i) => i.prices.filter((p) => p != null)))

export default function Menu({ menu }) {
  const [who, setWho] = useState('ladies')
  const [cat, setCat] = useState(null)
  const [q, setQ] = useState('')
  const panel = useRef(null)

  useEffect(() => {
    const on = (e) => {
      setWho(e.detail)
      setCat(null)
    }
    window.addEventListener('pick-menu', on)
    return () => window.removeEventListener('pick-menu', on)
  }, [])

  const sections = menu[who]
  const active = sections.find((s) => s.id === cat) || sections[0]
  const term = q.trim().toLowerCase()

  const results = useMemo(() => {
    if (!term) return []
    return sections.flatMap((s) =>
      s.items.filter((i) => i.name.toLowerCase().includes(term) || s.title.toLowerCase().includes(term)).map((i) => ({ ...i, section: s })),
    )
  }, [sections, term])

  const choose = (id) => {
    setCat(id)
    // On small screens the panel sits below the tiles, so bring it into view.
    if (window.innerWidth < 900) requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const book = (section, item) => {
    window.dispatchEvent(new CustomEvent('pick-service', { detail: { who, service: `${section.title} — ${item.name}` } }))
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="section menu" id="menu">
      <div className="wrap">
        <div className="head">
          <h2>Price list</h2>
          <p>Choose a category to see every service and rate. Tap “Book” on anything you like.</p>
        </div>

        <div className="toolbar">
          <div className="seg" role="tablist" aria-label="Menu">
            {[
              ['ladies', 'Ladies'],
              ['men', 'Gents'],
            ].map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={who === k}
                className={who === k ? 'on' : ''}
                onClick={() => {
                  setWho(k)
                  setCat(null)
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="search">
            <Icon name="eye" size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a service…" aria-label="Search services" />
          </label>
        </div>

        {term ? (
          results.length === 0 ? (
            <p className="empty">No services match “{q}”. Try another word.</p>
          ) : (
            <div className="items results">
              {results.map((it) => (
                <ItemCard key={it.section.id + it.name} item={it} section={it.section} tag={it.section.title} onBook={book} />
              ))}
            </div>
          )
        ) : (
          <>
            <div className="tiles" role="tablist" aria-label="Categories">
              {sections.map((s) => {
                const [img] = META[s.id] || ['stylist']
                const on = s.id === active.id
                return (
                  <button key={s.id} role="tab" aria-selected={on} className={`tile ${on ? 'on' : ''}`} onClick={() => choose(s.id)}>
                    <img src={`/img/${img}.jpg`} alt="" loading="lazy" />
                    <span className="tile-in">
                      <Icon name={s.icon} size={22} />
                      <b>{s.title}</b>
                      <small>
                        {s.items.length} services · from {rupee(lowest(s))}
                      </small>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="panel" ref={panel} key={who + active.id}>
              <aside className="panel-side">
                <img src={`/img/${(META[active.id] || ['stylist'])[0]}.jpg`} alt="" />
                <div>
                  <span className="ico">
                    <Icon name={active.icon} size={24} />
                  </span>
                  <h3>{active.title}</h3>
                  <p>{(META[active.id] || [])[1]}</p>
                  <span className="from">
                    starting at <b>{rupee(lowest(active))}</b>
                  </span>
                </div>
              </aside>
              <div className="items">
                {active.items.map((it) => (
                  <ItemCard key={it.name} item={it} section={active} cols={active.cols} onBook={book} />
                ))}
              </div>
            </div>
          </>
        )}
        <p className="fine">Prices are indicative and may vary by hair length &amp; density. “Onwards” prices start at the amount shown.</p>
      </div>
    </section>
  )
}

function ItemCard({ item, section, cols, tag, onBook }) {
  const multi = item.prices.length > 1
  // For search results, show the section's column labels too.
  const labels = cols || (multi ? section.cols : null)
  return (
    <div className="item">
      <div className="item-top">
        <div>
          {tag && <small className="tag">{tag}</small>}
          <h4>{item.name}</h4>
          {item.note && <em>{item.note}</em>}
        </div>
        <button className="bk" onClick={() => onBook(section, item)} aria-label={`Book ${item.name}`}>
          Book <Icon name="arrow" size={14} />
        </button>
      </div>
      {multi ? (
        <div className="chips-pr">
          {item.prices.map((p, i) => (
            <span key={i} className={p == null ? 'na' : ''}>
              <small>{labels?.[i]}</small>
              <b>{rupee(p)}</b>
            </span>
          ))}
        </div>
      ) : (
        <div className="price">
          <b>{rupee(item.prices[0])}</b>
          {item.note === 'onwards' && <small>onwards</small>}
        </div>
      )}
    </div>
  )
}
