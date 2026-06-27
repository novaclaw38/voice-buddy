import styles from './BuddyAvatar.module.css'

const STATE_COLORS = {
  idle:      { face: '#7c3aed', glow: '#a855f7' },
  listening: { face: '#16a34a', glow: '#4ade80' },
  speaking:  { face: '#d97706', glow: '#fcd34d' },
  thinking:  { face: '#2563eb', glow: '#60a5fa' },
}

export default function BuddyAvatar({ status = 'idle', avatarColor }) {
  const colors = STATE_COLORS[status] || STATE_COLORS.idle
  const faceColor = avatarColor && status === 'idle' ? avatarColor : colors.face
  const isListening = status === 'listening'
  const isSpeaking  = status === 'speaking'
  const isThinking  = status === 'thinking'

  return (
    <div className={`${styles.container} ${styles[status]}`}>
      <div className={styles.glow} style={{ background: colors.glow }} />

      <svg viewBox="0 0 100 100" className={styles.face} aria-label={`Buddy is ${status}`}>

        {/* Ears */}
        <circle cx="22" cy="24" r="18" fill={faceColor} />
        <circle cx="78" cy="24" r="18" fill={faceColor} />
        {/* Inner ear */}
        <circle cx="22" cy="24" r="11" fill="rgba(255,190,190,0.45)" />
        <circle cx="78" cy="24" r="11" fill="rgba(255,190,190,0.45)" />
        {/* Ear wiggle dots when listening */}
        {isListening && (
          <>
            <circle cx="22" cy="24" r="5" fill="rgba(255,255,255,0.35)" className={styles.earPulse} />
            <circle cx="78" cy="24" r="5" fill="rgba(255,255,255,0.35)" className={styles.earPulse} />
          </>
        )}

        {/* Head */}
        <circle cx="50" cy="58" r="39" fill={faceColor} />
        {/* Head sheen */}
        <circle cx="50" cy="58" r="37" fill="rgba(255,255,255,0.06)" />

        {/* Muzzle */}
        <ellipse cx="50" cy="71" rx="17" ry="12" fill="rgba(255,255,255,0.18)" />

        {/* Raised eyebrows when listening */}
        {isListening && (
          <>
            <path d="M 27 40 Q 35 35 42 40" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 58 40 Q 65 35 73 40" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* Eyes */}
        <circle cx="35" cy="50" r={isListening ? 10 : 9} fill="white" />
        <circle cx="37" cy="50" r="5" fill="#1e1b4b" />
        <circle cx="38" cy="48" r="2" fill="white" />

        <circle cx="65" cy="50" r={isListening ? 10 : 9} fill="white" />
        <circle cx="63" cy="50" r="5" fill="#1e1b4b" />
        <circle cx="64" cy="48" r="2" fill="white" />

        {/* Nose */}
        <ellipse cx="50" cy="63" rx="5.5" ry="4" fill="rgba(0,0,0,0.35)" />

        {/* Mouth */}
        {isSpeaking ? (
          <ellipse cx="50" cy="73" rx="9" ry="6" fill="rgba(0,0,0,0.38)" className={styles.mouthTalk} />
        ) : isThinking ? (
          <path d="M 40 73 Q 50 73 60 73" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M 38 72 Q 50 81 62 72" stroke="rgba(255,255,255,0.7)" strokeWidth="3" fill="none" strokeLinecap="round" />
        )}

        {/* Cheek blush */}
        <circle cx="24" cy="65" r="9" fill="rgba(255,140,140,0.22)" />
        <circle cx="76" cy="65" r="9" fill="rgba(255,140,140,0.22)" />

        {/* Speaking sparkles */}
        {isSpeaking && (
          <g>
            <polygon className={styles.spark1} points="8,18 9.5,22 13,22 10.5,24.5 11.5,28 8,26 4.5,28 5.5,24.5 3,22 6.5,22" fill="#fcd34d" />
            <polygon className={styles.spark2} points="92,15 93,18 96,18 94,20 94.5,23 92,21.5 89.5,23 90,20 88,18 91,18" fill="#fcd34d" />
            <polygon className={styles.spark3} points="5,75 6.5,79 10,79 7.5,81 8.5,85 5,82.5 1.5,85 2.5,81 0,79 3.5,79" fill="#60a5fa" />
            <polygon className={styles.spark4} points="95,72 96.5,76 100,76 97.5,78 98.5,82 95,79.5 91.5,82 92.5,78 90,76 93.5,76" fill="#60a5fa" />
            <circle className={styles.spark5} cx="20" cy="10" r="3" fill="#f9a8d4" />
            <circle className={styles.spark6} cx="80" cy="8"  r="2" fill="#86efac" />
            <circle className={styles.spark7} cx="50" cy="3"  r="2.5" fill="#fcd34d" />
          </g>
        )}

        {/* Thinking dots */}
        {isThinking && (
          <g>
            <circle className={styles.thinkDot1} cx="38" cy="82" r="3.5" fill="rgba(255,255,255,0.7)" />
            <circle className={styles.thinkDot2} cx="50" cy="82" r="3.5" fill="rgba(255,255,255,0.7)" />
            <circle className={styles.thinkDot3} cx="62" cy="82" r="3.5" fill="rgba(255,255,255,0.7)" />
          </g>
        )}

      </svg>
    </div>
  )
}
