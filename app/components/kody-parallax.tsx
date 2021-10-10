import * as React from 'react'
import {motion} from 'framer-motion'
import {
  Parallax,
  ParallaxItem,
  ParallaxWrapper,
  ParallaxItemConfig,
} from './parallax/parallax'

interface ParallaxItem {
  config: ParallaxItemConfig
  backgroundPositionX: number
  backgroundPositionY: number
  size: number
  identifier: string
}

interface KodySegmentCSS extends React.CSSProperties {
  '--pos-x': number
  '--pos-y': number
  '--size': number
}

const ITEMS = [
  {
    identifier: 'kody-yellow',
    backgroundPositionX: 53.15,
    backgroundPositionY: 50,
    size: 739,
    config: {
      positionX: 50,
      positionY: 54,
      moveX: 0.15,
      moveY: -0.25,
      height: 58,
      width: 55,
      rotate: 0.01,
    },
  },
  {
    identifier: 'kody-red',
    backgroundPositionX: 100,
    backgroundPositionY: 50,
    size: 739,
    config: {
      positionX: 50,
      positionY: 54,
      moveX: 0.15,
      moveY: -0.25,
      height: 58,
      width: 55,
      rotate: 0.01,
    },
  },
  {
    identifier: 'kody-white',
    backgroundPositionX: 68.8,
    backgroundPositionY: 50,
    size: 739,
    config: {
      positionX: 50,
      positionY: 54,
      moveX: 0.15,
      moveY: -0.25,
      height: 58,
      width: 55,
      rotate: 0.01,
    },
  },
  {
    identifier: 'kody-blue',
    backgroundPositionX: 84.4,
    backgroundPositionY: 50,
    size: 739,
    config: {
      positionX: 50,
      positionY: 54,
      moveX: 0.15,
      moveY: -0.25,
      height: 58,
      width: 55,
      rotate: 0.01,
    },
  },
  {
    identifier: 'battery',
    size: 2620,
    backgroundPositionX: -0.075,
    backgroundPositionY: 0,
    config: {
      positionX: 74,
      positionY: 15,
      positionZ: -1,
      moveX: 1.5,
      moveY: -0.85,
      height: 17,
      width: 17,
    },
  },
  {
    identifier: 'leaf-one',
    size: 10000,
    backgroundPositionX: 3.75,
    backgroundPositionY: -1,
    config: {
      positionX: 35,
      positionY: 94,
      moveX: 1.5,
      moveY: -0.85,
      height: 7,
      width: 4,
      rotate: 0.6,
    },
  },
  {
    identifier: 'leaf-two',
    size: 5800,
    backgroundPositionX: 10.15,
    backgroundPositionY: -0.25,
    config: {
      positionX: 97,
      positionY: 63,
      moveX: 1.5,
      moveY: -0.85,
      height: 4,
      width: 8,
      rotate: -0.5,
    },
  },
  {
    identifier: 'leaf-three',
    size: 8000,
    backgroundPositionX: 8.85,
    backgroundPositionY: -0.5,
    config: {
      positionX: 84,
      positionY: 21,
      moveX: 1.5,
      moveY: -0.85,
      height: 7,
      width: 6,
      rotate: 0.75,
    },
  },
  {
    identifier: 'leaf-four',
    size: 13500,
    backgroundPositionX: 19.125,
    backgroundPositionY: -0.5,
    config: {
      positionX: 57,
      positionY: 18,
      moveX: 1.5,
      moveY: -0.85,
      height: 7,
      width: 3,
      rotate: 0.35,
    },
  },
  {
    identifier: 'leaf-five',
    size: 6500,
    backgroundPositionX: 16,
    backgroundPositionY: -1,
    config: {
      positionX: 55,
      positionY: 94,
      moveX: 1.5,
      moveY: -0.85,
      height: 10,
      width: 6,
      rotate: 0.6,
    },
  },
  {
    identifier: 'leaf-six',
    size: 5000,
    backgroundPositionX: 14,
    backgroundPositionY: -0.5,
    config: {
      positionX: 9,
      positionY: 22,
      moveX: 1.5,
      moveY: -0.85,
      height: 8,
      width: 8,
      rotate: 1,
    },
  },
  {
    identifier: 'leaf-seven',
    size: 5100,
    backgroundPositionX: 11.975,
    backgroundPositionY: -0.5,
    config: {
      positionX: 4,
      positionY: 83,
      moveX: 1.5,
      moveY: -0.85,
      height: 8,
      width: 8,
      rotate: -0.5,
    },
  },
  {
    identifier: 'leaf-eight',
    size: 5000,
    backgroundPositionX: 20.15,
    backgroundPositionY: -0.5,
    config: {
      positionX: 10,
      positionY: 74,
      moveX: 1.5,
      moveY: -0.85,
      height: 5,
      width: 8,
      rotate: 0.25,
    },
  },
  {
    identifier: 'leaf-nine',
    size: 5000,
    backgroundPositionX: 4.8,
    backgroundPositionY: -0.25,
    config: {
      positionX: 83,
      positionY: 64,
      moveX: 1.5,
      moveY: -0.85,
      height: 9,
      width: 9,
      rotate: -0.6,
    },
  },
  {
    identifier: 'leaf-ten',
    size: 5000,
    backgroundPositionX: 6.85,
    backgroundPositionY: 0,
    config: {
      positionX: 56,
      positionY: 4,
      moveX: 1.5,
      moveY: -0.85,
      height: 8,
      width: 8,
      rotate: 0.8,
    },
  },
  {
    identifier: 'leaf-eleven',
    size: 6200,
    backgroundPositionX: 17.65,
    backgroundPositionY: -0.5,
    config: {
      positionX: 28,
      positionY: 32,
      moveX: 1.5,
      moveY: -0.85,
      height: 4,
      width: 8,
      rotate: 0.6,
    },
  },
  {
    identifier: 'one-wheel',
    size: 1250,
    backgroundPositionX: 27.5,
    backgroundPositionY: -8,
    config: {
      positionX: 80,
      positionY: 83,
      positionZ: 2,
      rotate: 0.2,
      moveX: 1.5,
      moveY: -0.85,
      height: 26,
      width: 32,
    },
  },
  {
    identifier: 'speaker',
    size: 2150,
    backgroundPositionX: 35,
    backgroundPositionY: 0,
    config: {
      positionX: 12,
      positionY: 51,
      positionZ: 2,
      moveX: 1.5,
      moveY: -0.85,
      height: 24,
      width: 19,
    },
  },
  {
    identifier: 'skis',
    size: 1240,
    backgroundPositionX: 41.3,
    backgroundPositionY: -2,
    config: {
      positionX: 77,
      positionY: 40,
      positionZ: 10,
      moveX: 1.5,
      moveY: -0.85,
      height: 30,
      width: 30,
    },
  },
  {
    identifier: 'recycle',
    size: 2850,
    backgroundPositionX: 22.55,
    backgroundPositionY: 0,
    config: {
      positionX: 28,
      positionY: 11,
      rotate: -2,
      moveX: 1.5,
      moveY: -0.85,
      height: 15,
      width: 15,
    },
  },
]

