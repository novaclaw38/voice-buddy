export async function chatCompletion(messages, options = {}) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      maxTokens: options.maxTokens || 300,
      temperature: options.temperature || 0.85,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content.trim()
}

export async function testConnection() {
  return chatCompletion([
    { role: 'user', content: 'Reply with just the word "ok".' },
  ], { maxTokens: 20 })
}
