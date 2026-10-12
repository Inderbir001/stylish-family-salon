import { useId } from 'react'

// Monogram: an "S" ribbon whose two ends are scissor finger-rings, inside a dotted gold seal.
export function LogoMark({ size = 44 }) {
  const id = useId().replace(/:/g, '')
  const g = `g${id}`
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className="logo-mark">
      <defs>
        <linearGradient id={g} x1="8" y1="6" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f6e2aa" />
          <stop offset=".55" stopColor="#d9b36c" />
          <stop offset="1" stopColor="#a97b34" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="#120c0f" stroke={`url(#${g})`} strokeWidth="1.5" />
      <circle cx="32" cy="32" r="26.500" stroke={`url(#${g})`} strokeOpacity=".4" strokeWidth=".7" strokeDasharray="1.200 2.200" />
      <path d="M41.500 20.500C37 12 21 14.500 22.500 24.500C24 34 41.500 29.500 41.500 40C41.500 50 27 51.500 22.500 43.500" stroke={`url(#${g})`} strokeWidth="3.400" strokeLinecap="round" />
      <circle cx="45" cy="17" r="4.200" stroke={`url(#${g})`} strokeWidth="2" />
      <circle cx="19" cy="47" r="4.200" stroke={`url(#${g})`} strokeWidth="2" />
      <path d="M32 5 33.100 7.900 36 9 33.100 10.100 32 13 30.900 10.100 28 9 30.900 7.900Z" fill="#f6e2aa" />
    </svg>
  )
}

export default function Logo({ size = 44, href = '#top', onClick }) {
  return (
    <a href={href} className="brand" onClick={onClick} aria-label="Stylish Family Salon — home">
      <LogoMark size={size} />
      <span>
        <b>Stylish Family</b>
        <small>Unisex Salon</small>
      </span>
    </a>
  )
}
