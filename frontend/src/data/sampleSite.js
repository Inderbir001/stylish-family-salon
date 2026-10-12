// LOCAL DEV PREVIEW ONLY. Used when no backend is configured (npm run dev without VITE_API_URL) so
// the offers layout can be seen. Never bundled into production, so these made-up offers cannot
// appear on the live site. Real offers are added in the admin page.
export const sampleSite = {
  settings: {},
  gallery: [],
  offers: [
    {
      id: 'ladies-combo', badge: 'SAVE ₹351', title: 'Haircut + Hair Spa Combo',
      desc: 'For ladies: a Hair Cut with Wash plus a L’Oréal Hair Spa in one visit.',
      items: ['Hair Cut with Wash (₹850)', 'Loreal Hair Spa (₹1,300)'], was: 2150, now: 1799, who: 'ladies',
      ends: '2026-12-31', terms: 'Sample offer for layout preview.',
    },
    {
      id: 'gents-combo', badge: 'SAVE ₹111', title: 'Gents Grooming Combo',
      desc: 'Stylist Hair Cut, Beard Trim and a relaxing Coconut Oil Massage.',
      items: ['Stylist Hair Cut (₹200)', 'Beard Trim (₹160)', 'Coconut Oil Massage (₹300)'], was: 660, now: 549, who: 'men',
      ends: '2026-12-31',
    },
  ],
}
