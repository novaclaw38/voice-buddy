import { useSearchParams, useNavigate } from 'react-router-dom'
import { COURSES } from '../utils/courses.js'

export default function LessonPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const courseId = searchParams.get('course')
  const lessonId = searchParams.get('lesson')
  const course = COURSES.find(c => c.id === courseId)
  const lesson = course?.lessons.find(l => l.id === lessonId)

  if (!lesson) {
    navigate('/courses')
    return null
  }

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <h1>{lesson.emoji} {lesson.title}</h1>
      <p>Lesson page coming soon — {lesson.steps.length} steps</p>
      <button onClick={() => navigate('/courses')}>← Back</button>
    </div>
  )
}
