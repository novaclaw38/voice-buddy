import { useState } from 'react'
import styles from './ParentPin.module.css'

export default function ParentPin({ correctPin = '1234', onSuccess }) {
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)

  const handleDigit = (d) => {
    const next = input + d
    if (next.length < 4) {
      setInput(next)
    } else {
      const attempt = next
      setInput('')
      if (attempt === correctPin) {
        onSuccess()
      } else {
        setShake(true)
        setTimeout(() => setShake(false), 500)
      }
    }
  }

  const handleDelete = () => setInput((p) => p.slice(0, -1))

  return (
    <div className={styles.overlay}>
      <div className={`${styles.card} ${shake ? styles.shake : ''}`}>
        <div className={styles.lock}>🔒</div>
        <h2 className={styles.title}>Parent Area</h2>
        <p className={styles.sub}>Enter your PIN</p>

        <div className={styles.dots}>
          {[0,1,2,3].map((i) => (
            <div key={i} className={`${styles.dot} ${input.length > i ? styles.filled : ''}`} />
          ))}
        </div>

        <div className={styles.keypad}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => (
            <button
              key={i}
              className={`${styles.key} ${key === '' ? styles.empty : ''}`}
              onClick={() => key === '⌫' ? handleDelete() : key && handleDigit(key)}
              disabled={!key}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
