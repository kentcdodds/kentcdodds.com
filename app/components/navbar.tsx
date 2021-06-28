import * as React from 'react'
import {Link} from 'remix'
import * as images from '../images'
import {useTheme} from '../theme-provider'
import {getAvatar, useOptionalUser} from '../utils/misc'
import {SunIcon} from './icons/sun-icon'
import {MoonIcon} from './icons/moon-icon'
import {MenuIcon} from './icons/menu-icon'

function NavLink({className, ...rest}: Parameters<typeof Link>['0']) {
  return (
    <li>
      <Link
        className={`block px-5 py-2 hover:underline whitespace-nowrap text-lg font-medium ${className}`}
        {...rest}
      />
    </li>
  )
}

function DarkModeToggle() {
  const [, setTheme] = useTheme()

  return (
    <button
      onClick={() => {
        setTheme(previousTheme => (previousTheme === 'dark' ? 'light' : 'dark'))
      }}
      className="inline-flex items-center justify-center p-1 w-14 h-14 text-black dark:text-white border-2 border-gray-200 dark:border-gray-600 rounded-full transition"
    >
      <span className="block dark:hidden">
        <SunIcon />
      </span>
      <span className="dark:block hidden">
        <MoonIcon />
      </span>
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

const userBorderClassNames = {
  UNKNOWN: 'border-team-unknown',
  YELLOW: 'border-team-yellow',
  RED: 'border-team-red',
  BLUE: 'border-team-blue',
}

function Navbar() {
  const user = useOptionalUser()

  return (
    <nav className="flex items-center justify-between p-9 dark:text-white lg:px-16 lg:py-12">
      <Link
        to="/"
        className="block hover:underline whitespace-nowrap text-2xl font-medium transition"
      >
        <h1>Kent C. Dodds</h1>
      </Link>

      <ul className="hidden lg:flex">
        <NavLink to="/blog">Blog</NavLink>
        <NavLink to="/courses">Courses</NavLink>
        <NavLink to="/discord">Discord</NavLink>
        <NavLink to="/podcast">Podcast</NavLink>
        <NavLink to="/workshops">Workshops</NavLink>
        <NavLink to="/about">About</NavLink>
      </ul>

      <div className="flex items-center justify-center">
        <div className="block lg:hidden">
          <MenuButton />
        </div>
        <div className="hidden lg:block">
          <DarkModeToggle />
        </div>

        <Link
          to={user ? '/me' : '/login'}
          className={`${
            userBorderClassNames[user?.team ?? 'UNKNOWN']
          } inline-flex items-center justify-center ml-4 w-14 h-14 text-white border-2 rounded-full`}
        >
          <img
            className="inline w-10 h-10 bg-white rounded-full object-cover"
            src={user ? getAvatar(user.email) : images.alexProfile.src}
            alt={user ? user.firstName : 'Login'}
          />
        </Link>
      </div>
    </nav>
  )
}

export {Navbar}
