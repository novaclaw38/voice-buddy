export default function RewardScreen({ lesson, course, childName, onBack }) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <h1>🌟 You did it!</h1>
      <button onClick={onBack}>← Back to Courses</button>
    </div>
  )
}
