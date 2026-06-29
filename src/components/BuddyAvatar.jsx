import styles from './BuddyAvatar.module.css'

const STATE_COLORS = {
  idle:      { face: '#7c3aed', glow: '#a855f7' },
  listening: { face: '#16a34a', glow: '#4ade80' },
  speaking:  { face: '#d97706', glow: '#fcd34d' },
  thinking:  { face: '#2563eb', glow: '#60a5fa' },
}

/* ── Per-type head/ear renderers ─────────────────────────────────────── */

function BearHead({ c, isListening }) {
  return (
    <>
      <circle cx="22" cy="24" r="18" fill={c} />
      <circle cx="78" cy="24" r="18" fill={c} />
      <circle cx="22" cy="24" r="11" fill="rgba(255,190,190,0.45)" />
      <circle cx="78" cy="24" r="11" fill="rgba(255,190,190,0.45)" />
      {isListening && (
        <>
          <circle cx="22" cy="24" r="5" fill="rgba(255,255,255,0.35)" className={styles.earPulse} />
          <circle cx="78" cy="24" r="5" fill="rgba(255,255,255,0.35)" className={styles.earPulse} />
        </>
      )}
      <circle cx="50" cy="58" r="39" fill={c} />
    </>
  )
}

function CatHead({ c, isListening }) {
  return (
    <>
      <polygon points="12,42 26,6 38,40"   fill={c} />
      <polygon points="16,40 26,12 35,39"  fill="rgba(255,190,190,0.5)" />
      <polygon points="62,40 74,6 88,42"   fill={c} />
      <polygon points="65,39 74,12 84,40"  fill="rgba(255,190,190,0.5)" />
      {isListening && (
        <>
          <polygon className={styles.earTwitch} points="12,42 26,6 38,40"  fill="rgba(255,255,255,0.15)" />
          <polygon className={styles.earTwitch} points="62,40 74,6 88,42"  fill="rgba(255,255,255,0.15)" />
        </>
      )}
      <circle cx="50" cy="58" r="39" fill={c} />
      {/* Whiskers */}
      <line x1="18" y1="64" x2="42" y2="67" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="69" x2="42" y2="69" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="74" x2="42" y2="71" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="58" y1="67" x2="82" y2="64" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="58" y1="69" x2="82" y2="69" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="58" y1="71" x2="82" y2="74" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
    </>
  )
}

function DogHead({ c, isListening }) {
  return (
    <>
      <ellipse cx="12" cy="62" rx="13" ry="24" fill={c} transform="rotate(-12 12 62)" className={isListening ? styles.dogEarWag : ''} />
      <ellipse cx="88" cy="62" rx="13" ry="24" fill={c} transform="rotate(12 88 62)"  className={isListening ? styles.dogEarWagR : ''} />
      <circle cx="50" cy="57" r="38" fill={c} />
    </>
  )
}

function BunnyHead({ c, isListening }) {
  return (
    <>
      <ellipse cx="32" cy="15" rx="11" ry="26" fill={c} className={isListening ? styles.bunnyEarL : ''} />
      <ellipse cx="32" cy="15" rx="6.5" ry="20" fill="rgba(255,190,190,0.5)" className={isListening ? styles.bunnyEarL : ''} />
      <ellipse cx="68" cy="15" rx="11" ry="26" fill={c} className={isListening ? styles.bunnyEarR : ''} />
      <ellipse cx="68" cy="15" rx="6.5" ry="20" fill="rgba(255,190,190,0.5)" className={isListening ? styles.bunnyEarR : ''} />
      <circle cx="50" cy="60" r="37" fill={c} />
    </>
  )
}

function AlienHead({ c, isListening }) {
  return (
    <>
      <line x1="50" y1="20" x2="50" y2="7" stroke={c} strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="5" r="5" fill="#86efac" className={isListening ? styles.antennaPulse : ''} />
      <ellipse cx="50" cy="57" rx="40" ry="44" fill={c} />
    </>
  )
}

function DinoHead({ c, isListening }) {
  return (
    <>
      <polygon points="34,28 39,9 44,28"  fill={c} />
      <polygon points="45,22 50,4 55,22"  fill={c} className={isListening ? styles.spikeGlow : ''} />
      <polygon points="56,28 61,9 66,28"  fill={c} />
      <circle cx="50" cy="58" r="39" fill={c} />
    </>
  )
}

const HEADS = { bear: BearHead, cat: CatHead, dog: DogHead, bunny: BunnyHead, alien: AlienHead, dino: DinoHead }

/* ── Main component ──────────────────────────────────────────────────── */

export default function BuddyAvatar({ status = 'idle', avatarColor, type = 'bear', size = 170 }) {
  const colors    = STATE_COLORS[status] || STATE_COLORS.idle
  const faceColor = avatarColor && status === 'idle' ? avatarColor : colors.face
  const isListening = status === 'listening'
  const isSpeaking  = status === 'speaking'
  const isThinking  = status === 'thinking'
  const isAlien     = type === 'alien'

  const Head = HEADS[type] || HEADS.bear

  // Alien eyes are larger and spaced for the wide oval head
  const eyeCy = isAlien ? 47 : 50
  const eyeR  = isAlien ? 12 : (isListening ? 10 : 9)
  const pupilR = isAlien ? 7  : 5

  return (
    <div
      className={`${styles.container} ${styles[status]}`}
      style={{ width: size + 20, height: size + 20 }}
    >
      <div className={styles.glow} style={{ background: colors.glow, width: size, height: size }} />

      <svg
        viewBox="0 0 100 100"
        className={styles.face}
        style={{ width: size, height: size }}
        aria-label={`Buddy is ${status}`}
      >
        <Head c={faceColor} isListening={isListening} />

        {/* Head sheen */}
        <ellipse cx="50" cy="46" rx="28" ry="18" fill="rgba(255,255,255,0.06)" />

        {/* Muzzle — hidden for cat (whiskers serve same purpose) */}
        {type !== 'cat' && (
          <ellipse cx="50" cy="71" rx="17" ry="12" fill="rgba(255,255,255,0.18)" />
        )}

        {/* Raised eyebrows when listening */}
        {isListening && (
          <>
            <path d="M 27 40 Q 35 35 42 40" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <path d="M 58 40 Q 65 35 73 40" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          </>
        )}

        {/* Eyes */}
        <circle cx="35" cy={eyeCy} r={eyeR}  fill="white" />
        <circle cx="37" cy={eyeCy} r={pupilR} fill="#1e1b4b" />
        <circle cx="38" cy={eyeCy - 2} r="2" fill="white" />

        <circle cx="65" cy={eyeCy} r={eyeR}  fill="white" />
        <circle cx="63" cy={eyeCy} r={pupilR} fill="#1e1b4b" />
        <circle cx="64" cy={eyeCy - 2} r="2" fill="white" />

        {/* Nose */}
        <ellipse cx="50" cy="63" rx="5.5" ry="4" fill="rgba(0,0,0,0.35)" />

        {/* Mouth */}
        {isSpeaking ? (
          <ellipse cx="50" cy="73" rx="9" ry="6" fill="rgba(0,0,0,0.38)" className={styles.mouthTalk} />
        ) : isThinking ? (
          <path d="M 40 73 Q 50 73 60 73" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        ) : (
          <path d="M 38 72 Q 50 81 62 72" stroke="rgba(255,255,255,0.7)" strokeWidth="3" fill="none" strokeLinecap="round"/>
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
