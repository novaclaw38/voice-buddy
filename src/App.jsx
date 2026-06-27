import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase.js'
import ChildPage from './pages/ChildPage.jsx'
import ParentPage from './pages/ParentPage.jsx'
import AuthPage from './pages/AuthPage.jsx'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#0f172a' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif' }}>Loading...</div>
      </div>
    )
  }

  if (!session) {
    return <AuthPage />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChildPage session={session} />} />
        <Route path="/parent" element={<ParentPage session={session} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
