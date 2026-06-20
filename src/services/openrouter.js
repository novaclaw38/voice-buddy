import { getApiKey, getSettings } from '../utils/storage.js'

const PROVIDERS = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    models: [
      'llama-3.1-8b-instant',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'llama-3.3-70b-versatile',
    ],
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    models: [
      'meta-llama/llama-3.2-3b-instruct:free',
      'qwen/qwen-2.5-7b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
    ],
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Voice Buddy',
    }),
  },
}

async function tryModel(messages, model, provider, key, options) {
  const { url, headers } = PROVIDERS[provider]

  const response = await fetch(url, {
    method: 'POST',
    headers: headers(key),
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

  const settings = getSettings()
  const provider = settings.provider || 'groq'
  const models = PROVIDERS[provider]?.models || PROVIDERS.groq.models

  for (let i = 0; i < models.length; i++) {
    try {
      return await tryModel(messages, models[i], provider, key, options)
    } catch (err) {
      const retriable = err.message === 'RATE_LIMIT'
        || err.message.includes('no endpoints')
        || err.message.includes('not available')
        || err.message.includes('model_not_found')
      if (retriable && i < models.length - 1) continue
      throw err
    }
  }
}

export async function testConnection() {
  return chatCompletion([
    { role: 'user', content: 'Reply with just the word "ok".' },
  ], { maxTokens: 20 })
}
