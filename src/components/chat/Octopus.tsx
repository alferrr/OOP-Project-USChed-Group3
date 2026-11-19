/** The USChed help mascot: an octopus in a mortarboard, with plenty of arms to lend. Decorative; the buttons around it carry the names. */
export default function Octopus({ className = 'size-full' }: { className?: string }) {
  const arm = { fill: 'none', strokeWidth: 5.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const pivot = { transformBox: 'fill-box' as const, transformOrigin: '50% 0%' }
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      {/* back arms */}
      <g className="octopus-arm octopus-arm-b" style={pivot}>
        <path d="M28.5 42C26.5 50 27 56 30.5 60" stroke="#0b4f2e" {...arm} />
      </g>
      <g className="octopus-arm" style={pivot}>
        <path d="M35.5 42C37.5 50 37 56 33.5 60" stroke="#0b4f2e" {...arm} />
      </g>
      {/* front arms, curling at the tips */}
      <g className="octopus-arm" style={pivot}>
        <path d="M18 38C10 42 7.5 50 11.5 56C13.5 59 18 58 17.5 54.5" stroke="#0f6b3f" {...arm} />
        <circle cx="10.5" cy="46" r="1" fill="#a6c7b2" /><circle cx="11" cy="51.5" r="1" fill="#a6c7b2" />
      </g>
      <g className="octopus-arm octopus-arm-b" style={pivot}>
        <path d="M24.5 43C20.5 49.5 21.5 56 25.5 59C28 60.8 31 59 30 56.5" stroke="#0f6b3f" {...arm} />
        <circle cx="22.4" cy="50" r="1" fill="#a6c7b2" /><circle cx="24" cy="55" r="1" fill="#a6c7b2" />
      </g>
      <g className="octopus-arm" style={pivot}>
        <path d="M39.5 43C43.5 49.5 42.5 56 38.5 59C36 60.8 33 59 34 56.5" stroke="#0f6b3f" {...arm} />
        <circle cx="41.6" cy="50" r="1" fill="#a6c7b2" /><circle cx="40" cy="55" r="1" fill="#a6c7b2" />
      </g>
      <g className="octopus-arm octopus-arm-b" style={pivot}>
        <path d="M46 38C54 42 56.5 50 52.5 56C50.5 59 46 58 46.5 54.5" stroke="#0f6b3f" {...arm} />
        <circle cx="53.5" cy="46" r="1" fill="#a6c7b2" /><circle cx="53" cy="51.5" r="1" fill="#a6c7b2" />
      </g>
      {/* head */}
      <ellipse cx="32" cy="27" rx="19" ry="20" fill="#0f6b3f" />
      <ellipse cx="24" cy="17" rx="6" ry="3.4" fill="#2f7d4f" opacity="0.7" transform="rotate(-25 24 17)" />
      {/* face */}
      <g className="octopus-blink" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <circle cx="25" cy="28" r="6" fill="#fff" />
        <circle cx="39" cy="28" r="6" fill="#fff" />
        <circle cx="26" cy="28.8" r="3.1" fill="#0a2f1d" />
        <circle cx="38" cy="28.8" r="3.1" fill="#0a2f1d" />
        <circle cx="27.1" cy="27.5" r="1" fill="#fff" />
        <circle cx="39.1" cy="27.5" r="1" fill="#fff" />
      </g>
      <circle cx="18.5" cy="35" r="2.8" fill="#f4b6c2" opacity="0.55" />
      <circle cx="45.5" cy="35" r="2.8" fill="#f4b6c2" opacity="0.55" />
      <path d="M28 36.2q4 3.4 8 0" fill="none" stroke="#0a2f1d" strokeWidth="1.3" strokeLinecap="round" />
      {/* mortarboard */}
      <path d="M32 2 51 9 32 16 13 9z" fill="#0a2f1d" />
      <path d="M22.5 12.4v5c0 2 19 2 19 0v-5l-9.5 3.6z" fill="#0b4f2e" />
      <path d="M48.5 10.4v8" stroke="#f0c53d" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="48.5" cy="20" r="2" fill="#f0c53d" />
    </svg>
  )
}
