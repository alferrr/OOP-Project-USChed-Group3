/** The USChed help mascot: an owl in a mortarboard. Decorative; the buttons around it carry the names. */
export default function Owl({ className = 'size-full' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      {/* feet and wings */}
      <ellipse cx="26" cy="60" rx="5" ry="2.6" fill="#f0c53d" />
      <ellipse cx="38" cy="60" rx="5" ry="2.6" fill="#f0c53d" />
      <ellipse cx="11.5" cy="40" rx="5.5" ry="13" fill="#0b4f2e" transform="rotate(10 11.5 40)" />
      <ellipse cx="52.5" cy="40" rx="5.5" ry="13" fill="#0b4f2e" transform="rotate(-10 52.5 40)" />
      {/* body and belly */}
      <ellipse cx="32" cy="37" rx="21" ry="23" fill="#0f6b3f" />
      <ellipse cx="32" cy="46" rx="12.5" ry="13.5" fill="#e1ece4" />
      <path d="M26 42q3 3 6 0M32 42q3 3 6 0M23 49q3 3 6 0M35 49q3 3 6 0M29 55q3 3 6 0" fill="none" stroke="#a6c7b2" strokeWidth="1.4" strokeLinecap="round" />
      {/* face */}
      <circle cx="23" cy="31" r="10" fill="#faefc4" />
      <circle cx="41" cy="31" r="10" fill="#faefc4" />
      <g className="owl-blink" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <circle cx="23" cy="31" r="6.2" fill="#fff" />
        <circle cx="41" cy="31" r="6.2" fill="#fff" />
        <circle cx="24" cy="31.6" r="3.2" fill="#0a2f1d" />
        <circle cx="40" cy="31.6" r="3.2" fill="#0a2f1d" />
        <circle cx="25.2" cy="30.2" r="1" fill="#fff" />
        <circle cx="41.2" cy="30.2" r="1" fill="#fff" />
      </g>
      <path d="M29 36h6l-3 6z" fill="#d9a91a" />
      {/* mortarboard */}
      <path d="M32 6 52 14 32 22 12 14z" fill="#0a2f1d" />
      <path d="M22 18v6c0 2 20 2 20 0v-6l-10 4z" fill="#0b4f2e" />
      <path d="M49 15.5v8" stroke="#f0c53d" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="49" cy="25" r="2" fill="#f0c53d" />
    </svg>
  )
}
