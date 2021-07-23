import * as React from 'react'
import {Link} from 'remix'
import {useLocation} from 'react-router'
import clsx from 'clsx'
import {
  Menu,
  MenuButton,
  MenuItems,
  MenuLink,
  MenuPopover,
  useMenuButtonContext,
} from '@reach/menu-button'
import {useEffect} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {alexProfiles} from '../images'
import {Theme, Themed, useTheme} from '../utils/theme-provider'
import {
  useOptionalUser,
  useOptionalUserInfo,
  useTeam,
  useRequestInfo,
} from '../utils/providers'
import {getAvatar} from '../utils/misc'
import {SunIcon} from './icons/sun-icon'
import {MoonIcon} from './icons/moon-icon'

const LINKS = [
  {name: 'Blog', to: '/blog'},
  {name: 'Courses', to: '/courses'},
  {name: 'Discord', to: '/discord'},
  {name: 'Podcast', to: '/chats'},
  {name: 'Workshops', to: '/workshops'},
  {name: 'About', to: '/about'},
]

const MOBILE_LINKS = [{name: 'Home', to: '/'}, ...LINKS]

function NavLink({
  to,
  ...rest
}: Omit<Parameters<typeof Link>['0'], 'to'> & {to: string}) {
  const location = useLocation()
  const isSelected =
    to === location.pathname || location.pathname.startsWith(`${to}/`)

  return (
    <li className="px-5 py-2">
      <Link
        className={clsx(
          'hover:text-primary underlined focus:text-primary block whitespace-nowrap text-lg font-medium focus:outline-none',
          {
            'text-primary active': isSelected,
            'text-secondary': !isSelected,
          },
        )}
        to={to}
        {...rest}
      />
    </li>
  )
}

function DarkModeToggle({variant = 'icon'}: {variant?: 'icon' | 'labelled'}) {
  const [, setTheme] = useTheme()
  return (
    <button
      onClick={() => {
        setTheme(previousTheme =>
          previousTheme === Theme.DARK ? Theme.LIGHT : Theme.DARK,
        )
      }}
      className={clsx(
        'border-secondary hover:border-primary focus:border-primary text-primary inline-flex items-center justify-center p-1 h-14 border-2 rounded-full focus:outline-none transition',
        {
          'w-14': variant === 'icon',
          'px-8': variant === 'labelled',
        },
      )}
    >
      <span>
        <Themed dark={<MoonIcon />} light={<SunIcon />} />
      </span>
      <span className={clsx('ml-4', {'sr-only': variant === 'icon'})}>
        <Themed dark="switch to light mode" light="switch to dark mode" />
      </span>
    </button>
  )
}
/*

      {/*
        NOTE: not relying on the theme state here because it might be `null`
        during a server render when we don't know what theme the user prefers.
      /}
      <span className="dark:hidden">
        <SunIcon />
        <span
          className={clsx('ml-4', {'sr-only': variant === 'icon'})}
        >{`switch to light mode`}</span>
      </span>
      <span className="hidden dark:inline">
        <MoonIcon />
        <span
          className={clsx('ml-4', {'sr-only': variant === 'icon'})}
        >{`switch to dark mode`}</span>
      </span>
*/

function MobileMenuList() {
  const {isExpanded} = useMenuButtonContext()

  useEffect(() => {
    if (isExpanded) {
      // don't use overflow-hidden, as that toggles the scrollbar and causes layout shift
      document.body.classList.add('fixed')
      document.body.classList.add('overflow-y-scroll')
      // alternatively, get bounding box of the menu, and set body height to that.
      document.body.style.height = '100vh'
    } else {
      document.body.classList.remove('fixed')
      document.body.classList.remove('overflow-y-scroll')
      document.body.style.removeProperty('height')
    }
  }, [isExpanded])

  return (
    <AnimatePresence>
      {isExpanded ? (
        <MenuPopover
          position={r => ({
            top: `calc(${r!.top + r!.height}px + 2.25rem)`, // 2.25 rem = py-9 from navbar
            left: 0,
            bottom: 0,
            right: 0,
          })}
          style={{display: 'block'}}
        >
          <motion.div
            initial={{y: -50, opacity: 0}}
            animate={{y: 0, opacity: 1}}
            exit={{y: -50, opacity: 0}}
            transition={{duration: 0.15, ease: 'linear'}}
            className="bg-primary z-50 flex flex-col pb-12 h-full border-t border-gray-200 dark:border-gray-600 overflow-y-scroll"
          >
            <MenuItems className="p-0 bg-transparent border-none">
              {MOBILE_LINKS.map(link => (
                <MenuLink
                  className="text-primary hover:bg-secondary focus:bg-secondary hover:text-primary px-5vw py-9 border-b border-gray-200 dark:border-gray-600"
                  key={link.to}
                  as={Link}
                  to={link.to}
                >
                  {link.name}
                </MenuLink>
              ))}
              <div className="py-9 text-center">
                <DarkModeToggle variant="labelled" />
              </div>
            </MenuItems>
          </motion.div>
        </MenuPopover>
      ) : null}
    </AnimatePresence>
  )
}

