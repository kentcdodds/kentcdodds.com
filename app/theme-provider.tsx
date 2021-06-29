import * as React from 'react'

enum Theme {
  DARK = 'dark',
  LIGHT = 'light',
}
const themes: Array<Theme> = Object.values(Theme)
type ThemeContextType = [
  Theme | null,
  React.Dispatch<React.SetStateAction<Theme | null>>,
]

const ThemeContext =
  React.createContext<ThemeContextType | undefined>(undefined)
ThemeContext.displayName = 'ThemeContext'

function ThemeProvider({
  children,
  specifiedTheme,
}: {
  children: React.ReactNode
  specifiedTheme: Theme | null
}) {
  const [theme, setTheme] = React.useState<Theme | null>(() =>
    getThemeFromMedia(specifiedTheme),
  )

  const mountRun = React.useRef(false)

  React.useEffect(() => {
    if (!mountRun.current) {
      mountRun.current = true
      return
    }

    const searchParams = new URLSearchParams([
      ['_data', 'routes/_action/set-theme'],
    ])
    void fetch(`/_action/set-theme?${searchParams}`, {
      method: 'POST',
      body: JSON.stringify({theme}),
    })
  }, [theme])

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    const handleChange = () => {
      setTheme(mediaQuery.matches ? Theme.LIGHT : Theme.DARK)
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return (
    <ThemeContext.Provider value={[theme, setTheme]}>
      {children}
    </ThemeContext.Provider>
  )
}

const clientThemeCode = `
// this code ensures we honor your dark/light mode preference
const theme = window.matchMedia('(prefers-color-scheme: light)').matches
  ? 'light'
  : 'dark'

document.documentElement.classList.add(theme)
const meta = document.querySelector('meta[name=color-scheme]')
if (meta) {
  if (theme === 'dark') {
    meta.content = 'dark light'
  } else if (theme === 'light') {
    meta.content = 'light dark'
  }
} else {
  console.warn(
    "Heya, could you let Kent know you're seeing this message? Thanks!",
  )
}
`

/**
 * On the server, if we don't have a specified theme then we should
 * return null and the clientThemeCode will set the theme for us
 * before hydration. Then (during hydration), this code will get the same
 * value that clientThemeCode got so hydration is happy.
 */
function getThemeFromMedia(theme: Theme | null): Theme | null {
  if (theme) {
    if (themes.includes(theme)) return theme
    else return null
  }

  // there's no way for us to know what the theme should be in this context
  // the client will have to figure it out before hydration.
  if (typeof window !== 'object') return null

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? Theme.DARK
    : Theme.LIGHT
}

function useTheme() {
  const context = React.useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

const sessionKey = 'theme'

export {
  ThemeProvider,
  useTheme,
  getThemeFromMedia,
  clientThemeCode,
  sessionKey,
  themes,
  Theme,
}
