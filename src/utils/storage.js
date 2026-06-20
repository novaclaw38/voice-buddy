const KEYS = {
  SETTINGS: 'buddy_settings',
  HISTORY: 'buddy_history',
  API_KEY: 'buddy_api_key',
}

const DEFAULTS = {
  childName: 'Dub',
  parentPin: '1234',
  voiceName: '',
  speechRate: 0.9,
  speechPitch: 1.1,
  autoListen: false,
  avatarColor: '#7c3aed',
  morningRoutine: [
    'Wake up and stretch!',
    'Brush your teeth',
    'Wash your face',
    'Get dressed',
    'Eat breakfast',
    'Pack your bag',
  ],
  bedtimeRoutine: [
    'Put on your pajamas',
    'Brush your teeth',
    'Use the bathroom',
    'Get into bed',
    'Take 3 deep breaths',
    'Goodnight!',
  ],
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings))
}

export function getApiKey() {
  const envKey = import.meta.env.VITE_OPENROUTER_KEY
  if (envKey && envKey.length > 10) return envKey
  return localStorage.getItem(KEYS.API_KEY) || ''
}

export function saveApiKey(key) {
  localStorage.setItem(KEYS.API_KEY, key)
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(KEYS.HISTORY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function appendHistory(entry) {
  const history = getHistory()
  history.unshift(entry)
  const trimmed = history.slice(0, 50)
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(trimmed))
}

export function clearHistory() {
  localStorage.removeItem(KEYS.HISTORY)
}
