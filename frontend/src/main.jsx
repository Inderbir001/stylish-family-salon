import React, { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// The admin page lives at /admin and is loaded only when visited, so it adds nothing to the public site.
const Admin = lazy(() => import('./admin/Admin.jsx'))
const isAdmin = location.pathname.replace(/\/+$/, '') === '/admin'

createRoot(document.getElementById('root')).render(
  isAdmin ? (
    <Suspense fallback={null}>
      <Admin />
    </Suspense>
  ) : (
    <App />
  ),
)
