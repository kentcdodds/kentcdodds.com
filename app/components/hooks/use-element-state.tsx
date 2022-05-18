import type {RefCallback} from 'react'
import {useRef, useEffect, useState, useCallback} from 'react'

export type ElementState = 'active' | 'focus' | 'hover' | 'initial'

// This started as a work around for https://github.com/framer/motion/issues/1221,
// but it's so much more now. The variants in framer motion support hover, focus
// and tap, while this effect also listens to the keypress, so that `Enter`
// results in an active state as well.
function useElementState(): [RefCallback<HTMLElement>, ElementState] {
  const ref = useRef<HTMLElement | null>(null)
  const [state, setState] = useState({
    focus: false,
    hover: false,
    active: false,
  })

  const setRef: RefCallback<HTMLElement> = useCallback(element => {
    ref.current = element
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const pointerenter = () => setState(s => ({...s, hover: true}))
    const pointerleave = () => setState(s => ({...s, hover: false}))
    const focus = () => setState(s => ({...s, focus: true}))
    const blur = () => setState(s => ({...s, focus: false}))
    const pointerdown = () => {
      setState(s => ({...s, active: true}))

      // pointer events can be cancelled due to which el would never receive
      // a pointerup nor pointercancel event. Listen on the window for those
      // after we received the pointerdown event, and only catch it once. But
      // not with { once: true }, because we want te remove both of them, once
      // of them has been received.
      const pointerup = () => {
        setState(s => ({...s, active: false}))
        window.removeEventListener('pointerup', pointerup)
        window.removeEventListener('pointercancel', pointerup)
      }

      window.addEventListener('pointerup', pointerup)
      window.addEventListener('pointercancel', pointerup)
    }

    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') {
        return
      }

      setState(s => ({...s, active: true}))

      // when clicking a link, the keyup doesn't need to come from the keydown
      // element. We listen on the window instead, but only once.
      const keyup = () => setState(s => ({...s, active: false}))
      window.addEventListener('keyup', keyup, {once: true})
    }

    el.addEventListener('pointerenter', pointerenter)
    el.addEventListener('pointerleave', pointerleave)
    el.addEventListener('focus', focus)
    el.addEventListener('blur', blur)
    el.addEventListener('pointerdown', pointerdown)
    el.addEventListener('keydown', keydown)

    return () => {
      el.removeEventListener('pointerenter', pointerenter)
      el.removeEventListener('pointerleave', pointerleave)
      el.removeEventListener('focus', focus)
      el.removeEventListener('blur', blur)
      el.removeEventListener('pointerdown', pointerdown)
      el.removeEventListener('keydown', keydown)
    }
  }, [])

  const status: ElementState = state.active
    ? 'active'
    : state.focus
    ? 'focus'
    : state.hover
    ? 'hover'
    : 'initial'

  return [setRef, status]
}

export {useElementState}
