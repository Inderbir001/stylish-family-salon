import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createAdmin, loadSite } from './admin.js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CORS_ORIGINS = '', PORT = 4000, ADMIN_PASSWORD, ADMIN_SECRET } = process.env
// Supabase is optional at first: without it the API still starts (health check, Google reviews) and
// the website falls back to its built-in menu and details. Add the two variables later to switch it on.
const hasDb = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
if (!hasDb) console.warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set: bookings, admin and saved content are disabled.')
const db = hasDb ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null
const origins = CORS_ORIGINS.split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean)

const app = express()
app.set('trust proxy', 1) // Render sits behind a proxy
app.use(helmet())
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
// Small body limit everywhere except image uploads (they set their own limit in the admin router).
const smallJson = express.json({ limit: '20kb' })
app.use((req, res, next) => (req.path === '/api/admin/upload' ? next() : smallJson(req, res, next)))

// No database yet: everything except the Google endpoint answers with a friendly message.
app.use('/api', (req, res, next) =>
  db || req.path === '/place' ? next() : res.status(503).json({ error: 'Online booking is being set up. Please call us to book.' }),
)

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
})

app.get('/', (_req, res) => res.json({ service: 'stylish-family-salon-api', ok: true }))
app.get('/health', (_req, res) => res.json({ ok: true }))

// ---- Menu ---------------------------------------------------------------
let menuCache = { at: 0, data: null }

app.get('/api/menu', async (_req, res) => {
  if (menuCache.data && Date.now() - menuCache.at < 60_000) return res.json(menuCache.data)
  const [secs, items] = await Promise.all([
    db.from('menu_sections').select('*').order('sort'),
    db.from('menu_items').select('*').order('sort'),
  ])
  if (secs.error || items.error) {
    console.error(secs.error || items.error)
    return res.status(500).json({ error: 'Could not load menu.' })
  }
  const out = { ladies: [], men: [] }
  for (const s of secs.data) {
    out[s.audience]?.push({
      id: s.id,
      title: s.title,
      icon: s.icon,
      cols: s.cols,
      items: items.data
        .filter((i) => i.section_id === s.id)
        .map((i) => ({ name: i.name, note: i.note ?? undefined, prices: i.prices })),
    })
  }
  menuCache = { at: Date.now(), data: out }
  res.json(out)
})

// ---- Bookings -----------------------------------------------------------
const text = (max) => z.string().trim().max(max)
const bookingSchema = z.object({
  name: text(80).min(2),
  phone: text(16).regex(/^[0-9+\-\s]{8,16}$/, 'Enter a valid phone number'),
  email: text(120).email().optional(),
  for_whom: z.enum(['ladies', 'men']),
  service: text(160).min(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  time: text(12).min(4),
  notes: text(500).optional(),
})

const firstIssue = (err) => err.issues?.[0]?.message || 'Please check the form and try again.'

app.post('/api/bookings', writeLimiter, async (req, res) => {
  const parsed = bookingSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstIssue(parsed.error) })
  const b = parsed.data

  // Reject past dates (salon timezone: IST, UTC+5:30).
  const today = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10)
  if (b.date < today) return res.status(400).json({ error: 'Please choose today or a future date.' })

  const { error } = await db.from('bookings').insert(b)
  if (error) {
    console.error(error)
    return res.status(500).json({ error: 'Could not save your booking. Please call us.' })
  }
  res.status(201).json({ ok: true })
})

// ---- Contact ------------------------------------------------------------
const contactSchema = z.object({
  name: text(80).min(2),
  phone: text(16).optional(),
  email: text(120).email().optional(),
  message: text(1000).min(3),
})

app.post('/api/contact', writeLimiter, async (req, res) => {
  const parsed = contactSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstIssue(parsed.error) })
  const { error } = await db.from('messages').insert(parsed.data)
  if (error) {
    console.error(error)
    return res.status(500).json({ error: 'Could not send your message.' })
  }
  res.status(201).json({ ok: true })
})

