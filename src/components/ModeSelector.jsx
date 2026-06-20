import styles from './ModeSelector.module.css'

const MODES = [
  { id: 'story',    emoji: '📚', label: 'Story',    bg: 'linear-gradient(135deg,#7c3aed,#4f46e5)', glow: '#7c3aed' },
  { id: 'game',     emoji: '🎮', label: 'Play',     bg: 'linear-gradient(135deg,#db2777,#be185d)', glow: '#db2777' },
  { id: 'activity', emoji: '🎨', label: 'Activity', bg: 'linear-gradient(135deg,#ea580c,#c2410c)', glow: '#ea580c' },
  { id: 'routine',  emoji: '⭐', label: 'Routine',  bg: 'linear-gradient(135deg,#16a34a,#15803d)', glow: '#16a34a' },
]

export default function ModeSelector({ currentMode, onSelect }) {
  return (
    <div className={styles.grid}>
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`${styles.tile} ${currentMode === m.id ? styles.active : ''}`}
          style={{ background: m.bg, '--glow': m.glow }}
          onClick={() => onSelect(m.id)}
          aria-label={m.label}
        >
          <span className={styles.emoji}>{m.emoji}</span>
          <span className={styles.label}>{m.label}</span>
        </button>
      ))}
    </div>
  )
}
