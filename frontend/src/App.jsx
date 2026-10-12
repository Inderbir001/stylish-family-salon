import { useEffect, useState } from 'react'
import { MENU } from './data/menu.js'
import { fetchMenu, fetchPlace, fetchSite } from './lib/api.js'
import { applySite } from './data/site.js'
import { ScrollFX, TopBar, Nav, Hero, Marquee, Services, Split, Gallery, About, Contact, Footer, StickyBar } from './components/Sections.jsx'
import Menu from './components/Menu.jsx'
import Reviews from './components/Reviews.jsx'
import Booking from './components/Booking.jsx'
import { AnnounceBar, Offers } from './components/Offers.jsx'

export default function App() {
  const [menu, setMenu] = useState(MENU)
  const [place, setPlace] = useState(null)
  const [, setVersion] = useState(0) // bumped when admin-managed site data arrives, to re-render

  // In-page links scroll smoothly without putting "#section" in the address bar.
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest?.('a[href^="#"]')
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return
      const id = a.getAttribute('href').slice(1)
      const el = id === 'top' || !id ? document.body : document.getElementById(id)
      if (!el) return
      e.preventDefault()
      if (el === document.body) window.scrollTo({ top: 0, behavior: 'smooth' })
      else el.scrollIntoView({ behavior: 'smooth' })
      history.replaceState(null, '', location.pathname + location.search)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    let live = true
    fetchMenu().then((m) => live && setMenu(m))
    fetchPlace().then((p) => live && setPlace(p))
    fetchSite().then((d) => {
      if (!live) return
      applySite(d)
      setVersion((v) => v + 1)
    })
    return () => {
      live = false
    }
  }, [])

  return (
    <>
      <ScrollFX />
      <AnnounceBar />
      <TopBar place={place} />
      <Nav />
      <main>
        <Hero place={place} />
        <Marquee />
        <Offers />
        <Services />
        <Split />
        <Menu menu={menu} />
        <Gallery />
        <Reviews place={place} />
        <About />
        <Booking menu={menu} />
        <Contact place={place} />
      </main>
      <Footer place={place} />
      <StickyBar place={place} />
    </>
  )
}
