import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BuddyAvatar from '../components/BuddyAvatar.jsx'
import SpeechBubble from '../components/SpeechBubble.jsx'
import VoiceButton from '../components/VoiceButton.jsx'
import ModeSelector from '../components/ModeSelector.jsx'
import ParentPin from '../components/ParentPin.jsx'
import { useSpeech } from '../hooks/useSpeech.js'
import { useChat } from '../hooks/useChat.js'
import { getSettings } from '../utils/storage.js'
import { supabase } from '../lib/supabase.js'
import { fetchMessageById, markPlayed } from '../services/messageService.js'
import styles from './ChildPage.module.css'

export default function ChildPage() {
  const navigate = useNavigate()
  const [settings] = useState(() => getSettings())
  const [buddyText, setBuddyText] = useState('')
  const [userText, setUserText] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [uiStatus, setUiStatus] = useState('idle') // idle | listening | thinking | speaking

  const speech = useSpeech(settings)
  const chat = useChat(settings)
  const [parentMessage, setParentMessage] = useState(null)
  const parentAudioRef = useRef(null)

  const childName = settings.childName || 'there'

  // Realtime: listen for parent voice messages
  useEffect(() => {
    let channel
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      const userId = session.user.id
      channel = supabase
        .channel('child-messages-' + userId)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'parent_messages',
          filter: `user_id=eq.${userId}`,
        }, async (payload) => {
          // Fetch full row (audio_data too large for realtime payload)
          const msg = await fetchMessageById(payload.new.id).catch(() => null)
          if (msg) setParentMessage(msg)
        })
        .subscribe()
    })
    return () => { channel?.unsubscribe() }
  }, [])

  // Auto-play parent message when it arrives
  useEffect(() => {
    if (!parentMessage) return
    speech.stopSpeaking()
    speech.stopListening()
    const audio = new Audio(`data:${parentMessage.mime_type};base64,${parentMessage.audio_data}`)
    parentAudioRef.current = audio
    const cleanup = () => {
      markPlayed(parentMessage.id).catch(() => {})
      setParentMessage(null)
      parentAudioRef.current = null
    }
    audio.onended = cleanup
    audio.onerror = cleanup
    audio.play().catch(() => {}) // keep overlay visible for manual play if blocked
  }, [parentMessage]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismissParentMessage = () => {
    parentAudioRef.current?.pause()
    parentAudioRef.current = null
    if (parentMessage) markPlayed(parentMessage.id).catch(() => {})
    setParentMessage(null)
  }

  // Boot greeting
  useEffect(() => {
    const greet = `Hi ${childName}! I'm Dubz! Pick something to do, or just tap the mic and talk to me!`
    setBuddyText(greet)
    setUiStatus('speaking')
    speech.speak(greet, () => setUiStatus('idle'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleModeSelect = useCallback((modeId) => {
    const intro = chat.switchMode(modeId)
    setBuddyText(intro)
    setUserText('')
    setUiStatus('speaking')
    speech.speak(intro, () => setUiStatus('idle'))
  }, [chat, speech])

  const handleUserSpeech = useCallback((transcript) => {
    setUserText(transcript)
    setUiStatus('thinking')
    setBuddyText('')

    chat.sendMessage(transcript, chat.mode).then((reply) => {
      setBuddyText(reply)
      setUiStatus('speaking')
      speech.speak(reply, () => {
        setUiStatus('idle')
        if (settings.autoListen) {
          setTimeout(() => handleVoicePress(), 500)
        }
      })
    })
  }, [chat, speech, settings.autoListen])

  const handleVoicePress = useCallback(() => {
    if (uiStatus === 'listening') {
      speech.stopListening()
      setUiStatus('idle')
      return
    }
    if (uiStatus !== 'idle') return
    setUiStatus('listening')
    speech.startListening(handleUserSpeech)
  }, [uiStatus, speech, handleUserSpeech])

  const handlePinSuccess = () => {
    setShowPin(false)
    navigate('/parent')
  }

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <span className={styles.modeLabel}>
          {chat.mode !== 'chat' ? `${chat.mode} mode` : `Hi, ${childName}!`}
        </span>
        <button
          className={styles.settingsBtn}
          onClick={() => setShowPin(true)}
          aria-label="Parent settings"
        >
          ⚙️
        </button>
      </div>

      {/* Avatar */}
      <div className={styles.avatarArea}>
        <BuddyAvatar status={uiStatus} avatarColor={settings.avatarColor} />
      </div>

      {/* Speech bubble */}
      <div className={styles.bubbleArea}>
        <SpeechBubble
          buddyText={buddyText}
          userText={userText}
          status={uiStatus}
        />
      </div>

      {/* Mode selector (shown when in idle or chat mode) */}
      {(uiStatus === 'idle' || uiStatus === 'listening') && (
        <div className={styles.modesArea}>
          <ModeSelector currentMode={chat.mode} onSelect={handleModeSelect} />
        </div>
      )}

      {/* Voice button */}
      <div className={styles.voiceArea}>
        {!speech.supported.stt && (
          <p className={styles.noMic}>
            Voice not supported in this browser. Try Chrome!
          </p>
        )}
        <VoiceButton status={uiStatus} onPress={handleVoicePress} />
      </div>

      {/* PIN gate */}
      {showPin && (
        <ParentPin
          correctPin={settings.parentPin}
          onSuccess={handlePinSuccess}
        />
      )}

      {/* Tap anywhere on overlay to dismiss PIN */}
      {showPin && (
        <button
          className={styles.pinDismiss}
          onClick={() => setShowPin(false)}
          aria-label="Cancel"
        />
      )}

      {/* Parent voice message overlay */}
      {parentMessage && (
        <div className={styles.msgOverlay}>
          <div className={styles.msgBubble}>
            <div className={styles.msgIcon}>🐻</div>
            <p className={styles.msgTitle}>Message from your parent!</p>
            <button
              className={styles.msgPlayBtn}
              onClick={() => parentAudioRef.current?.play()}
            >
              ▶ Play again
            </button>
            <button
              className={styles.msgDismissBtn}
              onClick={dismissParentMessage}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
