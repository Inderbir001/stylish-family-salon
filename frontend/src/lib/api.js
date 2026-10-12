import { MENU } from '../data/menu.js'

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function request(path, options) {
  const ctrl = new AbortController()
  // Render's free tier can take a while to wake up.
  const timer = setTimeout(() => ctrl.abort(), 45000)
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      ...options,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
    return data
  } finally {
    clearTimeout(timer)
  }
}

// Menu comes from Supabase via the API; the bundled copy is the fallback.
export async function fetchMenu() {
  if (!BASE) return MENU
  try {
    const data = await request('/api/menu')
    return data.ladies?.length && data.men?.length ? data : MENU
  } catch {
    return MENU
  }
}

export const createBooking = (payload) =>
  request('/api/bookings', { method: 'POST', body: JSON.stringify(payload) })

export const sendMessage = (payload) =>
  request('/api/contact', { method: 'POST', body: JSON.stringify(payload) })

// Google rating, reviews, photos and location (served by the backend; { enabled: false } if not configured).
export async function fetchPlace() {
  if (!BASE) return import.meta.env.DEV ? demoPlace() : { enabled: false }
  try {
    return await request('/api/place')
  } catch {
    return { enabled: false }
  }
}

// Dev-only layout preview: open the site with ?demo-reviews. Dropped from production builds.
async function demoPlace() {
  if (!new URLSearchParams(location.search).has('demo-reviews')) return { enabled: false }
  const { demo } = await import('../data/demoPlace.js')
  return demo
}

// Contact details, offers and gallery that the admin manages. { } means "use the built-in defaults".
export async function fetchSite() {
  if (!BASE) {
    if (!import.meta.env.DEV) return {}
    const { sampleSite } = await import('../data/sampleSite.js')
    return sampleSite
  }
  try {
    return await request('/api/site')
  } catch {
    return {}
  }
}
