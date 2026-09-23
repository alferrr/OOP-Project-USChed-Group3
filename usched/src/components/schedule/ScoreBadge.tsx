export default function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 80 ? 'bg-green-700 text-white' : score >= 60 ? 'bg-gold-400 text-green-900' : 'bg-gold-100 text-green-900'
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`} aria-label={`Score ${score}`}>{score.toFixed(1)}</span>
}
