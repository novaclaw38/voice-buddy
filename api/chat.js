import { getUser, isProMode, isEntitled } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Require a signed-in user — this endpoint spends paid Groq credits.
  const user = await getUser(req)
  if (!user) {
    return res.status(401).json({ error: { message: 'Sign in to chat with Buddy.' } })
  }

  const { messages, maxTokens = 300, temperature = 0.85, mode } = req.body

  // Enforce Pro gating server-side — the client cannot be trusted.
  if (isProMode(mode) && !(await isEntitled(user.id))) {
    return res.status(403).json({ error: { message: 'This mode is part of Buddy Pro.' } })
  }

  const key = process.env.GROQ_API_KEY
  if (!key) {
    return res.status(500).json({ error: { message: 'GROQ_API_KEY not set in Vercel environment variables' } })
  }

  const MODELS = [
    'llama-3.1-8b-instant',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'llama-3.3-70b-versatile',
  ]

  for (let i = 0; i < MODELS.length; i++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20000)
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODELS[i],
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
        signal: ctrl.signal,
      })

      if (response.status === 429 && i < MODELS.length - 1) continue

      const data = await response.json()

      if (!response.ok) {
        if (i < MODELS.length - 1) continue
        return res.status(response.status).json(data)
      }

      return res.status(200).json(data)
    } catch (err) {
      if (i < MODELS.length - 1) continue
      return res.status(500).json({ error: { message: err.message } })
    } finally {
      clearTimeout(timer)
    }
  }
}
