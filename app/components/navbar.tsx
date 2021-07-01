import * as React from 'react'
import {Link} from 'remix'
import {useLocation} from 'react-router'
import clsx from 'clsx'
import {images} from '../images'
import {Theme, useTheme} from '../theme-provider'
import {useOptionalUser, useOptionalUserInfo} from '../utils/misc'
import {SunIcon} from './icons/sun-icon'
import {MoonIcon} from './icons/moon-icon'
import {MenuIcon} from './icons/menu-icon'

function NavLink({
  to,
  ...rest
}: Omit<Parameters<typeof Link>['0'], 'to'> & {to: string}) {
  const location = useLocation()
  const isSelected =
    to === location.pathname || location.pathname.startsWith(`${to}/`)

  return (
    <li>
      <Link
        className={clsx(
          'block px-5 py-2 hover:underline whitespace-nowrap text-lg font-medium',
          {
            'text-black dark:text-white': isSelected,
            'text-blueGray-500': !isSelected,
          },
        )}
        to={to}
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
        setTheme(previousTheme =>
          previousTheme === Theme.DARK ? Theme.LIGHT : Theme.DARK,
        )
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
  const userInfo = useOptionalUserInfo()

  return (
    <nav className="flex items-center justify-between px-5vw py-9 dark:text-white lg:py-12">
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
          title={user ? 'My Account' : 'Login'}
          className={`${
            userBorderClassNames[user?.team ?? 'UNKNOWN']
          } inline-flex items-center justify-center ml-4 w-14 h-14 text-white border-2 rounded-full`}
        >
          <img
            className="inline w-10 h-10 bg-white rounded-full object-cover"
            src={userInfo ? userInfo.avatar.src : images.alexProfileGray.src}
            alt={userInfo ? userInfo.avatar.alt : images.alexProfileGray.alt}
          />
        </Link>
      </div>
    </nav>
  )
}

export {Navbar}
