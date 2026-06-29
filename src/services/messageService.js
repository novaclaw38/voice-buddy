import { supabase } from '../lib/supabase.js'

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function sendVoiceMessage(blob) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')
  const base64 = await blobToBase64(blob)
  const { error } = await supabase.from('parent_messages').insert({
    user_id: user.id,
    audio_data: base64,
    mime_type: blob.type || 'audio/webm',
  })
  if (error) throw error
}

export async function fetchMessages(limit = 20) {
  const { data, error } = await supabase
    .from('parent_messages')
    .select('id, created_at, played, mime_type')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function fetchMessageById(id) {
  const { data, error } = await supabase
    .from('parent_messages')
    .select('id, audio_data, mime_type')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function markPlayed(id) {
  await supabase.from('parent_messages').update({ played: true }).eq('id', id)
}
