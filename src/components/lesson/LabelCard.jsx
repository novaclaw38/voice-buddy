export default function LabelCard({ step, onComplete }) {
  return <div style={{ padding: 16 }}>{step.visual} <button onClick={onComplete}>Label</button></div>
}
