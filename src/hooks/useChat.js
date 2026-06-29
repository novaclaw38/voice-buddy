import { useState, useCallback, useRef } from 'react'
import { chatCompletion } from '../services/chatService.js'
import { addHistory } from '../services/historyService.js'
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
    const childName  = settings?.childName  || 'there'
    const buddyName  = settings?.buddyName  || 'Buddy'
    switch (currentMode) {
      case 'story':    return PROMPTS.story(childName, buddyName)
      case 'game':     return PROMPTS.game(childName, buddyName)
      case 'activity': return PROMPTS.activity(childName, buddyName)
      case 'routine':  return PROMPTS.routine(childName, buddyName, settings?.morningRoutine || [])
      case 'quiz':     return PROMPTS.quiz(childName, buddyName)
      case 'jokes':    return PROMPTS.jokes(childName, buddyName)
      case 'sing':     return PROMPTS.sing(childName, buddyName)
      case 'feelings': return PROMPTS.feelings(childName, buddyName)
      case 'move':     return PROMPTS.move(childName, buddyName)
      case 'learn':    return PROMPTS.learn(childName, buddyName)
      default:         return PROMPTS.chat(childName, buddyName)
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

    const childName = settings?.childName || 'there'
    const buddyName = settings?.buddyName  || 'Buddy'
    return MODE_INTROS[newMode]?.(childName, buddyName) || "Let's play!"
  }, [settings?.childName, settings?.buddyName])

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

      const reply = await chatCompletion(contextMsgs, { mode: currentM })

      const assistantMsg = { role: 'assistant', content: reply }
      const finalMsgs = [...messagesRef.current, assistantMsg]
      messagesRef.current = finalMsgs
      setMessages(finalMsgs)

      addHistory({
        ts: Date.now(),
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
