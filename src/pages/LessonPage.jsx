import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { COURSES } from '../utils/courses.js'
import { getSettings } from '../utils/storage.js'
import { useSpeech } from '../hooks/useSpeech.js'
import BuddyAvatar from '../components/BuddyAvatar.jsx'
import SpeechBubble from '../components/SpeechBubble.jsx'
import ExplainCard from '../components/lesson/ExplainCard.jsx'
import QuizCard from '../components/lesson/QuizCard.jsx'
import LabelCard from '../components/lesson/LabelCard.jsx'
import ActivityCard from '../components/lesson/ActivityCard.jsx'
import RewardScreen from '../components/lesson/RewardScreen.jsx'
import styles from './LessonPage.module.css'

export default function LessonPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const settings = getSettings()
  const speech = useSpeech(settings)

  const courseId = searchParams.get('course')
  const lessonId = searchParams.get('lesson')
  const course = COURSES.find(c => c.id === courseId)
  const lesson = course?.lessons.find(l => l.id === lessonId)

  const [stepIndex, setStepIndex] = useState(0)
  const [stepComplete, setStepComplete] = useState(false)
  const [phase, setPhase] = useState('steps') // 'steps' | 'reward'
  const [buddyText, setBuddyText] = useState('')
  const [uiStatus, setUiStatus] = useState('idle')
  const stepKeyRef = useRef(0)

  const childAge = settings.childAge || 7

  if (!lesson) {
    navigate('/courses')
    return null
  }

  const steps = lesson.steps
  const step = steps[stepIndex]
  const narration = (childAge <= 6 && step.narrationYoung) ? step.narrationYoung : step.narration

  // Speak narration when step changes
  useEffect(() => {
    stepKeyRef.current += 1
    setStepComplete(false)
    setBuddyText(narration)
    setUiStatus('speaking')
    speech.speak(narration, () => {
      setUiStatus('idle')
      // explain cards auto-complete after narration
      if (step.type === 'explain') setStepComplete(true)
    })
    return () => speech.stopSpeaking()
  }, [stepIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1)
    } else {
      speech.stopSpeaking()
      setPhase('reward')
    }
  }

  const handleBack = () => {
    speech.stopSpeaking()
    if (stepIndex > 0) {
      setStepIndex(i => i - 1)
    } else {
      navigate('/courses')
    }
  }

  if (phase === 'reward') {
    return (
      <RewardScreen
        lesson={lesson}
        course={course}
        childName={settings.childName}
        onBack={() => navigate('/courses')}
      />
    )
  }

  const stepKey = `${stepIndex}-${stepKeyRef.current}`

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.back} onClick={handleBack}>← Back</button>
        <span className={styles.lessonTitle}>{lesson.emoji} {lesson.title}</span>
        <div className={styles.dots}>
          {steps.map((_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i === stepIndex ? styles.dotActive : ''} ${i < stepIndex ? styles.dotDone : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Buddy avatar */}
      <div className={styles.avatarArea}>
        <BuddyAvatar
          status={uiStatus}
          avatarColor={settings.avatarColor}
          type={settings.avatarType || 'bear'}
        />
      </div>

      {/* Narration bubble */}
      <div className={styles.bubbleArea}>
        <SpeechBubble
          buddyText={buddyText}
          userText=""
          status={uiStatus}
          storyMode={false}
          wordIndex={-1}
        />
      </div>

      {/* Step card */}
      <div className={styles.cardArea}>
        {step.type === 'explain' && (
          <ExplainCard key={stepKey} step={step} />
        )}
        {step.type === 'quiz' && (
          <QuizCard key={stepKey} step={step} onComplete={() => setStepComplete(true)} />
        )}
        {step.type === 'label' && (
          <LabelCard key={stepKey} step={step} onComplete={() => setStepComplete(true)} />
        )}
        {step.type === 'activity' && (
          <ActivityCard
            key={stepKey}
            step={step}
            settings={settings}
            speech={speech}
            onComplete={() => setStepComplete(true)}
          />
        )}
      </div>

      {/* Next button */}
      <div className={styles.navArea}>
        <button
          className={styles.nextBtn}
          disabled={!stepComplete}
          onClick={handleNext}
        >
          {stepIndex === steps.length - 1 ? '🌟 Finish!' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
