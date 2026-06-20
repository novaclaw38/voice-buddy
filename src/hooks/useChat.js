import { useState, useCallback, useRef } from 'react'
import { chatCompletion } from '../services/openrouter.js'
import { appendHistory } from '../utils/storage.js'
import { PROMPTS, MODE_INTROS } from '../utils/prompts.js'

const MAX_HISTORY = 16

export function useChat(settings) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('chat')
  const messagesRef = useRef([])
  const modeRef = useRef('chat')
  const sessionRef = useRef({ ts: Date.now() })

  const buildSystemPrompt = useCallback((currentMode) => {
    const name = settings?.childName || 'there'
    switch (currentMode) {
      case 'story':    return PROMPTS.story(name)
      case 'game':     return PROMPTS.game(name)
      case 'activity': return PROMPTS.activity(name)
      case 'routine':
        return PROMPTS.routine(name, settings?.morningRoutine || [])
      default:         return PROMPTS.chat(name)
    }
  }, [settings])

  const switchMode = useCallback((newMode) => {
    setMode(newMode)
    modeRef.current = newMode
    const newMsgs = []
    setMessages(newMsgs)
    messagesRef.current = newMsgs
    setError(null)
    sessionRef.current = { ts: Date.now() }

    const name = settings?.childName || 'there'
    return MODE_INTROS[newMode]?.(name) || "Let's play!"
  }, [settings?.childName])

  const sendMessage = useCallback(async (userText, currentMode) => {
    setError(null)
    const currentM = currentMode || modeRef.current
    const userMsg = { role: 'user', content: userText }

    const updatedMsgs = [...messagesRef.current, userMsg]
    messagesRef.current = updatedMsgs
    setMessages(updatedMsgs)
    setLoading(true)

    try {
      const system = { role: 'system', content: buildSystemPrompt(currentM) }
      const recent = updatedMsgs.slice(-MAX_HISTORY)
      const contextMsgs = [system, ...recent]

      const reply = await chatCompletion(contextMsgs)

      const assistantMsg = { role: 'assistant', content: reply }
      const finalMsgs = [...messagesRef.current, assistantMsg]
      messagesRef.current = finalMsgs
      setMessages(finalMsgs)

      appendHistory({
        ts: Date.now(),
        sessionId: sessionRef.current.ts,
        mode: currentM,
        userText,
        buddyText: reply,
      })

      return reply
    } catch (err) {
      let friendly
      if (err.message === 'NO_API_KEY') {
        friendly = "Oops! I need a magic key to talk. Ask a grown-up to add it in the settings!"
      } else if (err.message === 'RATE_LIMIT') {
        friendly = "Whoa, I need a little rest! Try again in a minute, okay?"
      } else {
        friendly = "Hmm, something went a little funny! Can you try again?"
      }
      setError(friendly)
      return friendly
    } finally {
      setLoading(false)
    }
  }, [buildSystemPrompt])

  const clearChat = useCallback(() => {
    setMessages([])
    messagesRef.current = []
    setError(null)
    sessionRef.current = { ts: Date.now() }
  }, [])

  return { messages, loading, error, mode, switchMode, sendMessage, clearChat }
}
