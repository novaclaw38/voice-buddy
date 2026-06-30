export default function QuizCard({ step, onComplete }) {
  return <div style={{ padding: 16 }}>{step.question} <button onClick={onComplete}>Answer</button></div>
}
