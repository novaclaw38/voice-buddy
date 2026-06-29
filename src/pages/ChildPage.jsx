import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BuddyAvatar from '../components/BuddyAvatar.jsx'
import SpeechBubble from '../components/SpeechBubble.jsx'
import VoiceButton from '../components/VoiceButton.jsx'
import ModeSelector from '../components/ModeSelector.jsx'
import ParentPin from '../components/ParentPin.jsx'
import AvatarPicker from '../components/AvatarPicker.jsx'
import { useSpeech } from '../hooks/useSpeech.js'
import { useChat } from '../hooks/useChat.js'
import { getSettings, saveSettings } from '../utils/storage.js'
import { supabase } from '../lib/supabase.js'
import { fetchMessageById, markPlayed } from '../services/messageService.js'
import styles from './ChildPage.module.css'

export default function ChildPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(() => getSettings())
  const [buddyText, setBuddyText] = useState('')
  const [userText, setUserText] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [uiStatus, setUiStatus] = useState('idle') // idle | listening | thinking | speaking

  const speech = useSpeech(settings)
  const chat = useChat(settings)
  const [wordIndex, setWordIndex] = useState(-1)
  const rafRef = useRef(null)
  const [parentMessage, setParentMessage] = useState(null)
  const parentAudioRef = useRef(null)

  const childName       = settings.childName       || 'there'
  const buddyName       = settings.buddyName       || 'Buddy'
  const avatarType      = settings.avatarType      || 'bear'
  const wakeWordEnabled = settings.wakeWordEnabled || false
  const wakePhrase      = `hey ${buddyName}`.toLowerCase()

  const handlePickerSave = ({ type, name, color }) => {
    const next = { ...settings, avatarType: type, buddyName: name, avatarColor: color }
    saveSettings(next)
    setSettings(next)
    setShowPicker(false)
  }

  // Camera streaming — listen for parent requests
  const cameraStreamRef = useRef(null)
  const cameraPcRef    = useRef(null)
  const cameraChRef    = useRef(null)
  const [cameraOn, setCameraOn] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user || !mounted) return
      const userId = session.user.id
      const channel = supabase.channel('camera-' + userId)
      cameraChRef.current = channel

      channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (payload.type === 'request') {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            cameraStreamRef.current = stream
            if (mounted) setCameraOn(true)

            const pc = new RTCPeerConnection({
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
              ],
            })
            cameraPcRef.current = pc
            stream.getTracks().forEach((t) => pc.addTrack(t, stream))

            pc.onicecandidate = (e) => {
              if (e.candidate) {
                channel.send({ type: 'broadcast', event: 'signal',
                  payload: { type: 'ice-child', candidate: e.candidate.toJSON() } })
              }
            }

            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            channel.send({ type: 'broadcast', event: 'signal',
              payload: { type: 'offer', sdp: { type: offer.type, sdp: offer.sdp } } })
          } catch (err) {
            console.warn('Camera start error:', err)
          }
        }

        if (payload.type === 'answer' && cameraPcRef.current?.signalingState === 'have-local-offer') {
          await cameraPcRef.current.setRemoteDescription(
            new RTCSessionDescription(payload.sdp)
          )
        }

        if (payload.type === 'ice-parent' && cameraPcRef.current) {
          try { await cameraPcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)) }
          catch (_) {}
        }

        if (payload.type === 'stop') {
          cameraStreamRef.current?.getTracks().forEach((t) => t.stop())
          cameraPcRef.current?.close()
          cameraStreamRef.current = null
          cameraPcRef.current    = null
          if (mounted) setCameraOn(false)
        }
      }).subscribe()
    })

    return () => {
      mounted = false
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop())
      cameraPcRef.current?.close()
      cameraChRef.current?.unsubscribe()
    }
  }, [])

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
    const greet = `Hi ${childName}! I'm ${buddyName}! Pick something to do, or just tap the mic and talk to me!`
    setBuddyText(greet)
    setUiStatus('speaking')
    speech.speak(greet, () => setUiStatus('idle'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Story-mode word-by-word reading tracker
  useEffect(() => {
    if (chat.mode !== 'story' || uiStatus !== 'speaking' || !buddyText) {
      setWordIndex(-1)
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      return
    }
    const words = buddyText.trim().split(/\s+/).filter(Boolean)
    if (!words.length) return
    const tick = () => {
      const audio = speech.audioRef.current
      if (audio && audio.duration) {
        const progress = Math.min(audio.currentTime / audio.duration, 1)
        setWordIndex(Math.min(Math.floor(progress * words.length), words.length - 1))
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      setWordIndex(-1)
    }
  }, [chat.mode, uiStatus, buddyText]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVoicePressRef = useRef(null)

  // Wake word loop — active when idle and wake word is enabled
  useEffect(() => {
    if (!wakeWordEnabled || uiStatus !== 'idle') {
      speech.stopWakeWord()
      return
    }
    speech.startWakeWord(wakePhrase, () => {
      handleVoicePressRef.current?.()
    })
    return () => speech.stopWakeWord()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakeWordEnabled, uiStatus, wakePhrase])

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
    speech.stopWakeWord()
    setUiStatus('listening')
    speech.startListening(handleUserSpeech)
  }, [uiStatus, speech, handleUserSpeech])

  handleVoicePressRef.current = handleVoicePress

  const handlePinSuccess = () => {
    setShowPin(false)
    navigate('/parent')
  }

  const voiceOnly = settings.voiceOnly || false

  const modeColors = {
    chat:     ['#4c1d95', '#1e3a8a'],
    story:    ['#5b21b6', '#312e81'],
    game:     ['#831843', '#1e1b4b'],
    activity: ['#7c2d12', '#1e3a8a'],
    routine:  ['#14532d', '#1e3a8a'],
    quiz:     ['#0c4a6e', '#1e3a8a'],
    jokes:    ['#78350f', '#1e3a8a'],
    sing:     ['#831843', '#4c1d95'],
    feelings: ['#1e3a8a', '#312e81'],
    move:     ['#14532d', '#0c4a6e'],
    learn:    ['#312e81', '#1e3a8a'],
  }
  const [from, to] = modeColors[chat.mode] || modeColors.chat

  if (voiceOnly) {
    return (
      <div className={styles.voicePage}>
        <button
          className={styles.voiceSettingsBtn}
          onClick={() => setShowPin(true)}
          aria-label="Parent settings"
        >⚙️</button>

        <div className={`${styles.voiceOrb} ${styles[`orb_${uiStatus}`]}`} />
        <p className={styles.voiceBuddyText}>{buddyText}</p>
        {userText ? <p className={styles.voiceUserText}>You: {userText}</p> : null}

        <VoiceButton status={uiStatus} onPress={handleVoicePress} buddyName={buddyName} />
        {wakeWordEnabled && uiStatus === 'idle' && (
          <p className={styles.wakeHint}>Say &ldquo;Hey {buddyName}&rdquo;</p>
        )}

        {showPin && (
          <>
            <ParentPin correctPin={settings.parentPin} onSuccess={handlePinSuccess} />
            <button className={styles.pinDismiss} onClick={() => setShowPin(false)} aria-label="Cancel" />
          </>
        )}

        {parentMessage && (
          <div className={styles.msgOverlay}>
            <div className={styles.msgBubble}>
              <div className={styles.msgIcon}>🐻</div>
              <p className={styles.msgTitle}>Message from your parent!</p>
              <button className={styles.msgPlayBtn} onClick={() => parentAudioRef.current?.play()}>▶ Play again</button>
              <button className={styles.msgDismissBtn} onClick={dismissParentMessage}>Got it!</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={styles.page}
      style={{ background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)` }}
    >
      {/* Floating background decorations */}
      <div className={styles.deco} aria-hidden="true">
        <span className={styles.d1}>✦</span>
        <span className={styles.d2}>★</span>
        <span className={styles.d3}>✧</span>
        <span className={styles.d4}>☆</span>
        <span className={styles.d5}>✦</span>
        <span className={styles.d6}>★</span>
        <span className={styles.d7}>✧</span>
        <span className={styles.d8}>✦</span>
        <span className={styles.d9}>☆</span>
        <span className={styles.d10}>★</span>
      </div>

      {/* Top bar */}
      <div className={styles.topBar}>
        <span className={styles.modeLabel}>
          {chat.mode !== 'chat' ? `${chat.mode} mode` : `Hi, ${childName}!`}
        </span>
        {cameraOn && <span className={styles.cameraIndicator} title="Camera on">📹</span>}
        <button
          className={styles.customizeBtn}
          onClick={() => setShowPicker(true)}
          aria-label="Customise buddy"
        >
          🎨
        </button>
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
        <BuddyAvatar status={uiStatus} avatarColor={settings.avatarColor} type={avatarType} />
        <p className={styles.buddyNameTag}>{buddyName}</p>
      </div>

      {/* Speech bubble */}
      <div className={styles.bubbleArea}>
        <SpeechBubble
          buddyText={buddyText}
          userText={userText}
          status={uiStatus}
          storyMode={chat.mode === 'story'}
          wordIndex={wordIndex}
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
        <VoiceButton status={uiStatus} onPress={handleVoicePress} buddyName={buddyName} />
        {wakeWordEnabled && uiStatus === 'idle' && (
          <p className={styles.wakeHint}>Say &ldquo;Hey {buddyName}&rdquo;</p>
        )}
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

      {/* Avatar + name picker */}
      {showPicker && (
        <AvatarPicker
          currentType={avatarType}
          currentName={buddyName}
          currentColor={settings.avatarColor}
          onSave={handlePickerSave}
          onClose={() => setShowPicker(false)}
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
