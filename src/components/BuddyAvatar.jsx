import { useEffect, useRef } from 'react'
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

  return (
    <div className={`${styles.container} ${styles[status]}`}>
      {/* Glow halo */}
      <div className={styles.glow} style={{ background: colors.glow }} />

      <svg
        viewBox="0 0 100 100"
        className={styles.face}
        aria-label={`Buddy is ${status}`}
      >
        {/* Head */}
        <circle cx="50" cy="50" r="45" fill={faceColor} />
        <circle cx="50" cy="50" r="42" fill={faceColor} stroke="rgba(255,255,255,0.15)" strokeWidth="2" />

        {/* Ears */}
        <circle cx="8" cy="50" r="8" fill={faceColor} />
        <circle cx="92" cy="50" r="8" fill={faceColor} />
        {status === 'listening' && (
          <>
            <circle cx="8" cy="50" r="4" fill="rgba(255,255,255,0.4)" />
            <circle cx="92" cy="50" r="4" fill="rgba(255,255,255,0.4)" />
          </>
        )}

        {/* Eyes */}
        <g className={styles.eyes}>
          {/* Left eye */}
          <ellipse cx="33" cy="40" rx="9" ry={status === 'speaking' ? 9 : 9} fill="white" />
          <circle cx="35" cy="40" r="5" fill="#1e1b4b" />
          <circle cx="37" cy="38" r="2" fill="white" />

          {/* Right eye */}
          <ellipse cx="67" cy="40" rx="9" ry={status === 'speaking' ? 9 : 9} fill="white" />
          <circle cx="65" cy="40" r="5" fill="#1e1b4b" />
          <circle cx="67" cy="38" r="2" fill="white" />
        </g>

        {/* Eyebrows */}
        {status === 'listening' && (
          <>
            <path d="M 24 28 Q 33 24 42 28" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 58 28 Q 67 24 76 28" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* Cheek blush */}
        <circle cx="22" cy="58" r="8" fill="rgba(255,255,255,0.15)" />
        <circle cx="78" cy="58" r="8" fill="rgba(255,255,255,0.15)" />

        {/* Mouth */}
        {status === 'speaking' ? (
          <ellipse cx="50" cy="66" rx="12" ry={8} fill="rgba(0,0,0,0.4)" className={styles.mouthTalk} />
        ) : status === 'thinking' ? (
          <path d="M 38 65 Q 50 65 62 65" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M 35 63 Q 50 74 65 63" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        )}

        {/* Thinking dots */}
        {status === 'thinking' && (
          <g className={styles.thinkingDots}>
            <circle cx="42" cy="80" r="3" fill="rgba(255,255,255,0.6)" />
            <circle cx="50" cy="80" r="3" fill="rgba(255,255,255,0.6)" />
            <circle cx="58" cy="80" r="3" fill="rgba(255,255,255,0.6)" />
          </g>
        )}
      </svg>

      {/* Antenna */}
      <div className={styles.antenna}>
        <div className={styles.antennaBall} style={{ background: colors.glow }} />
      </div>
    </div>
  )
}
