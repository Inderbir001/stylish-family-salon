import { useEffect, useRef, useState } from 'react'
import Icon from './Icons.jsx'
import Logo, { LogoMark } from './Logo.jsx'
import { SITE, activeOffers } from '../data/site.js'

/* ---------- motion helpers ---------- */

function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) return setSeen(true)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, seen]
}

// Fades/slides children in as they scroll into view. `from` = up | left | right | zoom.
export function Reveal({ as: Tag = 'div', delay = 0, from = 'up', className = '', children, ...rest }) {
  const [ref, seen] = useInView()
  return (
    <Tag ref={ref} className={`reveal from-${from} ${seen ? 'in' : ''} ${className}`} style={{ '--d': `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  )
}

function Count({ to, prefix = '', suffix = '' }) {
  const [ref, seen] = useInView(0.4)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!seen) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setN(to)
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 1400)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, to])
  return (
    <span ref={ref}>
      {prefix}
      {n}
      {suffix}
    </span>
  )
}

// Scroll progress bar + hero parallax, written to CSS variables.
export function ScrollFX() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('js')
    let raf = 0
    const update = () => {
      raf = 0
      const max = root.scrollHeight - innerHeight
      root.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0)
      root.style.setProperty('--sy', Math.min(scrollY, 900))
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => {
      removeEventListener('scroll', on)
      removeEventListener('resize', on)
    }
  }, [])
  return <div className="progress" aria-hidden="true" />
}

const LINKS = [
  ['offers', 'Offers'],
  ['services', 'Services'],
  ['menu', 'Price List'],
  ['gallery', 'Gallery'],
  ['reviews', 'Reviews'],
  ['about', 'About'],
  ['contact', 'Contact'],
]

// Indian numbers written with the 0 trunk prefix (0 81236 71157) are dialled as +91 so they work from anywhere.
const tel = (p) => {
  const d = p.replace(/[^\d+]/g, '')
  return `tel:${/^0\d{10}$/.test(d) ? `+91${d.slice(1)}` : d}`
}

export function TopBar({ place }) {
  const phone = SITE.phone || place?.phone
  const address = SITE.address || place?.address
  if (!phone && !address && !SITE.hoursSummary) return null
  return (
    <div className="topbar">
      <div className="wrap topbar-in">
        {address && (
          <span>
            <Icon name="pin" size={15} /> {address}
          </span>
        )}
        {SITE.hoursSummary && (
          <span>
            <Icon name="clock" size={15} /> {SITE.hoursSummary}
          </span>
        )}
        {phone && (
          <a href={tel(phone)}>
            <Icon name="phone" size={15} /> {phone}
          </a>
        )}
      </div>
    </div>
  )
}

export function Nav() {
  const [open, setOpen] = useState(false)
  return (
    <header className={`nav ${open ? 'open' : ''}`}>
      <div className="wrap nav-in">
        <Logo onClick={() => setOpen(false)} />
        <nav className="links" aria-label="Primary">
          {LINKS.filter(([id]) => id !== 'offers' || activeOffers().length > 0).map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className={id === 'offers' ? 'hotlink' : ''}>
              {label}
            </a>
          ))}
          <a href="#book" className="btn btn-gold sm" onClick={() => setOpen(false)}>
            Book Appointment
          </a>
        </nav>
        <button className="burger" aria-label="Toggle menu" onClick={() => setOpen(!open)}>
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </div>
    </header>
  )
}

const HEADLINE = ['Hair,', 'beauty', '&', 'grooming', 'for', 'the', 'whole', 'family']

export function Hero({ place }) {
  const phone = SITE.phone || place?.phone
  return (
    <section className="hero" id="top">
      <div className="hero-bg" aria-hidden="true">
        <img src={SITE.heroImage || '/img/hero.jpg'} alt="" fetchPriority="high" />
        <span className="orb o1" />
        <span className="orb o2" />
        <span className="orb o3" />
      </div>
      <div className="wrap hero-in">
        <div className="hero-copy">
          <p className="kicker">
            <i /> Unisex salon · Ladies &amp; Gents
          </p>
          {activeOffers().length > 0 && (
            <a href="#offers" className="hot">
              <b>Offers live</b> · ends {new Date(`${activeOffers()[0].ends}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} <Icon name="arrow" size={14} />
            </a>
          )}
          <h1 aria-label="Hair, beauty & grooming for the whole family">
            {HEADLINE.map((w, i) => (
              <span key={i} className="w" style={{ '--i': i }} aria-hidden="true">
                <span className={i >= 6 ? 'grad-light' : ''}>{w}</span>{' '}
              </span>
            ))}
          </h1>
          <p className="lead">
            Haircuts, colour, keratin, hair spa, facials, waxing, massage, manicure and pedicure, with a separate
            price list for ladies and gents. See every price before you book.
          </p>
          <div className="hero-cta">
            <a href="#book" className="btn btn-gold pulse">
              Book an appointment <Icon name="arrow" size={18} />
            </a>
            {phone ? (
              <a href={tel(phone)} className="btn btn-light">
                <Icon name="phone" size={18} /> Call {phone}
              </a>
            ) : (
              <a href="#menu" className="btn btn-light">
                View price list
              </a>
            )}
          </div>
        </div>

        <div className="badge" aria-hidden="true">
          <svg viewBox="0 0 200 200" className="spin">
            <defs>
              <path id="ring" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
            </defs>
            <text>
              <textPath href="#ring" startOffset="0">
                UNISEX • FAMILY • SALON • HAIR • BEAUTY • SPA •&nbsp;
              </textPath>
            </text>
          </svg>
          <LogoMark size={88} />
        </div>
      </div>

      <div className="wrap stats">
        <div>
          <b>
            <Count to={137} />
          </b>
          <span>services &amp; rates listed</span>
        </div>
        <div>
          <b>
            <Count to={20} prefix="₹" />
          </b>
          <span>prices start from</span>
        </div>
        <div>
          <b>
            <Count to={2} />
          </b>
          <span>menus: ladies &amp; gents</span>
        </div>
      </div>
    </section>
  )
}

