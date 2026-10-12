# Stylish Family Salon

Unisex salon website with a live price menu and online appointment requests.

| Layer    | Tech                  | Host     | Folder      |
| -------- | --------------------- | -------- | ----------- |
| Frontend | Vite + React          | Vercel   | `frontend/` |
| Backend  | Node + Express        | Render   | `backend/`  |
| Database | Postgres              | Supabase | `supabase/` |

The browser only talks to the Render API. The API talks to Supabase with the service-role key, and RLS blocks everyone else.
If the API is down or asleep, the site still shows the full menu from the bundled copy in `frontend/src/data/menu.js`.

## 1. Supabase

1. Create a project at supabase.com.
2. SQL Editor: run `supabase/schema.sql`, then `supabase/seed.sql`.
3. Project Settings > API: copy the **Project URL** and the **service_role** key.

Bookings land in the `bookings` table (Table Editor). Change `status` to `confirmed` or `cancelled` there.

## 2. Render (backend)

1. Push this repo to GitHub.
2. Render > New > Blueprint, and pick the repo (it reads `render.yaml`). Or create a Web Service with root dir `backend`, build `npm install`, start `npm start`.
3. Set the environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CORS_ORIGINS` = your Vercel URL, e.g. `https://stylish-family-salon.vercel.app` (comma-separate extra domains)
4. Check `https://<service>.onrender.com/health`.

The free plan sleeps after inactivity, so the first booking after a quiet spell can take about 30s. The form waits for it.

## 3. Vercel (frontend)

1. Vercel > Add New > Project, and import the repo.
2. **Root Directory**: `frontend` (the framework is auto-detected as Vite).
3. Environment variable: `VITE_API_URL` = `https://<service>.onrender.com`
4. Deploy. Then add the final Vercel URL to `CORS_ORIGINS` on Render.

## 4. Google reviews, photos and map (optional)

The backend can pull the live Google rating, recent reviews, reviewer avatars and the place's photos, and the map pin. Until it is configured, the Reviews section stays hidden and the map falls back to the address in `site.js`.

1. Google Cloud Console: create a project, enable **Places API (New)**, and create an API key. Restrict the key to that API and keep it on the server only.
2. Find the salon's **Place ID**: [Place ID finder](https://developers.google.com/maps/documentation/places/web-service/place-id) (search the salon name, copy the ID that starts with `ChIJ`).
3. On Render, add `GOOGLE_PLACES_API_KEY` and `GOOGLE_PLACE_ID`.

Notes:
- Google returns up to 5 reviews (its "most relevant" set) and up to 10 place photos. This is an API limit, and there is no way to pull every review or each reviewer's own photos.
- The "Leave a review" buttons use `reviewUrl` in `site.js` (currently the VouchIQ page). It also shows as a standalone call-to-action before Google is connected.
- Responses are cached for 6 hours, so API usage stays tiny.
- The address, phone and opening hours shown in the Contact section come from Google automatically when they're not set in `site.js`.
- To preview the reviews layout locally without a key, open `http://localhost:5173/?demo-reviews` (dev only, placeholder text).

## 5. Admin page (edit everything from /admin)

Open `https://your-site.vercel.app/admin` and sign in with the admin password.

**Turn it on**
1. In Supabase, run the *Admin-managed content* block at the bottom of `supabase/schema.sql` (it creates the tables and the `site-images` photo bucket). If you already ran the file before, run just that block.
2. On Render, add `ADMIN_PASSWORD` (use a long one). `ADMIN_SECRET` is generated for you.
3. Redeploy. The page works as soon as the backend is reachable (`VITE_API_URL` set on Vercel).

**What you can change** (changes show on the live site within about 30 seconds, no redeploy):
- **Bookings**: see every booking, mark it confirmed / completed / cancelled, delete.
- **Offers**: add, edit, hide or delete offers. Each has a last valid day and disappears automatically after it.
- **Prices & Menu**: every category, service name, note and price for ladies and gents; add or remove services and categories.
- **Contact & Site**: phone, WhatsApp, email, address, opening hours, Instagram, review link, Google Maps link.
- **Photos**: replace the top-of-page photo and manage the gallery (upload, caption, size, delete).

Notes: the login lasts until you close the tab (or 12 hours), wrong passwords are rate limited, and the admin page is hidden from search engines. Until the backend is connected, the site uses the built-in defaults in `frontend/src/data/`.

## Local development

```bash
cd backend && cp .env.example .env   # fill in Supabase values
npm install && npm run dev           # http://localhost:4000

cd frontend && cp .env.example .env
npm install && npm run dev           # http://localhost:5173
```

## Customising

- **Phone, address, hours, WhatsApp, Instagram, map**: `frontend/src/data/site.js`. Empty fields are hidden. Hours are placeholders, so please confirm them.
- **Prices**: edit `frontend/src/data/menu.js`, then run `node scripts/gen-seed.mjs` and re-run `supabase/seed.sql` (or edit the `menu_items` table directly in Supabase).
- **Colours**: CSS variables at the top of `frontend/src/styles.css`.

## Images and logo

- Photos live in `frontend/public/img/`. They are free-licence Unsplash stock images used as placeholders. Replace them with real photos of the salon, keeping the same filenames, and nothing else needs to change.
- The logo is `frontend/src/components/Logo.jsx` (an "S" ribbon whose two ends are scissor finger-rings, inside a dotted gold seal). A standalone copy is at `frontend/public/logo.svg`, which is also used as the favicon.
