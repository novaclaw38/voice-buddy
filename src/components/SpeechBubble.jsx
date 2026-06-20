import styles from './SpeechBubble.module.css'

export default function SpeechBubble({ buddyText, userText, status }) {
  const showThinking = status === 'thinking'

  return (
    <div className={styles.wrapper}>
      {/* User transcript */}
      {userText && (
        <div className={styles.userBubble}>
          <span className={styles.userLabel}>You said:</span>
          <span className={styles.userText}>{userText}</span>
        </div>
      )}

      {/* Buddy response */}
      <div className={`${styles.buddyBubble} ${buddyText ? styles.visible : ''}`}>
        {showThinking ? (
          <div className={styles.dots}>
            <span /><span /><span />
          </div>
        ) : (
          <p className={styles.buddyText}>{buddyText || ' '}</p>
        )}
        {/* Bubble tail */}
        <div className={styles.tail} />
      </div>
    </div>
  )
}
