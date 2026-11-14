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
}

export function setTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(KEY, choice)
  } catch {
    /* storage unavailable */
  }
  applyTheme(choice)
}
