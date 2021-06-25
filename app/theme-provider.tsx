import * as React from 'react'

type ThemeIds = 'dark' | 'light'
type ThemeContextType = [
  ThemeIds | null,
  React.Dispatch<React.SetStateAction<ThemeIds | null>>,
]

const ThemeContext =
  React.createContext<ThemeContextType | undefined>(undefined)

const preferDarkQuery = '(prefers-color-scheme: dark)'

function ThemeProvider({
  children,
  specifiedTheme,
}: {
  children: React.ReactNode
  specifiedTheme: ThemeIds | null
}) {
  const [theme, setTheme] = React.useState<ThemeIds | null>(() =>
    getThemeFromMedia(specifiedTheme),
  )

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(preferDarkQuery)
    const handleChange = () => {
      setTheme(mediaQuery.matches ? 'dark' : 'light')
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

const getClientThemeCode = (theme: ThemeIds | null) => `
const theme =
  ${JSON.stringify(theme)} ??
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

if (theme) {
  document.body.classList.add(theme);
  const meta = document.querySelector('meta[name=color-scheme]');
  if (meta) {
    if (theme === 'dark') {
      meta.content = 'dark light';
    } else if (theme === 'light') {
      meta.content = 'light dark';
    } else {
      meta.content = 'normal';
    }
  }
}
`
/**
 * On the server, if we don't have a specified theme then we should
 * return null and the getClientThemeCode will set the theme for us
 * before hydration. Then (during hydration), this code will get the same
 * value that getClientThemeCode got so hydration is happy.
 */
function getThemeFromMedia(theme: ThemeIds | null) {
  return theme ?? typeof window === 'object'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : null
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
  getClientThemeCode,
  sessionKey,
}