const topVariants = {
  open: {rotate: 45, y: 7},
  closed: {rotate: 0, y: 0},
}

const centerVariants = {
  open: {opacity: 0},
  closed: {opacity: 1},
}

const bottomVariants = {
  open: {rotate: -45, y: -5},
  closed: {rotate: 0, y: 0},
}

function MobileMenu() {
  return (
    <Menu>
      {({isExpanded}) => {
        const state = isExpanded ? 'open' : 'closed'
        return (
          <>
            <MenuButton className="focus:border-primary hover:border-primary text-primary border-secondary inline-flex items-center justify-center p-1 w-14 h-14 border-2 rounded-full focus:outline-none transition">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <motion.rect
                  animate={state}
                  variants={topVariants}
                  x="6"
                  y="9"
                  width="20"
                  height="2"
                  rx="1"
                  fill="currentColor"
                />
                <motion.rect
                  animate={state}
                  variants={centerVariants}
                  x="6"
                  y="15"
                  width="20"
                  height="2"
                  rx="1"
                  fill="currentColor"
                />
                <motion.rect
                  animate={state}
                  variants={bottomVariants}
                  x="6"
                  y="21"
                  width="20"
                  height="2"
                  rx="1"
                  fill="currentColor"
                />
              </svg>
            </MenuButton>

            <MobileMenuList />
          </>
        )
      }}
    </Menu>
  )
}

function Navbar() {
  const [team] = useTeam()
  const user = useOptionalUser()
  const userInfo = useOptionalUserInfo()
  const requestInfo = useRequestInfo()
  const avatar = userInfo
    ? userInfo.avatar
    : requestInfo.session.email && requestInfo.session.hasActiveMagicLink
    ? {
        src: getAvatar(requestInfo.session.email, {
          fallback: alexProfiles[team].src,
        }),
        alt: 'Profile',
      }
    : alexProfiles[team]

  return (
    <nav className="text-primary flex items-center justify-between px-5vw py-9 lg:py-12">
      <Link
        to="/"
        className="underlined block whitespace-nowrap text-2xl font-medium focus:outline-none transition"
      >
        <h1>Kent C. Dodds</h1>
      </Link>

      <ul className="hidden lg:flex">
        {LINKS.map(link => (
          <NavLink key={link.to} to={link.to}>
            {link.name}
          </NavLink>
        ))}
      </ul>

      <div className="flex items-center justify-center">
        <div className="block lg:hidden">
          <MobileMenu />
        </div>
        <div className="hidden lg:block">
          <DarkModeToggle />
        </div>

        <Link
          to={
            user
              ? '/me'
              : requestInfo.session.hasActiveMagicLink
              ? '/signup'
              : '/login'
          }
          title={
            user
              ? 'My Account'
              : requestInfo.session.hasActiveMagicLink
              ? 'Finish signing up'
              : 'Login'
          }
          className={clsx(
            'focus:border-primary hover:border-primary inline-flex items-center justify-center ml-4 w-14 h-14 text-white border-2 rounded-full focus:outline-none transition',
            {
              'border-team-current': team !== 'UNKNOWN',
              'border-secondary': team === 'UNKNOWN',
            },
          )}
        >
          <img
            className="inline w-10 h-10 bg-white rounded-full object-cover"
            src={avatar.src}
            alt={avatar.alt}
          />
        </Link>
      </div>
    </nav>
  )
}

export {Navbar}
