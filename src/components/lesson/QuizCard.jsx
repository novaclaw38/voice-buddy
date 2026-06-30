import { useState } from 'react'
import styles from './QuizCard.module.css'

export default function QuizCard({ step, onComplete }) {
  const [selected, setSelected] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const handleSelect = (i) => {
    if (selected !== null) return
    setSelected(i)
    if (i === step.correct) {
      setShowConfetti(true)
      setTimeout(onComplete, 650)
    }
  }

  const getOptionClass = (i) => {
    if (selected === null) return styles.option
    if (i === step.correct) return `${styles.option} ${selected === i ? styles.correct : styles.correctReveal}`
    if (i === selected) return `${styles.option} ${styles.wrong}`
    return styles.option
  }

  return (
    <div className={styles.card}>
      <p className={styles.question}>{step.question}</p>
      <div className={`${styles.options} ${styles.confettiWrap}`}>
        {showConfetti && (
          <div className={styles.confetti} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => <span key={i} />)}
          </div>
        )}
        {step.options.map((opt, i) => (
          <button
            key={i}
            className={getOptionClass(i)}
            onClick={() => handleSelect(i)}
            disabled={selected !== null}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
