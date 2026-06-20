import { useState, useEffect, useRef, useCallback } from 'react'

const SpeechRec =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export function useSpeech(settings) {
  const [status, setStatus] = useState('idle') // idle | listening | speaking
  const [transcript, setTranscript] = useState('')
  const [voices, setVoices] = useState([])
  const recRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)
  const onResultRef = useRef(null)

  const supported = {
    stt: !!SpeechRec,
    tts: !!synthRef.current,
  }

  // Load voices (Chrome async, others sync)
  useEffect(() => {
    const loadVoices = () => {
      const v = synthRef.current.getVoices()
      if (v.length) setVoices(v)
    }
    loadVoices()
    synthRef.current.addEventListener('voiceschanged', loadVoices)
    return () => synthRef.current.removeEventListener('voiceschanged', loadVoices)
  }, [])

  const getVoice = useCallback(() => {
    if (!voices.length) return null
    if (settings?.voiceName) {
      const match = voices.find((v) => v.name === settings.voiceName)
      if (match) return match
    }
    // Prefer a female English voice for a friendly feel
    return (
      voices.find((v) => v.lang.startsWith('en') && /female|woman/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0]
    )
  }, [voices, settings?.voiceName])

  const stopListening = useCallback(() => {
    if (recRef.current) {
      recRef.current.stop()
      recRef.current = null
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    synthRef.current.cancel()
    setStatus('idle')
  }, [])

  const startListening = useCallback((onResult) => {
    if (!SpeechRec) return
    stopSpeaking()
    stopListening()

    onResultRef.current = onResult
    setTranscript('')
    setStatus('listening')

    const rec = new SpeechRec()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = true
    recRef.current = rec

    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('')
      setTranscript(text)
    }

    rec.onend = () => {
      const final = transcript
      setStatus('idle')
      recRef.current = null
      if (final.trim() && onResultRef.current) {
        onResultRef.current(final.trim())
      }
    }

    rec.onerror = (e) => {
      console.warn('Speech recognition error:', e.error)
      setStatus('idle')
      recRef.current = null
    }

    // Use a local var so onend captures the right transcript
    let latestTranscript = ''
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('')
      latestTranscript = text
      setTranscript(text)
    }
    rec.onend = () => {
      setStatus('idle')
      recRef.current = null
      if (latestTranscript.trim() && onResultRef.current) {
        onResultRef.current(latestTranscript.trim())
      }
    }

    rec.start()
  }, [stopSpeaking, stopListening])

  const speak = useCallback((text, onDone) => {
    if (!synthRef.current || !text) {
      onDone?.()
      return
    }
    stopListening()
    synthRef.current.cancel()

    const utter = new SpeechSynthesisUtterance(text)
    utter.voice = getVoice()
    utter.rate = settings?.speechRate ?? 0.9
    utter.pitch = settings?.speechPitch ?? 1.1
    utter.volume = 1

    setStatus('speaking')

    utter.onend = () => {
      setStatus('idle')
      onDone?.()
    }
    utter.onerror = () => {
      setStatus('idle')
      onDone?.()
    }

    // iOS Safari requires speak() in a microtask after user gesture
    setTimeout(() => synthRef.current.speak(utter), 0)
  }, [getVoice, settings?.speechRate, settings?.speechPitch, stopListening])

  return {
    status,
    transcript,
    voices,
    supported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  }
}
