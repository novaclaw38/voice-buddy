import { getApiKey } from '../utils/storage.js'

const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions'

const FREE_MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
]

export async function chatCompletion(messages, options = {}) {
  const key = getApiKey()
  if (!key) throw new Error('NO_API_KEY')

  const model = options.model || FREE_MODELS[0]

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
    // Try fallback model on model-related errors
    if (response.status === 400 && options.model === undefined) {
      return chatCompletion(messages, { ...options, model: FREE_MODELS[1] })
    }
    throw new Error(err.error?.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content.trim()
}

export async function testConnection() {
  return chatCompletion([
    { role: 'user', content: 'Say "ok" and nothing else.' },
  ], { maxTokens: 5 })
}