export function Marquee() {
  const words = ['Haircuts', 'Colour', 'Keratin', 'Hair Spa', 'Facials', 'Waxing', 'Threading', 'Massage', 'Manicure', 'Pedicure', 'De-Tan', 'Beard Styling']
  const row = [...words, ...words]
  return (
    <div className="marquee-wrap" aria-hidden="true">
      <div className="marquee">
        <div className="track">
          {row.map((w, i) => (
            <span key={i}>
              {w}
              <i />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

const FEATURED = [
  { img: 'stylist', title: 'Haircuts & Styling', text: 'Layers, bob, butterfly and wolf cuts for ladies; fades, shaves and beard shaping for gents.', from: '₹200' },
  { img: 'hair-back', title: 'Hair Colour', text: 'Global colour, root touch-ups, highlights and funky shades.', from: '₹360' },
  { img: 'spa', title: 'Hair Spa & Smoothing', text: 'Keratin, botox, Korean and L’Oréal hair spa, plus smoothing and straightening.', from: '₹1,000' },
  { img: 'facial', title: 'Facials & Clean-ups', text: 'From fruit and papaya to Korean Glass, O3+ and Hydra facials.', from: '₹550' },
  { img: 'beauty', title: 'Waxing & Threading', text: 'Rika, Aloe and Choco wax, Brazilian wax and face threading.', from: '₹20' },
  { img: 'foot-spa', title: 'Massage, Nails & Skin', text: 'Oil massage, manicure, pedicure, de-tan and oxy bleach.', from: '₹300' },
]

export function Services() {
  return (
    <section className="section mesh" id="services">
      <div className="wrap">
        <Reveal className="head">
          <h2>
            Our <span className="grad">services</span>
          </h2>
          <p>Everything you need for hair, skin and nails, in one place.</p>
        </Reveal>
        <div className="cards">
          {FEATURED.map((f, i) => (
            <Reveal key={f.title} as="a" href="#menu" delay={(i % 3) * 110} className="card">
              <div className="ph">
                <img src={`/img/${f.img}.jpg`} alt="" loading="lazy" />
                <span className="num">0{i + 1}</span>
              </div>
              <div className="cb">
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <span className="from">
                  From <b>{f.from}</b>
                  <span className="go">
                    <Icon name="arrow" size={18} />
                  </span>
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Split() {
  return (
    <section className="split" aria-label="Ladies and Gents">
      {[
        { img: 'hair-back', t: 'Ladies', d: 'Haircuts, colour, waxing, facials, nails and body care.', menu: 'ladies', from: 'left' },
        { img: 'barber-fade', t: 'Gents', d: 'Haircuts, beard styling, grooming, spa and skin care.', menu: 'men', from: 'right' },
      ].map((c) => (
        <Reveal key={c.t} as="a" from={c.from} href="#menu" className="pane" onClick={() => window.dispatchEvent(new CustomEvent('pick-menu', { detail: c.menu }))}>
          <img src={`/img/${c.img}.jpg`} alt="" loading="lazy" />
          <div>
            <h3>{c.t}</h3>
            <p>{c.d}</p>
            <span className="more">
              See {c.t.toLowerCase()} prices <Icon name="arrow" size={16} />
            </span>
          </div>
        </Reveal>
      ))}
    </section>
  )
}

const SHOTS = [
  ['salon-rose', 'Styling floor', 'tall'],
  ['barbershop', 'Gents section', 'wide'],
  ['nails', 'Nail art', ''],
  ['stylist', 'Blow-dry finish', ''],
  ['shave', 'Shave & beard', 'tall'],
  ['salon-light', 'Salon interior', 'wide'],
  ['barber-dryer', 'Styling', ''],
  ['spa', 'Spa care', ''],
]

export function Gallery() {
  return (
    <section className="section mesh alt" id="gallery">
      <div className="wrap">
        <Reveal className="head">
          <h2>
            A look <span className="grad">inside</span>
          </h2>
          <p>The salon and our work.</p>
        </Reveal>
        <div className="mosaic">
          {(SITE.gallery?.length
            ? SITE.gallery.map((g) => ({ key: g.id || g.url, src: g.url, cap: g.caption, shape: g.shape }))
            : SHOTS.map(([f, cap, shape]) => ({ key: f, src: `/img/${f}.jpg`, cap, shape }))
          ).map((g, i) => (
            <Reveal key={g.key} as="figure" from="zoom" delay={(i % 4) * 90} className={`shot ${g.shape}`}>
              <img src={g.src} alt={g.cap} loading="lazy" />
              {g.cap && <figcaption>{g.cap}</figcaption>}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function About() {
  return (
    <section className="section" id="about">
      <div className="wrap about-in">
        <Reveal from="left" className="about-img">
          <img src="/img/salon-rose.jpg" alt="Styling chairs at the salon" loading="lazy" />
          <span className="chip-float">Ladies &amp; Gents · one salon</span>
        </Reveal>
        <Reveal from="right" className="about-copy">
          <h2>
            About <span className="grad">Stylish Family Salon</span>
          </h2>
          <p>
            Stylish Family Salon is a unisex salon where everyone in the family can get their hair, skin and
            grooming done in one visit. We keep separate price lists for ladies and gents, and we show every price
            upfront so there are no surprises at the counter.
          </p>
          <ul className="facts">
            <li>Ladies and gents services under one roof</li>
            <li>Products from L’Oréal, Shahnaz Husain, O3+ and Nature Gold</li>
            <li>Haircuts from ₹200, with every price listed online</li>
            <li>Book online or call us</li>
          </ul>
          <a href="#book" className="btn btn-gold">
            Book an appointment <Icon name="arrow" size={18} />
          </a>
        </Reveal>
      </div>
    </section>
  )
}

export function Contact({ place }) {
  const address = SITE.address || place?.address
  const phone = SITE.phone || place?.phone
  const loc = place?.enabled && place.location
  const q = encodeURIComponent(`${SITE.name} ${address || ''}`)
  const mapSrc =
    SITE.mapEmbedUrl ||
    (loc
      ? `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}&z=16&output=embed`
      : address
        ? `https://www.google.com/maps?q=${q}&z=16&output=embed`
        : '')
  const mapsLink = place?.mapsUri || (SITE.placeId ? `https://www.google.com/maps/place/?q=place_id:${SITE.placeId}` : address ? `https://www.google.com/maps/search/?api=1&query=${q}` : '')
  const hours = place?.hours?.length ? place.hours.map((h) => h.split(/:\s(.+)/).slice(0, 2)) : SITE.hours
  const wa = SITE.whatsapp && `https://wa.me/${SITE.whatsapp}`

  return (
    <section className="section mesh alt" id="contact">
      <div className="wrap">
        <Reveal className="head">
          <h2>
            Visit <span className="grad">us</span>
          </h2>
          <p>Call, message or drop in. We’d love to see you.</p>
        </Reveal>
        <div className="contact-grid">
          <Reveal from="left" className="info">
            {address && (
              <div className="row">
                <Icon name="pin" />
                <div>
                  <b>Address</b>
                  <p>{address}</p>
                </div>
              </div>
            )}
            {phone && (
              <div className="row">
                <Icon name="phone" />
                <div>
                  <b>Phone</b>
                  <p>
                    <a href={tel(phone)}>{phone}</a>
                  </p>
                </div>
              </div>
            )}
            {SITE.email && (
              <div className="row">
                <Icon name="mail" />
                <div>
                  <b>Email</b>
                  <p>
                    <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                  </p>
                </div>
              </div>
            )}
            {hours?.length > 0 && (
              <div className="row">
                <Icon name="clock" />
                <div>
                  <b>Opening hours</b>
                  <table className="hours">
                    <tbody>
                      {hours.map(([d, t]) => (
                        <tr key={d}>
                          <td>{d}</td>
                          <td>{t}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="social">
              <a className="btn btn-gold sm" href="#book">
                Book appointment
              </a>
              {wa && (
                <a className="btn btn-ghost sm" href={wa} target="_blank" rel="noreferrer">
                  <Icon name="whatsapp" size={18} /> WhatsApp
                </a>
              )}
              {mapsLink && (
                <a className="btn btn-ghost sm" href={mapsLink} target="_blank" rel="noreferrer noopener">
                  <Icon name="pin" size={18} /> Directions
                </a>
              )}
              {SITE.instagram && (
                <a className="btn btn-ghost sm" href={SITE.instagram} target="_blank" rel="noreferrer">
                  <Icon name="instagram" size={18} /> Instagram
                </a>
              )}
            </div>
          </Reveal>
          <Reveal from="right" className="map">
            {mapSrc ? (
              <iframe title="Salon location on Google Maps" src={mapSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            ) : (
              <div className="map-ph">
                <Icon name="pin" size={36} stroke={1.3} />
                {mapsLink ? (
                  <a href={mapsLink} target="_blank" rel="noreferrer noopener" className="btn btn-gold sm">
                    Open in Google Maps
                  </a>
                ) : (
                  <p>Map coming soon</p>
                )}
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export function Footer({ place }) {
  const phone = SITE.phone || place?.phone
  const address = SITE.address || place?.address
  return (
    <footer className="footer">
      <div className="wrap foot-in">
        <div>
          <Logo />
          <p>Unisex salon for ladies, gents and kids.</p>
          {address && <p>{address}</p>}
          {phone && (
            <p>
              <a href={tel(phone)}>{phone}</a>
            </p>
          )}
        </div>
        <nav aria-label="Footer">
          {LINKS.filter(([id]) => id !== 'offers' || activeOffers().length > 0).map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <small>
          © {new Date().getFullYear()} {SITE.name}
        </small>
      </div>
    </footer>
  )
}

// Mobile-only bar: the two things visitors want most.
export function StickyBar({ place }) {
  const phone = SITE.phone || place?.phone
  return (
    <div className="stickybar">
      {phone && (
        <a href={tel(phone)} className="btn btn-ghost">
          <Icon name="phone" size={18} /> Call
        </a>
      )}
      <a href="#book" className="btn btn-gold">
        Book now
      </a>
    </div>
  )
}
