export type ThemeChoice = 'light' | 'dark' | 'system'

const KEY = 'joactually.theme'

export function getTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* storage unavailable */
  }
  return 'system'
}

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
  // The phone's own bars (status bar, gesture bar) follow the app's theme, not just the device's
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const deviceDark = meta.media.includes('dark')
    const dark = choice === 'system' ? deviceDark : choice === 'dark'
    meta.content = dark ? BAR_DARK : BAR_LIGHT
  }
}

const BAR_LIGHT = '#F7F1E5'
const BAR_DARK = '#12173A'

export function setTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(KEY, choice)
  } catch {
    /* storage unavailable */
  }
  applyTheme(choice)
}
