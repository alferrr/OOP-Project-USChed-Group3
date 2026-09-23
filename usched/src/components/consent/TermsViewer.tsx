import type { ReactNode } from 'react'

/** Minimal renderer for the terms text: paragraphs, > quotes, and **bold**. No markdown library needed. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  )
}

export default function TermsViewer({ text, version }: { text: string; version: string }) {
  const blocks = text.split(/\n\s*\n/).filter(Boolean)
  return (
    <div>
      <div
        tabIndex={0}
        aria-label="Terms of Use and Privacy Notice"
        className="max-h-96 overflow-y-auto rounded-lg border border-green-100 bg-white p-4 text-sm leading-relaxed text-green-900 shadow-inner"
      >
        {blocks.map((b, i) =>
          b.startsWith('>') ? (
            <p key={i} className="mb-3 rounded border-l-4 border-gold-400 bg-gold-50 px-3 py-2 text-green-900">
              {inline(b.replace(/^>\s?/gm, ''))}
            </p>
          ) : (
            <p key={i} className="mb-3">
              {inline(b)}
            </p>
          ),
        )}
      </div>
      <p className="mt-2 text-xs text-green-900/60">Terms version {version}</p>
    </div>
  )
}
