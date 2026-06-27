import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PrintSheet from '../components/PrintSheet.jsx'
import { getSettings, saveSettings } from '../utils/storage.js'
import { testConnection } from '../services/openrouter.js'
import { fetchHistory, deleteHistory } from '../services/historyService.js'
import { sendVoiceMessage, fetchMessages } from '../services/messageService.js'
import { supabase } from '../lib/supabase.js'
import styles from './ParentPage.module.css'

const TABS = ['Settings', 'Routines', 'Messages', 'History', 'Print']

export default function ParentPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('Settings')
  const [settings, setSettings] = useState(() => getSettings())
  const [testStatus, setTestStatus] = useState(null)
  const [testError, setTestError] = useState('')
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [printData, setPrintData] = useState(null)
  const [printType, setPrintType] = useState('story')
  const [voices, setVoices] = useState([])
  const [recStatus, setRecStatus] = useState('idle') // idle | recording | sending | sent | error
  const [sentMessages, setSentMessages] = useState([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis?.getVoices() || []
      if (v.length) setVoices(v)
    }
    load()
    window.speechSynthesis?.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load)
  }, [])

  // Load sent messages when Messages tab opens
  useEffect(() => {
    if (tab !== 'Messages') return
    setMsgsLoading(true)
    fetchMessages().then(setSentMessages).catch(console.error).finally(() => setMsgsLoading(false))
  }, [tab])

  // Load history from Supabase when History tab opens
  useEffect(() => {
    if (tab !== 'History') return
    setHistoryLoading(true)
    fetchHistory().then((rows) => {
      setHistory(rows.map((r) => ({
        ts: r.ts,
        mode: r.mode,
        userText: r.user_text,
        buddyText: r.buddy_text,
      })))
    }).catch(console.error).finally(() => setHistoryLoading(false))
  }, [tab])

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      saveSettings(next)
      return next
    })
  }

  const handleTestConnection = async () => {
    setTestStatus('testing')
    setTestError('')
    try {
      await testConnection()
      setTestStatus('ok')
      setTimeout(() => setTestStatus(null), 3000)
    } catch (err) {
      setTestError(err.message || 'Unknown error')
      setTestStatus('fail')
      setTimeout(() => setTestStatus(null), 6000)
    }
  }

  const startRecording = async () => {
    if (recStatus === 'recording' || recStatus === 'sending') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        if (blob.size < 500) { setRecStatus('idle'); return }
        setRecStatus('sending')
        try {
          await sendVoiceMessage(blob)
          setRecStatus('sent')
          fetchMessages().then(setSentMessages).catch(console.error)
          setTimeout(() => setRecStatus('idle'), 2000)
        } catch {
          setRecStatus('error')
          setTimeout(() => setRecStatus('idle'), 2000)
        }
      }
      mediaRecorderRef.current = mr
      mr.start()
      setRecStatus('recording')
    } catch {
      setRecStatus('error')
      setTimeout(() => setRecStatus('idle'), 2000)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
  }

  const handleClearHistory = async () => {
    if (window.confirm('Clear all chat history? This cannot be undone.')) {
      await deleteHistory()
      setHistory([])
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handlePrint = () => {
    if (!printData) return
    window.print()
  }

  const handleSelectPrint = (entry) => {
    setPrintData(entry)
    setTab('Print')
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          ← Back to Dubz
        </button>
        <h1 className={styles.title}>Parent Dashboard</h1>
        <button className={styles.btnDanger} style={{ flexShrink: 0 }} onClick={handleLogout}>
          Log out
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.content}>

        {/* ---- SETTINGS ---- */}
        {tab === 'Settings' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Child Settings</h2>

            <div className={styles.field}>
              <label className={styles.label}>Child's Name</label>
              <input
                className={styles.input}
                value={settings.childName}
                onChange={(e) => updateSetting('childName', e.target.value)}
                placeholder="e.g. Byron"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Avatar Color</label>
              <div className={styles.colorRow}>
                {['#7c3aed','#db2777','#ea580c','#16a34a','#2563eb','#0891b2'].map((c) => (
                  <button
                    key={c}
                    className={`${styles.colorSwatch} ${settings.avatarColor === c ? styles.selectedColor : ''}`}
                    style={{ background: c }}
                    onClick={() => updateSetting('avatarColor', c)}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Parent PIN</label>
              <input
                className={styles.input}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={settings.parentPin}
                onChange={(e) => updateSetting('parentPin', e.target.value.replace(/\D/g, '').slice(0,4))}
                placeholder="4-digit PIN"
              />
              <p className={styles.hint}>Default: 1234</p>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Speech Rate</label>
              <input
                type="range"
                className={styles.slider}
                min="0.6" max="1.2" step="0.05"
                value={settings.speechRate}
                onChange={(e) => updateSetting('speechRate', parseFloat(e.target.value))}
              />
              <p className={styles.hint}>{settings.speechRate.toFixed(2)}× (lower = slower)</p>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Auto-listen after Dubz speaks</label>
              <div className={styles.toggle}>
                <input
                  type="checkbox"
                  id="autoListen"
                  checked={settings.autoListen}
                  onChange={(e) => updateSetting('autoListen', e.target.checked)}
                />
                <label htmlFor="autoListen" className={styles.toggleLabel}>
                  {settings.autoListen ? 'On (hands-free)' : 'Off (tap to talk)'}
                </label>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Dubz's Voice</label>
              <div className={styles.toggle}>
                <input
                  type="checkbox"
                  id="robotVoice"
                  checked={settings.robotVoice || false}
                  onChange={(e) => updateSetting('robotVoice', e.target.checked)}
                />
                <label htmlFor="robotVoice" className={styles.toggleLabel}>
                  {settings.robotVoice ? '🤖 Robot (deep male voice)' : '😊 Friendly (default)'}
                </label>
              </div>
              <p className={styles.hint}>Robot mode uses a deep, low-pitch male voice. Exact sound depends on your device.</p>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Voice</label>
              <select
                className={styles.input}
                value={settings.voiceName || ''}
                onChange={(e) => updateSetting('voiceName', e.target.value)}
              >
                <option value="">Auto (best match)</option>
                {voices
                  .filter((v) => v.lang.startsWith('en'))
                  .map((v) => (
                    <option key={v.name} value={v.name}>{v.name}</option>
                  ))}
                {voices.filter((v) => !v.lang.startsWith('en')).length > 0 && (
                  <option disabled>── Other languages ──</option>
                )}
                {voices
                  .filter((v) => !v.lang.startsWith('en'))
                  .map((v) => (
                    <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                  ))}
              </select>
              <p className={styles.hint}>
                Google voices (e.g. "Google US English") sound best. On Android: Settings → Accessibility → Text-to-speech → install Google TTS.
              </p>
            </div>

            <h2 className={styles.sectionTitle} style={{ marginTop: 24 }}>AI Connection</h2>

            <div className={styles.field}>
              <p className={styles.hint} style={{ marginBottom: 10 }}>
                Dubz uses Groq (free). The API key is set by the app — no key entry needed here.
                To use your own key: add <strong>GROQ_API_KEY</strong> to your Vercel project's
                Environment Variables at <strong>vercel.com → Project → Settings → Environment Variables</strong>.
              </p>
              <div className={styles.btnRow}>
                <button className={styles.btnTest} onClick={handleTestConnection} disabled={testStatus === 'testing'}>
                  {testStatus === 'testing' ? 'Testing...' : testStatus === 'ok' ? '✓ Connected!' : testStatus === 'fail' ? '✗ Failed' : 'Test Connection'}
                </button>
              </div>
              {testStatus === 'fail' && testError && (
                <p className={styles.testError}>{testError}</p>
              )}
            </div>
          </div>
        )}

        {/* ---- ROUTINES ---- */}
        {tab === 'Routines' && (
          <div className={styles.section}>
            <RoutineEditor
              label="Morning Routine"
              emoji="☀️"
              steps={settings.morningRoutine}
              onChange={(steps) => updateSetting('morningRoutine', steps)}
            />
            <RoutineEditor
              label="Bedtime Routine"
              emoji="🌙"
              steps={settings.bedtimeRoutine}
              onChange={(steps) => updateSetting('bedtimeRoutine', steps)}
            />
          </div>
        )}

        {/* ---- MESSAGES ---- */}
        {tab === 'Messages' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Send Voice Message to Dubz</h2>
            <p className={styles.hint} style={{ marginBottom: 20 }}>
              Hold the button and speak. Release when done — Dubz will hear it right away!
            </p>

            <div className={styles.recordArea}>
              <button
                className={`${styles.recordBtn} ${recStatus === 'recording' ? styles.recording : ''}`}
                onPointerDown={startRecording}
                onPointerUp={stopRecording}
                onPointerLeave={stopRecording}
                disabled={recStatus === 'sending'}
              >
                {recStatus === 'sent' ? '✓' : recStatus === 'error' ? '✗' : '🎤'}
              </button>
              <p className={styles.recLabel}>
                {recStatus === 'recording' ? 'Recording... release to send'
                  : recStatus === 'sending' ? 'Sending to Dubz...'
                  : recStatus === 'sent'    ? 'Message sent!'
                  : recStatus === 'error'   ? 'Something went wrong, try again'
                  : 'Hold to record'}
              </p>
            </div>

            <h2 className={styles.sectionTitle} style={{ marginTop: 24 }}>Sent Messages</h2>
            {msgsLoading ? (
              <p className={styles.empty}>Loading...</p>
            ) : sentMessages.length === 0 ? (
              <p className={styles.empty}>No messages sent yet.</p>
            ) : (
              <div className={styles.historyList}>
                {sentMessages.map((msg) => (
                  <div key={msg.id} className={styles.historyEntry}>
                    <div className={styles.entryMeta}>
                      <span className={`${styles.modeBadge} ${msg.played ? styles.chat : styles.story}`}>
                        {msg.played ? 'played' : 'unplayed'}
                      </span>
                      <span className={styles.entryDate}>
                        {new Date(msg.created_at).toLocaleDateString()}{' '}
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- HISTORY ---- */}
        {tab === 'History' && (
          <div className={styles.section}>
            <div className={styles.historyHeader}>
              <h2 className={styles.sectionTitle}>Chat History</h2>
              {history.length > 0 && (
                <button className={styles.btnDanger} onClick={handleClearHistory}>
                  Clear All
                </button>
              )}
            </div>
            {historyLoading ? (
              <p className={styles.empty}>Loading history...</p>
            ) : history.length === 0 ? (
              <p className={styles.empty}>No conversations yet. Go talk to Dubz!</p>
            ) : (
              <div className={styles.historyList}>
                {history.map((entry, i) => (
                  <div key={i} className={styles.historyEntry}>
                    <div className={styles.entryMeta}>
                      <span className={`${styles.modeBadge} ${styles[entry.mode]}`}>
                        {entry.mode}
                      </span>
                      <span className={styles.entryDate}>
                        {new Date(entry.ts).toLocaleDateString()} {new Date(entry.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                      </span>
                    </div>
                    <p className={styles.entryUser}><strong>Child:</strong> {entry.userText}</p>
                    <p className={styles.entryBuddy}><strong>Dubz:</strong> {entry.buddyText}</p>
                    <button
                      className={styles.btnSmall}
                      onClick={() => handleSelectPrint(entry)}
                    >
                      Print this
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- PRINT ---- */}
        {tab === 'Print' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Print</h2>

            <div className={styles.field}>
              <label className={styles.label}>Print Type</label>
              <div className={styles.printTypes}>
                {['story','activity','games'].map((t) => (
                  <button
                    key={t}
                    className={`${styles.printTypeBtn} ${printType === t ? styles.activePrintType : ''}`}
                    onClick={() => setPrintType(t)}
                  >
                    {t === 'story' ? '📖 Story' : t === 'activity' ? '🎨 Activity' : '🎮 Games'}
                  </button>
                ))}
              </div>
            </div>

            {printData && (
              <div className={styles.field}>
                <label className={styles.label}>Selected content</label>
                <div className={styles.printPreviewMeta}>
                  <span className={`${styles.modeBadge} ${styles[printData.mode]}`}>{printData.mode}</span>
                  <span>{printData.userText?.slice(0, 60)}...</span>
                </div>
              </div>
            )}

            <div className={styles.btnRow}>
              <button
                className={styles.btnPrint}
                onClick={handlePrint}
                disabled={!printData}
              >
                🖨️ Print Now
              </button>
              <button
                className={styles.btnSave}
                onClick={() => setPrintData({
                  mode: printType,
                  userText: 'Sample content',
                  buddyText: `Here is a fun ${printType} for ${settings.childName}! Enjoy it together.`,
                  ts: Date.now(),
                })}
              >
                Use Sample
              </button>
            </div>

            {!printData && (
              <p className={styles.hint} style={{ marginTop: 12 }}>
                Select an item from History to print, or tap "Use Sample" to try a blank template.
              </p>
            )}

            {/* Hidden print area — shown only during window.print() */}
            {printData && (
              <div id="print-portal" className={styles.printPortal}>
                <PrintSheet
                  type={printType}
                  data={printData}
                  childName={settings.childName}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- Routine Editor ---- */
function RoutineEditor({ label, emoji, steps, onChange }) {
  const [newStep, setNewStep] = useState('')

  const move = (i, dir) => {
    const arr = [...steps]
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    onChange(arr)
  }

  const remove = (i) => onChange(steps.filter((_, idx) => idx !== i))

  const add = () => {
    if (!newStep.trim()) return
    onChange([...steps, newStep.trim()])
    setNewStep('')
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <h3 className={styles.routineTitle}>{emoji} {label}</h3>
      <div className={styles.routineList}>
        {steps.map((step, i) => (
          <div key={i} className={styles.routineItem}>
            <span className={styles.routineNum}>{i + 1}</span>
            <span className={styles.routineText}>{step}</span>
            <div className={styles.routineActions}>
              <button onClick={() => move(i, -1)} disabled={i === 0} className={styles.moveBtn}>▲</button>
              <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} className={styles.moveBtn}>▼</button>
              <button onClick={() => remove(i)} className={styles.removeBtn}>✕</button>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.addRow}>
        <input
          className={styles.input}
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          placeholder="Add a step..."
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className={styles.btnSave} onClick={add}>Add</button>
      </div>
    </div>
  )
}
