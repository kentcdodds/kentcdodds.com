import * as React from 'react'
import {useSSRLayoutEffect} from './shared'

type NestedObj = {[key: string]: NestedObj | string}
type StringObj = {[key: string]: string}
const themes = {
  light: {
    // should be something like:
    // colors: {
    //   primary: 'deeppink',
    //   background: 'white',
    // },
  },
  dark: {
    // colors: {
    //   primary: 'lightpink',
    //   background: 'black',
    // },
  },
} as const

// converts the nested theme object with theme values into one with
// the theme variables as the value
function toVarNames<T extends NestedObj>(obj: T, prefix: string = '-'): T {
  const vars: NestedObj = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object') {
      vars[key] = toVarNames<typeof value>(value, `${prefix}-${key}`)
    } else {
      vars[key] = `var(${prefix}-${key})`
    }
  }
  return vars as T
}
// create a variables object with any theme:
const variables = toVarNames(themes.light)

// converts the nested theme object into a flat object with `--path-to-value` keys
function toVars(obj: NestedObj, prefix = '-'): StringObj {
  const vars: StringObj = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object') {
      const nestedVars = toVars(value, `${prefix}-${key}`)
      for (const [nestedKey, nestedValue] of Object.entries(nestedVars)) {
        vars[nestedKey] = nestedValue
      }
    } else {
      vars[`${prefix}-${key}`] = value
    }
  }
  return vars
}

type ThemeIds = keyof typeof themes
type ThemeContextType = [
  ThemeIds,
  React.Dispatch<React.SetStateAction<ThemeIds>>,
]

const ThemeContext = React.createContext<ThemeContextType | undefined>(
  undefined,
)

const preferDarkQuery = '(prefers-color-scheme: dark)'

function ThemeProvider(props: React.PropsWithChildren<{}>) {
  const [theme, setTheme] = React.useState<ThemeIds>(() => {
    const darkMode =
      typeof window === 'undefined' ||
      localStorage.theme === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia(preferDarkQuery).matches)
    return darkMode ? 'dark' : 'light'
  })

  useSSRLayoutEffect(() => {
    const vars = toVars(themes[theme])
    for (const [key, value] of Object.entries(vars)) {
      document.documentElement.style.setProperty(key, value)
    }
  }, [theme])

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(preferDarkQuery)
    const handleChange = () => {
      setTheme(mediaQuery.matches ? 'dark' : 'light')
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const value = React.useMemo<ThemeContextType>(() => [theme, setTheme], [
    theme,
  ])

  return <ThemeContext.Provider value={value} {...props} />
}

function useTheme() {
  const context = React.useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export {ThemeProvider, useTheme, variables}
