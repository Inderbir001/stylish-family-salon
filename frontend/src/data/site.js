// Default site details. Once the backend is connected, everything here can be changed from the
// admin page (/admin) and the saved values replace these defaults. Anything left empty
// ('' or []) is simply hidden from the page.
export const SITE = {
  name: 'Stylish Family Salon',
  phone: '081236 71157', // shown as written; the tap-to-call link dials it as +91 81236 71157
  whatsapp: '', // digits only with country code, e.g. '919876543210'
  email: '',
  address: '', // e.g. '12, MG Road, Your City - 560001'
  mapEmbedUrl: '', // optional: Google Maps > Share > Embed a map > copy the src="" URL
  instagram: '', // full URL
  hoursSummary: '', // short line for the top bar, e.g. 'Open daily 10 AM – 9 PM'
  hours: [], // e.g. [['Monday – Saturday', '10:00 AM – 9:00 PM'], ['Sunday', '10:00 AM – 8:00 PM']]
  // Where the "Leave a review" buttons send customers.
  reviewUrl: 'https://www.vouchiq.in/review/stylish-family-salon',
  // Google Maps place. Powers the Directions link even before the backend Google API key is set up.
  placeId: 'ChIJA190-cETrjsR418j6j05C9s',
  heroImage: '', // empty = the built-in hero photo
  showGallery: true, // false hides the whole Gallery section (switch in the admin's Photos tab)
  offerNote: 'Offer prices apply only to bookings made before the offer ends. Show your booking at the counter.',
  // Offers are managed in the admin page. Each: { id, badge, title, desc, items[], was, now, who, ends, terms }.
  offers: [],
  // Gallery photos managed in the admin page. Empty = the built-in gallery. Each: { url, caption, shape }.
  gallery: [],
}

// Replace defaults with what the admin saved (called once the site data has loaded).
export function applySite({ settings = {}, offers = [], gallery = [] } = {}) {
  for (const k of Object.keys(settings)) if (settings[k] !== undefined && settings[k] !== null) SITE[k] = settings[k]
  SITE.offers = offers
  SITE.gallery = gallery
}

// Offers that have not expired yet, soonest-ending first.
export const activeOffers = (now = Date.now()) =>
  SITE.offers
    .filter((o) => new Date(`${o.ends}T23:59:59+05:30`).getTime() > now)
    .sort((a, b) => a.ends.localeCompare(b.ends))
