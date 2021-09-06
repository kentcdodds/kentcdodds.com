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
import {AnimatePresence, motion, useAnimation} from 'framer-motion'
import type {User} from '@prisma/client'
import {alexProfiles} from '~/images'
import {Theme, Themed, useTheme} from '~/utils/theme-provider'
import {
  useOptionalUser,
  useOptionalUserInfo,
  useTeam,
  useRequestInfo,
  OptionalTeam,
} from '~/utils/providers'
import {getAvatar} from '~/utils/misc'
import {SunIcon} from './icons/sun-icon'
import {MoonIcon} from './icons/moon-icon'
import {TeamCircle} from './team-circle'
import {useElementState} from './hooks/use-element-state'

const LINKS = [
  {name: 'Blog', to: '/blog'},
  {name: 'Courses', to: '/courses'},
  {name: 'Discord', to: '/discord'},
  {name: 'Chats', to: '/chats'},
  {name: 'Calls', to: '/calls'},
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
          'underlined block hover:text-team-current focus:text-team-current whitespace-nowrap text-lg font-medium focus:outline-none',
          {
            'text-team-current active': isSelected,
            'text-secondary': !isSelected,
          },
        )}
        to={to}
        {...rest}
      />
    </li>
  )
}

const iconTransformOrigin = {transformOrigin: '50% 100px'}
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
        'border-secondary hover:border-primary focus:border-primary inline-flex items-center justify-center p-1 h-14 border-2 rounded-full focus:outline-none overflow-hidden transition',
        {
          'w-14': variant === 'icon',
          'px-8': variant === 'labelled',
        },
      )}
    >
      {/* note that the duration is longer then the one on body, controlling the bg-color */}
      <div className="relative w-8 h-8">
        <span
          className="absolute inset-0 text-black dark:text-white transform dark:rotate-0 rotate-90 transition duration-1000"
          style={iconTransformOrigin}
        >
          <MoonIcon />
        </span>
        <span
          className="absolute inset-0 text-black dark:text-white transform dark:-rotate-90 rotate-0 transition duration-1000"
          style={iconTransformOrigin}
        >
          <SunIcon />
        </span>
      </div>
      <span
        className={clsx('ml-4 text-black dark:text-white', {
          'sr-only': variant === 'icon',
        })}
      >
        <Themed dark="switch to light mode" light="switch to dark mode" />
      </span>
    </button>
  )
}

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
            top: `calc(${Number(r?.top) + Number(r?.height)}px + 2.25rem)`, // 2.25 rem = py-9 from navbar
            left: 0,
            bottom: 0,
            right: 0,
          })}
          style={{display: 'block'}}
          className="z-50"
        >
          <motion.div
            initial={{y: -50, opacity: 0}}
            animate={{y: 0, opacity: 1}}
            exit={{y: -50, opacity: 0}}
            transition={{duration: 0.15, ease: 'linear'}}
            className="bg-primary flex flex-col pb-12 h-full border-t border-gray-200 dark:border-gray-600 overflow-y-scroll"
          >
            <MenuItems className="p-0 bg-transparent border-none">
              {MOBILE_LINKS.map(link => (
                <MenuLink
                  className="hover:bg-secondary focus:bg-secondary text-primary px-5vw py-9 hover:text-team-current border-b border-gray-200 dark:border-gray-600"
                  key={link.to}
                  as={Link}
                  to={link.to}
                >
                  {link.name}
                </MenuLink>
              ))}
              <div className="noscript-hidden py-9 text-center">
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
            <MenuButton className="focus:border-primary hover:border-primary border-secondary text-primary inline-flex items-center justify-center p-1 w-14 h-14 border-2 rounded-full focus:outline-none transition">
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

// Timing durations used to control the speed of the team ring in the profile button.
// Time is seconds per full rotation
const durations = {
  initial: 40,
  hover: 3,
  focus: 3,
  active: 0.25,
}

function ProfileButton({
  imageUrl,
  imageAlt,
  team,
  user,
  hasActiveMagicLink,
}: {
  imageUrl: string
  imageAlt: string
  team: OptionalTeam
  user: User | null
  hasActiveMagicLink: boolean
}) {
  const controls = useAnimation()
  const [ref, state] = useElementState()
  const isMascotAvatar = alexProfiles[team].src === imageUrl

  React.useEffect(() => {
    void controls.start((_, {rotate = 0}) => {
      const target =
        typeof rotate === 'number'
          ? state === 'initial'
            ? rotate - 360
            : rotate + 360
          : 360

      return {
        rotate: [rotate, target],
        transition: {
          duration: durations[state],
          repeat: Infinity,
          ease: 'linear',
        },
      }
    })
  }, [state, controls])

  return (
    <Link
      to={user ? '/me' : hasActiveMagicLink ? '/signup' : '/login'}
      aria-label={
        user ? 'My Account' : hasActiveMagicLink ? 'Finish signing up' : 'Login'
      }
      className={clsx(
        'inline-flex items-center justify-center ml-4 w-14 h-14 rounded-full focus:outline-none',
      )}
      ref={ref}
    >
      <motion.div className="absolute" animate={controls}>
        <TeamCircle size={56} team={team} />
      </motion.div>
      <img
        className={clsx('inline w-10 h-10 rounded-full select-none', {
          'object-cover bg-inverse': !isMascotAvatar,
          'object-contain': isMascotAvatar,
        })}
        src={imageUrl}
        alt={imageAlt}
      />
    </Link>
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
    <div className="px-5vw py-9 lg:py-12">
      <nav className="text-primary flex items-center justify-between mx-auto max-w-8xl">
        <Link
          to="/"
          className="text-primary underlined block whitespace-nowrap text-2xl font-medium focus:outline-none transition"
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
          <div className="noscript-hidden hidden lg:block">
            <DarkModeToggle />
          </div>

          <ProfileButton
            hasActiveMagicLink={requestInfo.session.hasActiveMagicLink}
            imageUrl={avatar.src}
            imageAlt={avatar.alt}
            team={team}
            user={user}
          />
        </div>
      </nav>
    </div>
  )
}

export {Navbar}
