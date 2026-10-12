import { useCallback, useEffect, useState } from 'react'
import './admin.css'
import { api, BASE, fileToDataUrl, getToken, setToken } from './adminApi.js'
import { SITE } from '../data/site.js'

const TABS = [
  ['bookings', 'Bookings'],
  ['offers', 'Offers'],
  ['menu', 'Prices & Menu'],
  ['site', 'Contact & Site'],
  ['photos', 'Photos'],
]
const ICONS = ['scissors', 'drop', 'spa', 'sparkle', 'eye', 'hands', 'face', 'sun', 'nail']

/* ---------- small helpers ---------- */

function useToast() {
  const [t, setT] = useState(null)
  const show = useCallback((msg, kind = 'ok') => {
    setT({ msg, kind, id: Date.now() })
    setTimeout(() => setT((x) => (x && Date.now() - x.id >= 3500 ? null : x)), 3600)
  }, [])
  return [t, show]
}

// Runs an async action and reports success/failure as a toast.
const useAction = (toast) => async (fn, okMsg = 'Saved') => {
  try {
    const r = await fn()
    toast(okMsg)
    return r
  } catch (e) {
    toast(e.message, 'err')
    return undefined
  }
}

function useLoad(path) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(() => {
    setError('')
    api.get(path).then(setData).catch((e) => setError(e.message))
  }, [path])
  useEffect(load, [load])
  return { data, setData, error, load }
}

const Field = ({ label, hint, children }) => (
  <label className="fld">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
)

/* ---------- login ---------- */

function Login({ onDone }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const { token } = await api.login(pw)
      setToken(token)
      onDone()
    } catch (e2) {
      setErr(e2.message)
    }
    setBusy(false)
  }
  return (
    <div className="login">
      <form onSubmit={submit} className="card-a">
        <h1>Salon admin</h1>
        <p className="muted">Sign in to manage your website.</p>
        {!BASE && <p className="err">This site has no backend connected (VITE_API_URL is not set), so the admin cannot work yet.</p>}
        <Field label="Password">
          <input type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        </Field>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn-a primary" disabled={busy || !pw}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <a className="muted small" href="/">← Back to website</a>
      </form>
    </div>
  )
}

/* ---------- bookings ---------- */

const STATUS = ['pending', 'confirmed', 'completed', 'cancelled']

