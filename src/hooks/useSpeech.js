import { useState, useEffect, useRef, useCallback } from 'react'

const SpeechRec =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export function useSpeech(settings) {
  const [status, setStatus] = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [voices, setVoices] = useState([])
  const recRef    = useRef(null)
  const synthRef  = useRef(window.speechSynthesis)
  const audioRef  = useRef(null)         // Google TTS <Audio>
  const onResultRef = useRef(null)
  const listeningRef = useRef(false)

  const supported = { stt: !!SpeechRec, tts: true }

  // Load browser voices (used only as fallback)
  useEffect(() => {
    const load = () => {
      const v = synthRef.current?.getVoices() || []
      if (v.length) setVoices(v)
    }
    load()
    synthRef.current?.addEventListener('voiceschanged', load)
    return () => synthRef.current?.removeEventListener('voiceschanged', load)
  }, [])

  // ── Fallback: browser Web Speech API ──────────────────────────────────────
  const getFallbackVoice = useCallback(() => {
    if (!voices.length) return null
    if (settings?.voiceName) {
      const match = voices.find((v) => v.name === settings.voiceName)
      if (match) return match
    }
    if (settings?.robotVoice) {
      return (
        voices.find((v) => v.lang.startsWith('en') && /male|man/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0]
      )
    }
    return (
      voices.find((v) => v.lang.startsWith('en') && /female|woman/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0]
    )
  }, [voices, settings?.voiceName, settings?.robotVoice])

  const fallbackSpeak = useCallback((text, onDone) => {
    if (!synthRef.current || !text) { onDone?.(); return }
    synthRef.current.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.voice  = getFallbackVoice()
    utter.rate   = settings?.robotVoice ? 0.85 : (settings?.speechRate  ?? 0.9)
    utter.pitch  = settings?.robotVoice ? 0.3  : (settings?.speechPitch ?? 1.1)
    utter.volume = 1
    utter.onend  = () => { setStatus('idle'); onDone?.() }
    utter.onerror = () => { setStatus('idle'); onDone?.() }
    setTimeout(() => synthRef.current?.speak(utter), 0)
  }, [getFallbackVoice, settings?.robotVoice, settings?.speechRate, settings?.speechPitch])

  // ── Stop helpers ──────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    listeningRef.current = false
    if (recRef.current) { recRef.current.stop(); recRef.current = null }
  }, [])

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    synthRef.current?.cancel()
    setStatus('idle')
  }, [])

  // ── Google TTS speak ──────────────────────────────────────────────────────
  const speak = useCallback((text, onDone) => {
    if (!text) { onDone?.(); return }
    stopListening()
    stopSpeaking()
    setStatus('speaking')

    const rate   = settings?.robotVoice ? 0.8  : (settings?.speechRate  ?? 0.9)
    const pitch  = settings?.robotVoice ? -8   : 0    // semitones for Google TTS
    const gender = settings?.robotVoice ? 'male' : 'female'

    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, rate, pitch, gender }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('tts_api_error')
        return r.json()
      })
      .then(({ audioContent }) => {
        const audio = new Audio(`data:audio/mp3;base64,${audioContent}`)
        audioRef.current = audio
        audio.onended = () => {
          audioRef.current = null
          setStatus('idle')
          onDone?.()
        }
        audio.onerror = () => {
          audioRef.current = null
          setStatus('idle')
          onDone?.()
        }
        audio.play().catch(() => {
          // Autoplay blocked — fall back
          audioRef.current = null
          fallbackSpeak(text, onDone)
        })
      })
      .catch(() => {
        // Key not set or network error — fall back to browser TTS silently
        fallbackSpeak(text, onDone)
      })
  }, [stopListening, stopSpeaking, fallbackSpeak,
      settings?.robotVoice, settings?.speechRate])

  // ── Speech recognition ────────────────────────────────────────────────────
  const startListening = useCallback((onResult) => {
    if (!SpeechRec) return
    stopSpeaking()
    stopListening()

    onResultRef.current = onResult
    setTranscript('')
    setStatus('listening')
    listeningRef.current = true

    const rec = new SpeechRec()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = true
    recRef.current = rec

    let latestTranscript = ''
    let stopped = false
    const forceStop = () => { if (!stopped) { stopped = true; rec.stop() } }
    const timeout = setTimeout(forceStop, 10000)

    rec.onresult = (e) => {
      const results = Array.from(e.results)
      latestTranscript = results.map((r) => r[0].transcript).join('')
      setTranscript(latestTranscript)
      if (results[results.length - 1]?.isFinal) forceStop()
    }

    rec.onend = () => {
      clearTimeout(timeout)
      if (!listeningRef.current) return
      listeningRef.current = false
      recRef.current = null
      setStatus('idle')
      if (latestTranscript.trim() && onResultRef.current) {
        onResultRef.current(latestTranscript.trim())
      }
    }

    rec.onerror = (e) => {
      clearTimeout(timeout)
      if (e.error !== 'no-speech') console.warn('STT error:', e.error)
      listeningRef.current = false
      recRef.current = null
      setStatus('idle')
    }

    rec.start()
  }, [stopSpeaking, stopListening])

  return {
    status, transcript, voices, supported,
    startListening, stopListening, speak, stopSpeaking,
  }
}
