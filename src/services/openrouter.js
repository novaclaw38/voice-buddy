import { getApiKey } from '../utils/storage.js'

const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions'

const FREE_MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
]

async function tryModel(messages, model, options) {
  const key = getApiKey()
  if (!key) throw new Error('NO_API_KEY')

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Voice Buddy',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens || 300,
      temperature: options.temperature || 0.85,
    }),
  })

  if (response.status === 429) throw new Error('RATE_LIMIT')

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content.trim()
}

export async function chatCompletion(messages, options = {}) {
  const key = getApiKey()
  if (!key) throw new Error('NO_API_KEY')

  // Walk through all free models; skip to the next on rate limit
  for (let i = 0; i < FREE_MODELS.length; i++) {
    try {
      return await tryModel(messages, FREE_MODELS[i], options)
    } catch (err) {
      if (err.message === 'RATE_LIMIT' && i < FREE_MODELS.length - 1) {
        continue // try next model
      }
      throw err // last model or non-rate-limit error
    }
  }
}

export async function testConnection() {
  return chatCompletion([
    { role: 'user', content: 'Reply with just the word "ok".' },
  ], { maxTokens: 20 })
}
