import express from 'express'
import crypto from 'node:crypto'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'

const BUCKET = 'site-images'
const ICONS = ['scissors', 'drop', 'spa', 'sparkle', 'eye', 'hands', 'face', 'sun', 'nail']
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest()
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
const istToday = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10)

// ---- Public: everything the website needs that the admin can change -------------------
export async function loadSite(db) {
  const [s, o, g] = await Promise.all([
    db.from('site_settings').select('value').eq('key', 'site').maybeSingle(),
    db.from('offers').select('*').eq('active', true).gte('ends', istToday()).order('ends'),
    db.from('gallery_images').select('*').order('sort'),
  ])
  const err = s.error || o.error || g.error
  if (err) throw new Error(err.message)
  return {
    settings: s.data?.value || {},
    offers: o.data.map((x) => ({
      id: x.id, title: x.title, badge: x.badge, desc: x.description, items: x.items || [],
      was: x.was, now: x.now, who: x.who, ends: x.ends, terms: x.terms || undefined,
    })),
    gallery: g.data.map((x) => ({ id: x.id, url: x.url, caption: x.caption || '', shape: x.shape || '' })),
  }
}

// ---- Admin API ------------------------------------------------------------------------
export function createAdmin(db, { password, secret, onChange }) {
  const key = secret || sha(`salon-admin:${password}`)
  const sign = (payload) => crypto.createHmac('sha256', key).update(payload).digest('base64url')
  const issue = () => {
    const exp = Date.now() + 12 * 3600 * 1000
    return `${exp}.${sign(String(exp))}`
  }
  const valid = (t) => {
    if (typeof t !== 'string') return false
    const [exp, sig] = t.split('.')
    if (!exp || !sig) return false
    const a = Buffer.from(sig)
    const b = Buffer.from(sign(exp))
    return a.length === b.length && crypto.timingSafeEqual(a, b) && Number(exp) > Date.now()
  }

  const r = express.Router()
  const fail = (res, error, msg = 'Database error. Please try again.') => {
    console.error(error)
    res.status(500).json({ error: msg })
  }
  const bad = (res, err) => res.status(400).json({ error: err.issues?.[0] ? `${err.issues[0].path.join('.') || 'input'}: ${err.issues[0].message}` : 'Invalid input' })
  const changed = () => onChange?.()

  r.post(
    '/login',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in 15 minutes.' } }),
    (req, res) => {
      if (!password) return res.status(503).json({ error: 'Admin is not enabled. Set ADMIN_PASSWORD on the server.' })
      const given = typeof req.body?.password === 'string' ? req.body.password : ''
      if (!crypto.timingSafeEqual(sha(given), sha(password))) return res.status(401).json({ error: 'Wrong password.' })
      res.json({ token: issue() })
    },
  )

  r.use((req, res, next) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '')
    if (!password || !m || !valid(m[1])) return res.status(401).json({ error: 'Please sign in again.' })
    next()
  })

  // ---- Bookings
  r.get('/bookings', ah(async (_req, res) => {
    const { data, error } = await db.from('bookings').select('*').order('created_at', { ascending: false }).limit(300)
    if (error) return fail(res, error)
    res.json(data)
  }))
  r.patch('/bookings/:id', ah(async (req, res) => {
    const p = z.object({ status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']) }).safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const { error } = await db.from('bookings').update(p.data).eq('id', req.params.id)
    if (error) return fail(res, error)
    res.json({ ok: true })
  }))
  r.delete('/bookings/:id', ah(async (req, res) => {
    const { error } = await db.from('bookings').delete().eq('id', req.params.id)
    if (error) return fail(res, error)
    res.json({ ok: true })
  }))

  // ---- Site settings (contact details, hours, links, hero image)
  const str = (n) => z.string().trim().max(n).optional()
  const settingsSchema = z.object({
    phone: str(30), whatsapp: str(20), email: str(120), address: str(300), mapEmbedUrl: str(1000),
    instagram: str(300), hoursSummary: str(120), reviewUrl: str(500), placeId: str(200), offerNote: str(300), heroImage: str(1000),
    hours: z.array(z.tuple([z.string().trim().max(60), z.string().trim().max(60)])).max(10).optional(),
  })
  r.get('/settings', ah(async (_req, res) => {
    const { data, error } = await db.from('site_settings').select('value').eq('key', 'site').maybeSingle()
    if (error) return fail(res, error)
    res.json(data?.value || {})
  }))
  r.put('/settings', ah(async (req, res) => {
    const p = settingsSchema.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const { error } = await db.from('site_settings').upsert({ key: 'site', value: p.data })
    if (error) return fail(res, error)
    changed()
    res.json({ ok: true })
  }))

  // ---- Offers
  const offerSchema = z.object({
    title: z.string().trim().min(2).max(100),
    badge: z.string().trim().min(1).max(30),
    description: z.string().trim().max(300).default(''),
    items: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
    was: z.number().int().min(0).max(1000000).nullable().optional(),
    now: z.number().int().min(0).max(1000000).nullable().optional(),
    who: z.enum(['ladies', 'men']).default('ladies'),
    ends: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-11-05'),
    terms: z.string().trim().max(300).nullable().optional(),
    active: z.boolean().default(true),
  })
  r.get('/offers', ah(async (_req, res) => {
    const { data, error } = await db.from('offers').select('*').order('ends', { ascending: false })
    if (error) return fail(res, error)
    res.json(data)
  }))
  r.post('/offers', ah(async (req, res) => {
    const p = offerSchema.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const { data, error } = await db.from('offers').insert(p.data).select().single()
    if (error) return fail(res, error)
    changed()
    res.status(201).json(data)
  }))
  r.put('/offers/:id', ah(async (req, res) => {
    const p = offerSchema.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const { data, error } = await db.from('offers').update(p.data).eq('id', req.params.id).select().single()
    if (error) return fail(res, error)
    changed()
    res.json(data)
  }))
  r.delete('/offers/:id', ah(async (req, res) => {
    const { error } = await db.from('offers').delete().eq('id', req.params.id)
    if (error) return fail(res, error)
    changed()
    res.json({ ok: true })
  }))

  // ---- Menu (sections + items)
  const sectionSchema = z.object({
    audience: z.enum(['ladies', 'men']),
    title: z.string().trim().min(2).max(80),
    icon: z.enum(ICONS).default('sparkle'),
    cols: z.array(z.string().trim().min(1).max(20)).max(5).nullable().optional(),
    sort: z.number().int().min(0).max(10000).optional(),
  })
  const itemSchema = z.object({
    section_id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(120),
    note: z.string().trim().max(60).nullable().optional(),
    prices: z.array(z.number().int().min(0).max(1000000).nullable()).min(1).max(5),
    sort: z.number().int().min(0).max(10000).optional(),
  })

  r.get('/menu', ah(async (_req, res) => {
    const [s, i] = await Promise.all([db.from('menu_sections').select('*').order('sort'), db.from('menu_items').select('*').order('sort')])
    if (s.error || i.error) return fail(res, s.error || i.error)
    res.json(s.data.map((x) => ({ ...x, items: i.data.filter((y) => y.section_id === x.id) })))
  }))
  r.post('/menu/sections', ah(async (req, res) => {
    const p = sectionSchema.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const slug = p.data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)
    const id = `${p.data.audience[0]}-${slug || 'section'}-${crypto.randomBytes(2).toString('hex')}`
    const { data, error } = await db.from('menu_sections').insert({ id, ...p.data, cols: p.data.cols?.length ? p.data.cols : null }).select().single()
    if (error) return fail(res, error)
    changed()
    res.status(201).json({ ...data, items: [] })
  }))
  r.put('/menu/sections/:id', ah(async (req, res) => {
    const p = sectionSchema.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const { error } = await db.from('menu_sections').update({ ...p.data, cols: p.data.cols?.length ? p.data.cols : null }).eq('id', req.params.id)
    if (error) return fail(res, error)
    changed()
    res.json({ ok: true })
  }))
  r.delete('/menu/sections/:id', ah(async (req, res) => {
    const { error } = await db.from('menu_sections').delete().eq('id', req.params.id)
    if (error) return fail(res, error)
    changed()
    res.json({ ok: true })
  }))
  r.post('/menu/items', ah(async (req, res) => {
    const p = itemSchema.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const { data, error } = await db.from('menu_items').insert({ ...p.data, note: p.data.note || null }).select().single()
    if (error) return fail(res, error)
    changed()
    res.status(201).json(data)
  }))
  r.put('/menu/items/:id', ah(async (req, res) => {
    const p = itemSchema.omit({ section_id: true }).safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const { data, error } = await db.from('menu_items').update({ ...p.data, note: p.data.note || null }).eq('id', req.params.id).select().single()
    if (error) return fail(res, error)
    changed()
    res.json(data)
  }))
  r.delete('/menu/items/:id', ah(async (req, res) => {
    const { error } = await db.from('menu_items').delete().eq('id', req.params.id)
    if (error) return fail(res, error)
    changed()
    res.json({ ok: true })
  }))

  // ---- Photos (Supabase Storage) + gallery
  r.post('/upload', express.json({ limit: '9mb' }), ah(async (req, res) => {
    const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(req.body?.dataUrl || '')
    if (!m) return res.status(400).json({ error: 'Please upload a JPG, PNG or WebP image.' })
    const buf = Buffer.from(m[2], 'base64')
    if (buf.length > 6 * 1024 * 1024) return res.status(400).json({ error: 'Image is too large (max 6 MB).' })
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1]
    const path = `uploads/${Date.now()}-${crypto.randomBytes(3).toString('hex')}.${ext}`
    const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: `image/${m[1]}`, cacheControl: '31536000' })
    if (up.error) return fail(res, up.error, 'Upload failed. Check that the "site-images" storage bucket exists.')
    res.json({ url: db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, path })
  }))

  const gallerySchema = z.object({
    caption: z.string().trim().max(80).default(''),
    shape: z.enum(['', 'tall', 'wide']).default(''),
    sort: z.number().int().min(0).max(10000).optional(),
  })
  r.get('/gallery', ah(async (_req, res) => {
    const { data, error } = await db.from('gallery_images').select('*').order('sort')
    if (error) return fail(res, error)
    res.json(data)
  }))
  r.post('/gallery', ah(async (req, res) => {
    const p = gallerySchema.extend({ url: z.string().url().max(1000), path: z.string().max(300).optional() }).safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const { data, error } = await db.from('gallery_images').insert(p.data).select().single()
    if (error) return fail(res, error)
    changed()
    res.status(201).json(data)
  }))
  r.put('/gallery/:id', ah(async (req, res) => {
    const p = gallerySchema.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const { error } = await db.from('gallery_images').update(p.data).eq('id', req.params.id)
    if (error) return fail(res, error)
    changed()
    res.json({ ok: true })
  }))
  r.delete('/gallery/:id', ah(async (req, res) => {
    const { data } = await db.from('gallery_images').select('path').eq('id', req.params.id).maybeSingle()
    const { error } = await db.from('gallery_images').delete().eq('id', req.params.id)
    if (error) return fail(res, error)
    if (data?.path) await db.storage.from(BUCKET).remove([data.path])
    changed()
    res.json({ ok: true })
  }))

  return r
}
