const VOICES = {
  female: 'en-US-Neural2-F',
  male:   'en-US-Neural2-D',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = process.env.GOOGLE_TTS_KEY
  if (!key) return res.status(503).json({ error: 'GOOGLE_TTS_KEY not configured' })

  const { text, rate = 0.9, pitch = 0, gender = 'female' } = req.body
  if (!text) return res.status(400).json({ error: 'text is required' })

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: 'en-US',
          name: VOICES[gender] || VOICES.female,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: Math.max(0.25, Math.min(4, rate)),
          pitch: Math.max(-20, Math.min(20, pitch)),
          effectsProfileId: ['headphone-class-device'],
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    return res.status(response.status).json({ error: err.error?.message || 'Google TTS error' })
  }

  const { audioContent } = await response.json()
  res.status(200).json({ audioContent })
}
