import Icon from './Icons.jsx'
import { Reveal } from './Sections.jsx'
import { SITE } from '../data/site.js'

export function GoogleG({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.2 6.9-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.500 24c0-1.600.3-3.200.8-4.700l-7.900-6.100A24 24 0 0 0 0 24c0 3.900.9 7.500 2.600 10.800l7.900-6.100z" />
      <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.900 2.300-8.300 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
    </svg>
  )
}

export const Stars = ({ n = 5, size = 16 }) => (
  <span className="stars" role="img" aria-label={`${n} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Icon key={i} name="star" size={size} stroke={1.2} className={i <= Math.round(n) ? 'on' : ''} />
    ))}
  </span>
)

const initials = (name = '?') =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export default function Reviews({ place }) {
  if (!place?.enabled || (!place.reviews?.length && !place.photos?.length)) {
    // Google data not connected yet: still invite guests to leave a review.
    return SITE.reviewUrl ? (
      <section className="section reviews ask" id="reviews">
        <Reveal className="wrap head">
          <h2>Enjoyed your visit?</h2>
          <p>A quick review helps other people find us and helps our team improve.</p>
          <a className="btn btn-gold" href={SITE.reviewUrl} target="_blank" rel="noreferrer noopener">
            <Icon name="star" size={18} /> Leave a review
          </a>
        </Reveal>
      </section>
    ) : null
  }
  const { reviews = [], photos = [] } = place

  return (
    <section className="section reviews" id="reviews">
      <div className="wrap">
        <Reveal className="head">
          <h2>What our customers say</h2>
          {place.rating && (
            <div className="rate">
              <GoogleG size={28} />
              <b>{place.rating.toFixed(1)}</b>
              <Stars n={place.rating} size={20} />
              {place.total ? <span>{place.total.toLocaleString('en-IN')} reviews</span> : null}
            </div>
          )}
        </Reveal>

        {reviews.length > 0 && (
          <div className="rv-track" tabIndex={0} aria-label="Customer reviews">
            {reviews.map((r, i) => (
              <Reveal as="article" key={i} delay={i * 60} className="rv">
                <header>
                  {r.avatar ? (
                    <img src={r.avatar} alt="" referrerPolicy="no-referrer" loading="lazy" />
                  ) : (
                    <span className="av">{initials(r.author)}</span>
                  )}
                  <div>
                    {r.authorUri ? (
                      <a href={r.authorUri} target="_blank" rel="noreferrer noopener">
                        <b>{r.author}</b>
                      </a>
                    ) : (
                      <b>{r.author}</b>
                    )}
                    <small>{r.when}</small>
                  </div>
                  <GoogleG size={20} />
                </header>
                <Stars n={r.rating} />
                <p>{r.text}</p>
              </Reveal>
            ))}
          </div>
        )}

        {photos.length > 0 && (
          <>
            <h3 className="ph-title">Photos from Google</h3>
            <div className="gphotos">
              {photos.map((p, i) => (
                <Reveal
                  as="a"
                  key={i}
                  delay={i * 40}
                  className="gp"
                  href={place.mapsUri || p.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={p.author ? `Photo by ${p.author}` : 'View on Google Maps'}
                >
                  <img src={p.url} alt={p.author ? `Photo by ${p.author} on Google` : 'Photo from Google'} loading="lazy" referrerPolicy="no-referrer" />
                </Reveal>
              ))}
            </div>
          </>
        )}

        <div className="rv-cta">
          {place.mapsUri && (
            <a className="btn btn-ghost" href={place.mapsUri} target="_blank" rel="noreferrer noopener">
              Read all reviews on Google
            </a>
          )}
          {(SITE.reviewUrl || place.reviewUri) && (
            <a className="btn btn-gold" href={SITE.reviewUrl || place.reviewUri} target="_blank" rel="noreferrer noopener">
              <Icon name="star" size={18} /> Leave a review
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
