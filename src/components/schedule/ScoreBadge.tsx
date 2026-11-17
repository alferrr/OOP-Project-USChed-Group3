export default function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 80 ? 'bg-green-700 text-white' : score >= 60 ? 'bg-green-100 text-green-900' : 'bg-white text-green-900 ring-1 ring-green-900/15'
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold ${tone}`} aria-label={`Score ${score}`}>{score.toFixed(1)}</span>
}
