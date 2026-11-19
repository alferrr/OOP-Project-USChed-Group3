/** The USChed help mascot: the White Rabbit, waistcoat and pocket watch included. Decorative; the buttons around it carry the names. */
export default function Rabbit({ className = 'size-full' }: { className?: string }) {
  const line = { stroke: '#0a2f1d', strokeWidth: 1.3, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      {/* ears */}
      <g className="rabbit-ear" style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
        <ellipse cx="23.5" cy="13" rx="5.2" ry="13" fill="#fff" {...line} transform="rotate(-9 23.5 13)" />
        <ellipse cx="23.5" cy="14" rx="2.4" ry="9" fill="#f4b6c2" transform="rotate(-9 23.5 14)" />
      </g>
      <g className="rabbit-ear rabbit-ear-b" style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
        <ellipse cx="40.5" cy="13" rx="5.2" ry="13" fill="#fff" {...line} transform="rotate(9 40.5 13)" />
        <ellipse cx="40.5" cy="14" rx="2.4" ry="9" fill="#f4b6c2" transform="rotate(9 40.5 14)" />
      </g>
      {/* feet and body */}
      <ellipse cx="24" cy="61" rx="6" ry="2.6" fill="#fff" {...line} />
      <ellipse cx="40" cy="61" rx="6" ry="2.6" fill="#fff" {...line} />
      <ellipse cx="32" cy="49" rx="14" ry="12.5" fill="#fff" {...line} />
      {/* waistcoat, bow tie, buttons */}
      <path d="M21.5 43.5Q32 47 42.5 43.5L41 58Q32 60.5 23 58Z" fill="#2c6f8a" {...line} />
      <path d="M32 46v13" stroke="#0a2f1d" strokeWidth="1" />
      <circle cx="29.5" cy="50.5" r="1.1" fill="#f0c53d" />
      <circle cx="29.5" cy="55" r="1.1" fill="#f0c53d" />
      <path d="M32 42.8l-5-2.4v5zM32 42.8l5-2.4v5z" fill="#c0392b" {...line} />
      {/* head */}
      <circle cx="32" cy="30" r="13" fill="#fff" {...line} />
      <circle cx="24.5" cy="34" r="2.6" fill="#f4b6c2" opacity="0.55" />
      <circle cx="39.5" cy="34" r="2.6" fill="#f4b6c2" opacity="0.55" />
      <g className="rabbit-blink" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <circle cx="26.8" cy="28.6" r="2.1" fill="#0a2f1d" />
        <circle cx="37.2" cy="28.6" r="2.1" fill="#0a2f1d" />
        <circle cx="27.4" cy="27.9" r="0.7" fill="#fff" />
        <circle cx="37.8" cy="27.9" r="0.7" fill="#fff" />
      </g>
      <path d="M30.2 33.2h3.6l-1.8 2.2z" fill="#e58aa0" />
      <path d="M32 35.4v1.6M29.6 38.2q2.4 1.6 4.8 0" fill="none" stroke="#0a2f1d" strokeWidth="1" strokeLinecap="round" />
      <path d="M22 33l-6-1.2M22 35l-6 1.2M42 33l6-1.2M42 35l6 1.2" stroke="#0a2f1d" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      {/* pocket watch on its chain */}
      <path d="M29.5 50.5q9 -3 14 4" fill="none" stroke="#b48611" strokeWidth="1" />
      <circle cx="46" cy="55.5" r="5" fill="#f0c53d" stroke="#8a6a0a" strokeWidth="1.2" />
      <circle cx="46" cy="55.5" r="3.5" fill="#fffbe8" />
      <path d="M46 55.5V53M46 55.5l1.7 1" stroke="#0a2f1d" strokeWidth="0.9" strokeLinecap="round" />
      <circle cx="46" cy="50" r="1" fill="#8a6a0a" />
    </svg>
  )
}
