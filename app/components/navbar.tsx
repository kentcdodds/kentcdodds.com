import * as React from 'react'
import {SunIcon} from './icons/sun-icon'
import {MoonIcon} from './icons/moon-icon'
import {MenuIcon} from './icons/menu-icon'

interface NavLinkProps {
  href: string
  active?: boolean
  children?: React.ReactNode
}

function NavLink({href, children}: NavLinkProps) {
  return (
    <li>
      <a
        href={href}
        className="block px-5 py-2 hover:underline whitespace-nowrap text-lg font-medium"
      >
        {children}
      </a>
    </li>
  )
}

function DarkModeToggle() {
  const [mode, setMode] = React.useState<'light' | 'dark'>('dark')

  React.useEffect(() => {
    const classList = document.body.classList
    classList.remove('light', 'dark')
    classList.add(mode)
  }, [mode])

  return (
    <button
      onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
      className="inline-flex items-center justify-center p-1 w-14 h-14 text-black dark:text-white border-2 border-gray-200 dark:border-gray-600 rounded-full transition"
    >
      {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

function MenuButton() {
  return (
    <button className="inline-flex items-center justify-center p-1 w-14 h-14 text-black dark:text-white border-2 border-gray-200 dark:border-gray-600 rounded-full transition">
      <MenuIcon />
    </button>
  )
}

function Navbar() {
  return (
    <nav className="flex items-center justify-between p-9 dark:text-white lg:px-16 lg:py-12">
      <a
        href="/"
        className="block hover:underline whitespace-nowrap text-2xl font-medium transition"
      >
        Kent C. Dodds
      </a>

      <ul className="hidden lg:flex">
        <NavLink href="/blog">Blog</NavLink>
        <NavLink href="/courses" active>
          Courses
        </NavLink>
        <NavLink href="/discord">Discord</NavLink>
        <NavLink href="/podcast">Podcast</NavLink>
        <NavLink href="/workshops">Workshops</NavLink>
        <NavLink href="/about">About</NavLink>
      </ul>

      <div className="flex items-center justify-center">
        <div className="block lg:hidden">
          <MenuButton />
        </div>
        <div className="hidden lg:block">
          <DarkModeToggle />
        </div>

        <button className="inline-flex items-center justify-center ml-4 w-14 h-14 text-white border-2 border-team-yellow rounded-full">
          {/*TODO: replace the image*/}
          <img
            className="inline w-10 h-10 bg-white rounded-full object-cover"
            src="https://kentcdodds.com/static/kent-985f8a0db8a37e47da2c07080cffa865.png"
            alt="TODO: give a real alt"
          />
        </button>
      </div>
    </nav>
  )
}

export {Navbar}
