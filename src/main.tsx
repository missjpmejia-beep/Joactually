import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/700.css'
import './styles.css'
import { configured, supabase } from './lib/supabase'
import { applyTheme, getTheme } from './lib/theme'
import { AppProvider } from './lib/app'
import { Layout } from './components/Layout'
import { Login, SetNewPassword } from './pages/Login'
import { Today } from './pages/Today'
import { History } from './pages/History'
import { Patterns } from './pages/Patterns'
import { Settings } from './pages/Settings'

applyTheme(getTheme())

function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!configured) {
    return <p className="page">Missing Supabase settings. See .env.example.</p>
  }
  if (session === undefined) return null
  if (recovering) return <SetNewPassword onDone={() => setRecovering(false)} />
  if (!session) return <Login />

  return (
    // Keyed by user so nothing from one login leaks into another
    <AppProvider key={session.user.id}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="patterns" element={<Patterns />} />
            <Route path="history" element={<History />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