// ---- Site content the admin can change (contact details, offers, gallery) ---
let siteCache = { at: 0, data: null }
app.get('/api/site', async (_req, res) => {
  if (siteCache.data && Date.now() - siteCache.at < 30_000) return res.json(siteCache.data)
  try {
    siteCache = { at: Date.now(), data: await loadSite(db) }
    res.json(siteCache.data)
  } catch (err) {
    console.error(err.message)
    if (siteCache.data) return res.json(siteCache.data)
    res.status(500).json({ error: 'Could not load site settings.' })
  }
})

// ---- Admin (password protected; see backend/src/admin.js) ---------------------
if (ADMIN_PASSWORD && ADMIN_PASSWORD.length < 8) console.warn('ADMIN_PASSWORD is short. Use at least 8 characters.')
const clearCaches = () => {
  menuCache = { at: 0, data: null }
  siteCache = { at: 0, data: null }
}
app.use('/api/admin', createAdmin(db, { password: ADMIN_PASSWORD, secret: ADMIN_SECRET, onChange: clearCaches }))

// ---- Google place (rating, reviews, photos, location) ---------------------
// Needs GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID. Without them the site just hides those sections.
const { GOOGLE_PLACES_API_KEY, GOOGLE_PLACE_ID } = process.env
const PLACE_TTL = 6 * 3600 * 1000
let placeCache = { at: 0, data: null }

const FIELDS = [
  'id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'googleMapsUri',
  'nationalPhoneNumber', 'regularOpeningHours.weekdayDescriptions',
  'reviews', 'photos',
].join(',')

async function loadPlace() {
  const headers = { 'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': FIELDS }
  const r = await fetch(`https://places.googleapis.com/v1/places/${GOOGLE_PLACE_ID}?languageCode=en`, { headers })
  if (!r.ok) throw new Error(`Places API ${r.status}: ${await r.text()}`)
  const p = await r.json()

  // Resolve up to 8 photos to their public image URLs (keeps the API key off the browser).
  const photos = (
    await Promise.all(
      (p.photos || []).slice(0, 8).map(async (ph) => {
        try {
          const m = await fetch(
            `https://places.googleapis.com/v1/${ph.name}/media?maxWidthPx=1000&skipHttpRedirect=true&key=${GOOGLE_PLACES_API_KEY}`,
          )
          if (!m.ok) return null
          const { photoUri } = await m.json()
          const a = ph.authorAttributions?.[0]
          return photoUri ? { url: photoUri, w: ph.widthPx, h: ph.heightPx, author: a?.displayName, authorUri: a?.uri } : null
        } catch {
          return null
        }
      }),
    )
  ).filter(Boolean)

  return {
    enabled: true,
    placeId: p.id || GOOGLE_PLACE_ID,
    name: p.displayName?.text,
    address: p.formattedAddress,
    phone: p.nationalPhoneNumber,
    hours: p.regularOpeningHours?.weekdayDescriptions,
    location: p.location,
    rating: p.rating,
    total: p.userRatingCount,
    mapsUri: p.googleMapsUri,
    reviewUri: `https://search.google.com/local/writereview?placeid=${p.id || GOOGLE_PLACE_ID}`,
    reviews: (p.reviews || []).map((v) => ({
      author: v.authorAttribution?.displayName,
      authorUri: v.authorAttribution?.uri,
      avatar: v.authorAttribution?.photoUri,
      rating: v.rating,
      text: v.text?.text || v.originalText?.text || '',
      when: v.relativePublishTimeDescription,
    })),
    photos,
  }
}

app.get('/api/place', async (_req, res) => {
  if (!GOOGLE_PLACES_API_KEY || !GOOGLE_PLACE_ID) return res.json({ enabled: false })
  if (placeCache.data && Date.now() - placeCache.at < PLACE_TTL) return res.json(placeCache.data)
  try {
    placeCache = { at: Date.now(), data: await loadPlace() }
    res.json(placeCache.data)
  } catch (err) {
    console.error(err.message)
    // Serve stale data rather than nothing if Google is briefly unavailable.
    if (placeCache.data) return res.json(placeCache.data)
    res.json({ enabled: false })
  }
})

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Server error' })
})

app.listen(PORT, () => console.log(`API listening on :${PORT}`))
