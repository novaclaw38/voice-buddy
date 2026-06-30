export default function ExplainCard({ step }) {
  return <div style={{ padding: 16, textAlign: 'center' }}>{step.emoji} {step.fact}</div>
}
