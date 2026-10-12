// DEV PREVIEW ONLY (open the site with ?demo-reviews). Placeholder text so the layout can be
// checked without an API key. This file is never part of the production bundle.
const t = 'Sample review text used only to preview the layout. '
export const demo = {
  enabled: true,
  placeId: 'demo',
  name: 'Stylish Family Salon',
  address: 'Sample address, Your City',
  location: { latitude: 12.9716, longitude: 77.5946 },
  rating: 4.8,
  total: 126,
  mapsUri: 'https://maps.google.com',
  reviewUri: 'https://maps.google.com',
  reviews: ['Reviewer One', 'Reviewer Two', 'Reviewer Three', 'Reviewer Four', 'Reviewer Five'].map((author, i) => ({
    author,
    rating: i === 3 ? 4 : 5,
    text: t.repeat(1 + (i % 3)),
    when: `${i + 1} weeks ago`,
  })),
  photos: ['salon-rose', 'barbershop', 'nails', 'stylist', 'shave', 'spa'].map((f) => ({
    url: `/img/${f}.jpg`,
    author: 'Google user',
  })),
}