const KodyParallax = ({team = 'white'}: {team: string}) => (
  <motion.div
    initial={{scale: 1.5, opacity: 0}}
    animate={{scale: 1, opacity: 1}}
    transition={{duration: 0.75}}
    className="w-full"
  >
    <ParallaxWrapper>
      <Parallax
        config={{
          rotate: 0.01,
          rotateX: -0.01,
          rotateY: 0.025,
          coefficientX: 1.5,
          coefficientY: 1.5,
        }}
      >
        {/* Debug image. Uncomment to match up positions in DevTools */}
        {/* <img style={{
          position: 'absolute',
          width: '100%',
          objectFit: 'cover',
          zIndex: 2,
          opacity: 0.5,
        }} src="https://res.cloudinary.com/kentcdodds-com/image/upload/kentcdodds.com/illustrations/kody-flying_blue.png"/> */}
        {ITEMS.filter(
          item =>
            item.identifier === `kody-${team}` ||
            !item.identifier.includes('kody'),
        ).map((item: ParallaxItem) => (
          <ParallaxItem key={item.identifier} config={item.config}>
            <div
              className="kody-segment"
              style={
                {
                  '--pos-x': item.backgroundPositionX,
                  '--pos-y': item.backgroundPositionY,
                  '--size': item.size,
                } as KodySegmentCSS
              }
            />
          </ParallaxItem>
        ))}
      </Parallax>
    </ParallaxWrapper>
  </motion.div>
)

export {KodyParallax}
