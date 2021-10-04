import * as React from 'react'
import gsap from 'gsap'

interface ParallaxConfig {
  coefficientX?: number
  coefficientY?: number
  rotate?: number
  rotateX?: number
  rotateY?: number
}

export interface ParallaxItemConfig {
  positionX?: number
  positionY?: number
  positionZ?: number
  rotate?: number
  rotateX?: number
  rotateY?: number
  moveX?: number
  moveY?: number
  height?: number
  width?: number
}

interface ContainerCSS extends React.CSSProperties {
  '--r': number
  '--rx': number
  '--ry': number
}

interface ItemCSS extends React.CSSProperties {
  '--x': number
  '--y': number
  '--z': number
  '--r': number
  '--rx': number
  '--ry': number
  '--mx': number
  '--my': number
  '--height': number
  '--width': number
}

const DEFAULT_CONFIG = {
  // Starting positions for X and Y
  positionX: 50,
  positionY: 50,
  positionZ: 0,
  // Range of movement in decimal where 1 === 100. Use negative for opposite directions.
  // Range of movement in decimal where 1 === 100. Use negative for opposite directions.
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  moveX: 0,
  moveY: 0,
}

const Parallax = ({
  config,
  children,
}: {
  config: ParallaxConfig
  children: React.ReactNode | React.ReactNode[]
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    // Function that updates a CSS coefficient for moving things.
    // Base the center point on the center of the container.
    // Then define a width each side. Default to window width/height.
    const UPDATE = ({x, y}: {x: number; y: number}) => {
      // We are going to normalize -100 to 100 with a range and then use CSS coefficient for updates
      // Can base the range on the position of the container and a distance from it based on screen size.
      if (!containerRef.current) return
      // Get the dimensions of the parentNode as the parallax moves and changes dimensions.
      const containerBounds =
        containerRef.current.parentElement?.getBoundingClientRect()
      if (!containerBounds) return
      const centerX = containerBounds.left + containerBounds.width / 2
      const centerY = containerBounds.top + containerBounds.height / 2

      const startX = config.coefficientX
        ? centerX - config.coefficientX * window.innerWidth
        : 0
      const endX = config.coefficientX
        ? centerX + config.coefficientX * window.innerWidth
        : window.innerWidth
      const startY = config.coefficientY
        ? centerY - config.coefficientY * window.innerHeight
        : 0
      const endY = config.coefficientY
        ? centerY + config.coefficientY * window.innerHeight
        : window.innerHeight

      const POS_X = gsap.utils.mapRange(startX, endX, -100, 100)(x)
      const POS_Y = gsap.utils.mapRange(startY, endY, -100, 100)(y)

      containerRef.current.style.setProperty(
        '--range-x',
        `${gsap.utils.clamp(-100, 100, POS_X)}`,
      )
      containerRef.current.style.setProperty(
        '--range-y',
        `${gsap.utils.clamp(-100, 100, POS_Y)}`,
      )
    }
    window.addEventListener('pointermove', UPDATE)
    return () => {
      window.removeEventListener('pointermove', UPDATE)
    }
  }, [config.coefficientX, config.coefficientY])
  return (
    <div
      ref={containerRef}
      className="parallax relative w-full h-full"
      style={
        {
          '--r': config.rotate,
          '--rx': config.rotateX,
          '--ry': config.rotateY,
        } as ContainerCSS
      }
    >
      {children}
    </div>
  )
}

Parallax.defaultProps = {
  config: {
    rotate: 0,
    rotateX: 0,
    rotateY: 0,
    coefficientX: 0.5,
    coefficientY: 0.5,
  },
}

const ParallaxItem = ({
  children,
  config,
}: {
  config: ParallaxItemConfig
  children: React.ReactNode | React.ReactNode[]
}) => {
  const params = {...DEFAULT_CONFIG, ...config}
  return (
    <div
      className="parallax__item absolute"
      style={
        {
          '--x': params.positionX,
          '--y': params.positionY,
          '--z': params.positionZ,
          '--r': params.rotate,
          '--rx': params.rotateX,
          '--ry': params.rotateY,
          '--mx': params.moveX,
          '--my': params.moveY,
          '--height': params.height,
          '--width': params.width,
        } as ItemCSS
      }
    >
      {children}
    </div>
  )
}

ParallaxItem.defaultProps = {
  config: DEFAULT_CONFIG,
}

const ParallaxWrapper = ({children}: {children: React.ReactNode}) => (
  <div className="parallax__wrapper w-full h-full">{children}</div>
)

export {Parallax, ParallaxItem, ParallaxWrapper}
