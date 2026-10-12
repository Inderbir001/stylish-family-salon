export const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const KEY = 'salon-admin-token'

// sessionStorage: the login ends when the tab closes. Wrapped because storage can be blocked.
export const getToken = () => {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}
export const setToken = (t) => {
  try {
    if (t) sessionStorage.setItem(KEY, t)
    else sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

async function call(method, path, body) {
  const res = await fetch(`${BASE}/api/admin${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && path !== '/login') {
    setToken(null)
    window.dispatchEvent(new Event('admin-logout'))
  }
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

export const api = {
  login: (password) => call('POST', '/login', { password }),
  get: (p) => call('GET', p),
  post: (p, b) => call('POST', p, b),
  put: (p, b) => call('PUT', p, b),
  patch: (p, b) => call('PATCH', p, b),
  del: (p) => call('DELETE', p),
}

// Shrinks a photo in the browser before upload (max 1600px, JPEG) so uploads are quick and small.
export function fileToDataUrl(file, maxSide = 1600) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.84))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image.'))
    }
    img.src = url
  })
}
