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
  const listeningRef = useRef(false)

  const supported = {
    stt: !!SpeechRec,
    tts: !!synthRef.current,
  }

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

  const stopListening = useCallback(() => {
    listeningRef.current = false
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
    listeningRef.current = true

    const rec = new SpeechRec()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = true
    recRef.current = rec

    let latestTranscript = ''
    let stopped = false

    const forceStop = () => {
      if (!stopped) {
        stopped = true
        rec.stop()
      }
    }

    // Hard limit: stop after 10s no matter what
    const timeout = setTimeout(forceStop, 10000)

    rec.onresult = (e) => {
      const results = Array.from(e.results)
      const text = results.map((r) => r[0].transcript).join('')
      latestTranscript = text
      setTranscript(text)

      // Force stop as soon as we get a final result — Android Chrome
      // often won't fire onend on its own with continuous: false
      if (results[results.length - 1]?.isFinal) {
        forceStop()
      }
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
      if (e.error !== 'no-speech') console.warn('Speech recognition error:', e.error)
      listeningRef.current = false
      recRef.current = null
      setStatus('idle')
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
    utter.rate = settings?.robotVoice ? 0.85 : (settings?.speechRate ?? 0.9)
    utter.pitch = settings?.robotVoice ? 0.3 : (settings?.speechPitch ?? 1.1)
    utter.volume = 1

    setStatus('speaking')

    utter.onend = () => { setStatus('idle'); onDone?.() }
    utter.onerror = () => { setStatus('idle'); onDone?.() }

    setTimeout(() => synthRef.current.speak(utter), 0)
  }, [getVoice, settings?.speechRate, settings?.speechPitch, settings?.robotVoice, stopListening])

  return {
    status, transcript, voices, supported,
    startListening, stopListening, speak, stopSpeaking,
  }
}
