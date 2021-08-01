import * as React from 'react'
import {useState} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import clsx from 'clsx'
import {useRequestInfo} from '../utils/providers'
import {PlusIcon} from './icons/plus-icon'

function NotificationMessage({
  queryStringKey,
  visibleMs = 8000,
  visible,
  autoClose,
  children,
  position = 'bottom-right',
}: {
  queryStringKey?: string
  children?: React.ReactNode | React.ReactNode[]
  position?: 'bottom-right' | 'top-center'
  // make the visibility controlled
  visible?: boolean
} & (
  | {autoClose: false; visibleMs?: never}
  | {visibleMs?: number; autoClose?: never}
)) {
  // how long to wait before the message is shown, after mount
  const delay = typeof visible === 'undefined' ? 1 : 0
  const {searchParams} = useRequestInfo()
  const params = new URLSearchParams(searchParams)
  const [isVisible, setIsVisible] = useState(
    !queryStringKey || params.has(queryStringKey),
  )
  const messageFromQuery = queryStringKey && params.get(queryStringKey)
  // Eslint is wrong here, params.get can return an empty string
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const message = messageFromQuery || children

  React.useEffect(() => {
    if (autoClose === false) return

    const timeout = setTimeout(() => {
      setIsVisible(false)
    }, visibleMs + delay)

    return () => clearTimeout(timeout)
  }, [queryStringKey, delay, autoClose, children, visibleMs])

  const initialY = position.includes('bottom') ? 50 : -50
  const show = typeof visible === 'boolean' ? visible : isVisible

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{y: initialY, opacity: 0}}
          animate={{y: 0, opacity: 1, transition: {delay}}}
          exit={{y: initialY, opacity: 0}}
          transition={{ease: 'easeInOut', duration: 0.3}}
          className={clsx(
            'fixed z-50 left-0 right-0 px-5vw pointer-events-none',
            {
              'bottom-8': position === 'bottom-right',
              'top-8': position === 'top-center',
            },
          )}
        >
          <div
            className={clsx('flex mx-auto w-full max-w-8xl', {
              'justify-end': position === 'bottom-right',
              'justify-center': position === 'top-center',
            })}
          >
            <div className="bg-inverse text-inverse relative p-8 pr-14 max-w-xl rounded-lg shadow-md pointer-events-auto">
              {typeof visible === 'undefined' ? (
                <button
                  aria-label="dismiss message"
                  onClick={() => setIsVisible(false)}
                  className="text-secondary hover:text-inverse focus:text-inverse absolute right-4 top-8 transform rotate-45"
                >
                  <PlusIcon />
                </button>
              ) : null}
              {message}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export {NotificationMessage}
