import { useNavigate } from 'react-router-dom'
import { COURSES } from '../utils/courses.js'
import { useSubscription } from '../hooks/useSubscription.jsx'
import { useCompletions } from '../hooks/useCompletions.js'
import UpgradePrompt from '../components/UpgradePrompt.jsx'
import { useState } from 'react'
import { getSettings } from '../utils/storage.js'
import styles from './CoursesPage.module.css'

export default function CoursesPage({ session }) {
  const navigate = useNavigate()
  const { isPro } = useSubscription()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [settings] = useState(() => getSettings())
  const durationLabel = (settings.childAge || 7) <= 6 ? '~15 min' : '~30 min'
  const { completions } = useCompletions()

  const handleLesson = (courseId, lessonId) => {
    if (!isPro) { setShowUpgrade(true); return }
    navigate(`/lesson?course=${courseId}&lesson=${lessonId}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />

      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/app')}>← Back to Buddy</button>
        <h1 className={styles.title}>Courses</h1>
        <p className={styles.sub}>Interactive lessons taught by Buddy, just for you</p>
      </header>

      <div className={styles.grid}>
        {COURSES.map((course) => (
          <div key={course.id} className={styles.courseCard}>
            <div
              className={styles.courseHeader}
              style={{ background: `linear-gradient(135deg, ${course.color[0]}, ${course.color[1]})` }}
            >
              <span className={styles.courseEmoji}>{course.emoji}</span>
              {!isPro && <span className={styles.lockBadge}>🔒 Pro</span>}
            </div>
            <div className={styles.courseBody}>
              <h2 className={styles.courseName}>{course.title}</h2>
              <p className={styles.courseDesc}>{course.description}</p>
              <button
                className={styles.expandBtn}
                onClick={() => setExpanded(expanded === course.id ? null : course.id)}
              >
                {expanded === course.id ? 'Hide lessons ▲' : `${course.lessons.length} lessons ▼`}
              </button>

              {expanded === course.id && (
                <ul className={styles.lessons}>
                  {course.lessons.map((lesson, i) => (
                    <li key={lesson.id}>
                      <button
                        className={styles.lessonBtn}
                        onClick={() => handleLesson(course.id, lesson.id)}
                      >
                        <span className={styles.lessonNum}>{i + 1}</span>
                        <span className={styles.lessonEmoji}>{lesson.emoji}</span>
                        <span className={styles.lessonTitle}>{lesson.title}</span>
                        {completions.has(`${course.id}:${lesson.id}`) && (
                          <span className={styles.lessonCheck}>✅</span>
                        )}
                        <span className={styles.lessonDuration}>{durationLabel}</span>
                        <span className={styles.lessonArrow}>{isPro ? '→' : '🔒'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {showUpgrade && (
        <UpgradePrompt session={session} onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  )
}