function Bookings({ toast }) {
  const act = useAction(toast)
  const { data, setData, error, load } = useLoad('/bookings')
  const [filter, setFilter] = useState('all')
  if (error) return <Problem msg={error} retry={load} />
  if (!data) return <Loading />
  const rows = data.filter((b) => filter === 'all' || b.status === filter)
  const counts = STATUS.reduce((a, s) => ({ ...a, [s]: data.filter((b) => b.status === s).length }), {})

  const setStatus = (b, status) =>
    act(async () => {
      await api.patch(`/bookings/${b.id}`, { status })
      setData(data.map((x) => (x.id === b.id ? { ...x, status } : x)))
    }, 'Status updated')
  const remove = (b) =>
    confirm(`Delete the booking from ${b.name}? This cannot be undone.`) &&
    act(async () => {
      await api.del(`/bookings/${b.id}`)
      setData(data.filter((x) => x.id !== b.id))
    }, 'Booking deleted')

  return (
    <>
      <div className="bar">
        <div className="chips">
          {['all', ...STATUS].map((s) => (
            <button key={s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>
              {s} {s === 'all' ? data.length : counts[s]}
            </button>
          ))}
        </div>
        <button className="btn-a" onClick={load}>Refresh</button>
      </div>
      {rows.length === 0 && <p className="muted pad">No bookings here yet.</p>}
      <div className="list">
        {rows.map((b) => (
          <div className={`row-a st-${b.status}`} key={b.id}>
            <div className="grow">
              <b>{b.name}</b> <span className="pill">{b.for_whom === 'men' ? 'Gents' : 'Ladies'}</span>
              <div>{b.service}</div>
              <div className="muted">
                {b.date} at {b.time} · <a href={`tel:${b.phone}`}>{b.phone}</a>
                {b.email && <> · <a href={`mailto:${b.email}`}>{b.email}</a></>}
              </div>
              {b.notes && <div className="note">“{b.notes}”</div>}
              <small className="muted">Received {new Date(b.created_at).toLocaleString('en-IN')}</small>
            </div>
            <div className="acts">
              <select value={b.status} onChange={(e) => setStatus(b, e.target.value)} aria-label="Status">
                {STATUS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button className="btn-a danger" onClick={() => remove(b)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ---------- offers ---------- */

const blankOffer = () => ({ _new: true, title: '', badge: '', description: '', items: [], was: null, now: null, who: 'ladies', ends: '', terms: '', active: true })

function OfferForm({ offer, onSaved, onRemoved, toast }) {
  const act = useAction(toast)
  const [o, setO] = useState({ ...offer, itemsText: (offer.items || []).join('\n') })
  const set = (k) => (e) => setO((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const num = (v) => (v === '' || v == null ? null : Number(v))
  const expired = o.ends && new Date(`${o.ends}T23:59:59+05:30`) < new Date()

  const payload = () => ({
    title: o.title, badge: o.badge, description: o.description || '',
    items: o.itemsText.split('\n').map((x) => x.trim()).filter(Boolean),
    was: num(o.was), now: num(o.now), who: o.who, ends: o.ends, terms: o.terms || null, active: o.active,
  })
  const save = async (e) => {
    e.preventDefault()
    const saved = await act(() => (o._new ? api.post('/offers', payload()) : api.put(`/offers/${o.id}`, payload())), 'Offer saved')
    if (saved) onSaved(saved, offer._new ? offer : null)
  }
  const remove = async () => {
    if (!confirm('Delete this offer?')) return
    if (offer._new) return onRemoved(offer)
    if (await act(() => api.del(`/offers/${o.id}`), 'Offer deleted')) onRemoved(offer)
  }

  return (
    <form className="card-a" onSubmit={save}>
      <div className="head-a">
        <h3>{o.title || 'New offer'}</h3>
        {expired && <span className="pill warn">Ended: not shown on the site</span>}
        {!o.active && !expired && <span className="pill warn">Hidden</span>}
      </div>
      <div className="grid2">
        <Field label="Title"><input required value={o.title} onChange={set('title')} placeholder="Haircut + Hair Spa Combo" /></Field>
        <Field label="Ribbon text" hint='Shown on the corner, e.g. "SAVE ₹351" or "10% OFF"'><input required value={o.badge} onChange={set('badge')} /></Field>
      </div>
      <Field label="Short description"><input value={o.description} onChange={set('description')} /></Field>
      <Field label="What is included" hint="One item per line (optional)"><textarea rows={3} value={o.itemsText} onChange={set('itemsText')} /></Field>
      <div className="grid4">
        <Field label="Old price ₹" hint="Optional"><input type="number" min="0" value={o.was ?? ''} onChange={set('was')} /></Field>
        <Field label="Offer price ₹" hint="Optional"><input type="number" min="0" value={o.now ?? ''} onChange={set('now')} /></Field>
        <Field label="For">
          <select value={o.who} onChange={set('who')}><option value="ladies">Ladies</option><option value="men">Gents</option></select>
        </Field>
        <Field label="Last valid day" hint="Offer disappears after this day"><input type="date" required value={o.ends} onChange={set('ends')} /></Field>
      </div>
      <Field label="Small print" hint="Optional"><input value={o.terms || ''} onChange={set('terms')} /></Field>
      <label className="check"><input type="checkbox" checked={o.active} onChange={set('active')} /> Show this offer on the website</label>
      <div className="acts-row">
        <button className="btn-a primary">Save offer</button>
        <button type="button" className="btn-a danger" onClick={remove}>Delete</button>
      </div>
    </form>
  )
}

function Offers({ toast }) {
  const { data, setData, error, load } = useLoad('/offers')
  if (error) return <Problem msg={error} retry={load} />
  if (!data) return <Loading />
  const replace = (saved, old) =>
    setData(old ? data.map((x) => (x === old ? saved : x)) : data.map((x) => (x.id === saved.id ? saved : x)))
  return (
    <>
      <div className="bar">
        <p className="muted">Offers appear on the site until their last valid day, then vanish automatically.</p>
        <button className="btn-a primary" onClick={() => setData([blankOffer(), ...data])}>+ Add offer</button>
      </div>
      {data.length === 0 && <p className="muted pad">No offers yet. Add one to show the offers bar and section on the site.</p>}
      <div className="stack">
        {data.map((o) => (
          <OfferForm key={o.id || `new-${data.indexOf(o)}`} offer={o} toast={toast} onSaved={replace} onRemoved={(x) => setData(data.filter((y) => y !== x))} />
        ))}
      </div>
    </>
  )
}

/* ---------- menu ---------- */

function ItemRow({ item, cols, sectionId, sort, toast, onChange, onRemove }) {
  const act = useAction(toast)
  const n = Math.max(1, cols?.length || 1)
  const init = () => ({ name: item.name || '', note: item.note || '', prices: Array.from({ length: n }, (_, i) => item.prices?.[i] ?? '') })
  const [v, setV] = useState(init)
  const [dirty, setDirty] = useState(Boolean(item._new))
  const edit = (patch) => {
    setV((p) => ({ ...p, ...patch }))
    setDirty(true)
  }
  const setPrice = (i, val) => edit({ prices: v.prices.map((p, j) => (j === i ? val : p)) })
  const body = () => ({
    name: v.name, note: v.note || null,
    prices: v.prices.map((p) => (p === '' || p == null ? null : Number(p))),
    ...(item._new ? { section_id: sectionId, sort } : {}),
  })
  const save = async () => {
    const saved = await act(() => (item._new ? api.post('/menu/items', body()) : api.put(`/menu/items/${item.id}`, body())), 'Saved')
    if (saved) {
      setDirty(false)
      onChange(saved, item)
    }
  }
  const remove = async () => {
    if (item._new) return onRemove(item)
    if (!confirm(`Delete "${item.name}"?`)) return
    if (await act(() => api.del(`/menu/items/${item.id}`), 'Deleted')) onRemove(item)
  }
  return (
    <div className={`item-a ${dirty ? 'dirty' : ''}`}>
      <input className="nm" aria-label="Service name" placeholder="Service name" value={v.name} onChange={(e) => edit({ name: e.target.value })} />
      <input className="nt" aria-label="Note" placeholder="note (e.g. onwards)" value={v.note} onChange={(e) => edit({ note: e.target.value })} />
      {v.prices.map((p, i) => (
        <label key={i} className="pr">
          <small>{cols?.[i] || '₹'}</small>
          <input type="number" min="0" aria-label={`Price ${cols?.[i] || ''}`} value={p} onChange={(e) => setPrice(i, e.target.value)} />
        </label>
      ))}
      <button className="btn-a primary sm" disabled={!dirty || !v.name.trim()} onClick={save}>Save</button>
      <button className="btn-a danger sm" onClick={remove}>✕</button>
    </div>
  )
}

function Section({ section, toast, onChanged, onRemoved }) {
  const act = useAction(toast)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(section.title)
  const [icon, setIcon] = useState(section.icon)
  const [colsText, setColsText] = useState((section.cols || []).join(', '))
  const [items, setItems] = useState(section.items)
  const parseCols = () => colsText.split(',').map((c) => c.trim()).filter(Boolean)

  const saveSection = () =>
    act(async () => {
      await api.put(`/menu/sections/${section.id}`, { audience: section.audience, title, icon, cols: parseCols(), sort: section.sort })
      onChanged({ ...section, title, icon, cols: parseCols().length ? parseCols() : null, items })
    }, 'Category saved')
  const removeSection = async () => {
    if (!confirm(`Delete the whole "${section.title}" category and all ${items.length} services in it?`)) return
    if (await act(() => api.del(`/menu/sections/${section.id}`), 'Category deleted')) onRemoved(section)
  }
  const addItem = () => setItems([...items, { _new: true, name: '', note: '', prices: [] }])
  const changed = (saved, old) => setItems(items.map((x) => (x === old ? saved : x)))
  const removed = (it) => setItems(items.filter((x) => x !== it))
  const colCount = Math.max(1, parseCols().length)

  return (
    <div className="card-a sec">
      <button className="sec-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <b>{section.title}</b>
        <span className="muted">{items.filter((i) => !i._new).length} services</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="sec-body">
          <div className="grid3">
            <Field label="Category name"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Icon"><select value={icon} onChange={(e) => setIcon(e.target.value)}>{ICONS.map((i) => <option key={i}>{i}</option>)}</select></Field>
            <Field label="Price columns" hint="Leave empty for one price. Or e.g. Rika, Aloe, Choco">
              <input value={colsText} onChange={(e) => setColsText(e.target.value)} placeholder="(single price)" />
            </Field>
          </div>
          {colCount !== Math.max(1, section.cols?.length || 1) && <p className="warn-t">Save the category, then re-enter prices so each service has {colCount} price box{colCount > 1 ? 'es' : ''}.</p>}
          <div className="acts-row">
            <button className="btn-a primary" onClick={saveSection}>Save category</button>
            <button className="btn-a danger" onClick={removeSection}>Delete category</button>
          </div>
          <h4>Services &amp; prices</h4>
          <div className="items-a">
            {items.map((it, i) => (
              <ItemRow key={it.id || `n${i}`} item={it} cols={section.cols} sectionId={section.id} sort={i} toast={toast} onChange={changed} onRemove={removed} />
            ))}
          </div>
          <button className="btn-a" onClick={addItem}>+ Add service</button>
        </div>
      )}
    </div>
  )
}

function MenuTab({ toast }) {
  const act = useAction(toast)
  const { data, setData, error, load } = useLoad('/menu')
  const [who, setWho] = useState('ladies')
  const [adding, setAdding] = useState(false)
  const [nt, setNt] = useState({ title: '', icon: 'sparkle', cols: '' })
  if (error) return <Problem msg={error} retry={load} />
  if (!data) return <Loading />
  const list = data.filter((s) => s.audience === who)

  const create = async (e) => {
    e.preventDefault()
    const cols = nt.cols.split(',').map((c) => c.trim()).filter(Boolean)
    const s = await act(() => api.post('/menu/sections', { audience: who, title: nt.title, icon: nt.icon, cols, sort: list.length }), 'Category added')
    if (s) {
      setData([...data, s])
      setNt({ title: '', icon: 'sparkle', cols: '' })
      setAdding(false)
    }
  }

  return (
    <>
      <div className="bar">
        <div className="chips">
          {[['ladies', 'Ladies menu'], ['men', 'Gents menu']].map(([k, l]) => (
            <button key={k} className={who === k ? 'on' : ''} onClick={() => setWho(k)}>{l}</button>
          ))}
        </div>
        <button className="btn-a primary" onClick={() => setAdding(!adding)}>+ Add category</button>
      </div>
      {adding && (
        <form className="card-a" onSubmit={create}>
          <div className="grid3">
            <Field label="Category name"><input required value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })} /></Field>
            <Field label="Icon"><select value={nt.icon} onChange={(e) => setNt({ ...nt, icon: e.target.value })}>{ICONS.map((i) => <option key={i}>{i}</option>)}</select></Field>
            <Field label="Price columns" hint="Optional, e.g. Manicure, Pedicure"><input value={nt.cols} onChange={(e) => setNt({ ...nt, cols: e.target.value })} /></Field>
          </div>
          <div className="acts-row"><button className="btn-a primary">Create category</button></div>
        </form>
      )}
      <p className="muted pad">Open a category to edit service names and prices. Changes go live as soon as you press Save.</p>
      <div className="stack">
        {list.map((s) => (
          <Section key={s.id} section={s} toast={toast}
            onChanged={(ns) => setData(data.map((x) => (x.id === ns.id ? ns : x)))}
            onRemoved={(rs) => setData(data.filter((x) => x.id !== rs.id))} />
        ))}
      </div>
    </>
  )
}

/* ---------- contact & site ---------- */

function SiteTab({ toast }) {
  const act = useAction(toast)
  const { data, error, load } = useLoad('/settings')
  const [f, setF] = useState(null)
  useEffect(() => {
    // Start from what the website shows today (built-in defaults + anything already saved), so
    // saving never blanks a value that was only coming from the defaults.
    if (data) {
      const keys = ['phone', 'whatsapp', 'email', 'address', 'mapEmbedUrl', 'instagram', 'hoursSummary', 'reviewUrl', 'placeId', 'offerNote', 'hours']
      setF({ ...Object.fromEntries(keys.map((k) => [k, SITE[k] ?? (k === 'hours' ? [] : '')])), ...data })
    }
  }, [data])
  if (error) return <Problem msg={error} retry={load} />
  if (!f) return <Loading />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setHour = (i, j, v) => setF({ ...f, hours: f.hours.map((h, x) => (x === i ? h.map((c, y) => (y === j ? v : c)) : h)) })
  const save = (e) => {
    e.preventDefault()
    const clean = { ...f, hours: f.hours.filter(([d, t]) => d.trim() && t.trim()) }
    act(() => api.put('/settings', clean), 'Site details saved')
  }
  return (
    <form className="stack" onSubmit={save}>
      <div className="card-a">
        <h3>Contact details</h3>
        <p className="muted small">Leave a box empty to hide it from the website.</p>
        <div className="grid2">
          <Field label="Phone" hint="Shown everywhere; the Call button dials it"><input value={f.phone} onChange={set('phone')} placeholder="081236 71157" /></Field>
          <Field label="WhatsApp number" hint="Digits with country code, e.g. 918123671157"><input value={f.whatsapp} onChange={set('whatsapp')} /></Field>
          <Field label="Email"><input type="email" value={f.email} onChange={set('email')} /></Field>
          <Field label="Instagram link"><input value={f.instagram} onChange={set('instagram')} placeholder="https://instagram.com/…" /></Field>
        </div>
        <Field label="Address"><textarea rows={2} value={f.address} onChange={set('address')} /></Field>
      </div>

      <div className="card-a">
        <h3>Opening hours</h3>
        <Field label="Short line for the top bar" hint='e.g. "Open daily 10 AM – 9 PM"'><input value={f.hoursSummary} onChange={set('hoursSummary')} /></Field>
        <div className="hours-a">
          {f.hours.map(([d, t], i) => (
            <div key={i} className="hrow">
              <input aria-label="Days" placeholder="Monday – Saturday" value={d} onChange={(e) => setHour(i, 0, e.target.value)} />
              <input aria-label="Hours" placeholder="10:00 AM – 9:00 PM" value={t} onChange={(e) => setHour(i, 1, e.target.value)} />
              <button type="button" className="btn-a danger sm" onClick={() => setF({ ...f, hours: f.hours.filter((_, x) => x !== i) })}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-a" onClick={() => setF({ ...f, hours: [...f.hours, ['', '']] })}>+ Add a line</button>
      </div>

      <div className="card-a">
        <h3>Links &amp; wording</h3>
        <Field label="Review link" hint="Where the Leave a review buttons go"><input value={f.reviewUrl} onChange={set('reviewUrl')} /></Field>
        <Field label="Google Maps embed link" hint="Optional. Google Maps → Share → Embed a map → copy the src=&quot;…&quot; address"><input value={f.mapEmbedUrl} onChange={set('mapEmbedUrl')} /></Field>
        <Field label="Google place ID"><input value={f.placeId} onChange={set('placeId')} /></Field>
        <Field label="Line shown above the offers"><input value={f.offerNote} onChange={set('offerNote')} /></Field>
      </div>
      <div className="acts-row"><button className="btn-a primary lg">Save changes</button></div>
    </form>
  )
}

/* ---------- photos ---------- */

function Photos({ toast }) {
  const act = useAction(toast)
  const gal = useLoad('/gallery')
  const set = useLoad('/settings')
  const [busy, setBusy] = useState(false)
  if (gal.error || set.error) return <Problem msg={gal.error || set.error} retry={() => { gal.load(); set.load() }} />
  if (!gal.data || !set.data) return <Loading />

  const upload = async (file) => {
    const dataUrl = await fileToDataUrl(file)
    return api.post('/upload', { dataUrl })
  }
  const changeHero = async (file) => {
    if (!file) return
    setBusy(true)
    await act(async () => {
      const { url } = await upload(file)
      const next = { ...set.data, heroImage: url }
      await api.put('/settings', next)
      set.setData(next)
    }, 'Main photo updated')
    setBusy(false)
  }
  const resetHero = () =>
    act(async () => {
      const next = { ...set.data, heroImage: '' }
      await api.put('/settings', next)
      set.setData(next)
    }, 'Back to the default photo')
  const addPhotos = async (files) => {
    setBusy(true)
    for (const file of files) {
      await act(async () => {
        const { url, path } = await upload(file)
        const row = await api.post('/gallery', { url, path, caption: '', shape: '', sort: gal.data.length })
        gal.setData((d) => [...d, row])
      }, 'Photo added')
    }
    setBusy(false)
  }
  const update = (g, patch) => gal.setData(gal.data.map((x) => (x.id === g.id ? { ...x, ...patch } : x)))
  const save = (g) => act(() => api.put(`/gallery/${g.id}`, { caption: g.caption || '', shape: g.shape || '', sort: g.sort }), 'Photo saved')
  const remove = async (g) => {
    if (!confirm('Delete this photo?')) return
    if (await act(() => api.del(`/gallery/${g.id}`), 'Photo deleted')) gal.setData(gal.data.filter((x) => x.id !== g.id))
  }

  return (
    <div className="stack">
      <div className="card-a">
        <h3>Main (top of page) photo</h3>
        <div className="hero-prev"><img src={set.data.heroImage || '/img/hero.jpg'} alt="Current main photo" /></div>
        <div className="acts-row">
          <label className="btn-a primary file">
            {busy ? 'Uploading…' : 'Upload a new photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={(e) => changeHero(e.target.files[0])} />
          </label>
          {set.data.heroImage && <button className="btn-a" onClick={resetHero}>Use default photo</button>}
        </div>
        <p className="muted small">Tip: a wide photo with the person on the right looks best.</p>
      </div>

      <div className="card-a">
        <h3>Gallery photos</h3>
        <p className="muted small">
          {gal.data.length === 0 ? 'No photos added yet, so the website shows its built-in sample gallery. Upload your own to replace it.' : 'These replace the sample gallery on the website.'}
        </p>
        <label className="btn-a primary file">
          {busy ? 'Uploading…' : '+ Add photos'}
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={(e) => addPhotos([...e.target.files])} />
        </label>
        <div className="gal">
          {gal.data.map((g) => (
            <div className="gcard" key={g.id}>
              <img src={g.url} alt={g.caption || 'Gallery photo'} />
              <input placeholder="Caption (optional)" value={g.caption || ''} onChange={(e) => update(g, { caption: e.target.value })} />
              <select value={g.shape || ''} onChange={(e) => update(g, { shape: e.target.value })} aria-label="Size on the page">
                <option value="">Normal size</option><option value="tall">Tall</option><option value="wide">Wide</option>
              </select>
              <div className="acts-row">
                <button className="btn-a primary sm" onClick={() => save(g)}>Save</button>
                <button className="btn-a danger sm" onClick={() => remove(g)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- shell ---------- */

const Loading = () => <p className="muted pad">Loading…</p>
const Problem = ({ msg, retry }) => (
  <div className="card-a">
    <p className="err">{msg}</p>
    <button className="btn-a" onClick={retry}>Try again</button>
  </div>
)

export default function Admin() {
  const [authed, setAuthed] = useState(Boolean(getToken()))
  const [tab, setTab] = useState('bookings')
  const [toastMsg, toast] = useToast()

  useEffect(() => {
    document.title = 'Admin | Stylish Family Salon'
    const m = document.createElement('meta')
    m.name = 'robots'
    m.content = 'noindex,nofollow'
    document.head.appendChild(m)
    const out = () => setAuthed(false)
    window.addEventListener('admin-logout', out)
    return () => {
      window.removeEventListener('admin-logout', out)
      m.remove()
    }
  }, [])

  if (!authed) return <Login onDone={() => setAuthed(true)} />
  const logout = () => {
    setToken(null)
    setAuthed(false)
  }
  return (
    <div className="admin">
      <header className="top">
        <div className="wrap-a">
          <b>Salon admin</b>
          <span className="grow" />
          <a href="/" target="_blank" rel="noreferrer">View website ↗</a>
          <button className="btn-a sm" onClick={logout}>Sign out</button>
        </div>
        <nav className="wrap-a tabs" aria-label="Admin sections">
          {TABS.map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </nav>
      </header>
      <main className="wrap-a body">
        {tab === 'bookings' && <Bookings toast={toast} />}
        {tab === 'offers' && <Offers toast={toast} />}
        {tab === 'menu' && <MenuTab toast={toast} />}
        {tab === 'site' && <SiteTab toast={toast} />}
        {tab === 'photos' && <Photos toast={toast} />}
      </main>
      {toastMsg && <div className={`toast ${toastMsg.kind}`} role="status">{toastMsg.msg}</div>}
    </div>
  )
}
