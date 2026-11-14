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
        role="region"
        // a scrollable region must be focusable so keyboard users can scroll it
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        aria-label="Terms of Use and Privacy Notice"
        className="max-h-96 overflow-y-auto rounded-2xl bg-green-50 p-5 text-sm leading-relaxed text-green-900"
      >
        {blocks.map((b, i) =>
          b.startsWith('>') ? (
            <p key={i} className="mb-3 rounded-2xl bg-gold-50 px-4 py-3 text-green-900">
              {inline(b.replace(/^>\s?/gm, ''))}
            </p>
          ) : (
            <p key={i} className="mb-3">
              {inline(b)}
            </p>
          ),
        )}
      </div>
      <p className="mt-2 text-xs text-green-900/70">Terms version {version}</p>
    </div>
  )
}
