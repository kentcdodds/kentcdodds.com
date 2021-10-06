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
    identifier: 'kody',
    backgroundPositionX: 54,
    backgroundPositionY: 10,
    size: 450,
    config: {
      positionX: 50,
      positionY: 56,
      moveX: 0.15,
      moveY: -0.25,
      height: 68,
      width: 66,
      rotate: 0.01,
    },
  },
  {
    identifier: 'battery',
    size: 1700,
    backgroundPositionX: 88.25,
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
    size: 6000,
    backgroundPositionX: 36.75,
    backgroundPositionY: 0,
    config: {
      positionX: 35,
      positionY: 95,
      moveX: 1.5,
      moveY: -0.85,
      height: 7,
      width: 5,
      rotate: 0.6,
    },
  },
  {
    identifier: 'leaf-two',
    size: 3600,
    backgroundPositionX: 28.15,
    backgroundPositionY: 1,
    config: {
      positionX: 96,
      positionY: 64,
      moveX: 1.5,
      moveY: -0.85,
      height: 4,
      width: 8,
      rotate: -0.5,
    },
  },
  {
    identifier: 'leaf-three',
    size: 5000,
    backgroundPositionX: 67.5,
    backgroundPositionY: 0,
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
    size: 8500,
    backgroundPositionX: 92.65,
    backgroundPositionY: 0,
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
    size: 4000,
    backgroundPositionX: 34.5,
    backgroundPositionY: 0,
    config: {
      positionX: 55,
      positionY: 95,
      moveX: 1.5,
      moveY: -0.85,
      height: 10,
      width: 6,
      rotate: 0.6,
    },
  },
  {
    identifier: 'leaf-six',
    size: 3100,
    backgroundPositionX: 79.25,
    backgroundPositionY: 0,
    config: {
      positionX: 9,
      positionY: 21,
      moveX: 1.5,
      moveY: -0.85,
      height: 8,
      width: 8,
      rotate: 1,
    },
  },
  {
    identifier: 'leaf-seven',
    size: 3300,
    backgroundPositionX: 39,
    backgroundPositionY: 0,
    config: {
      positionX: 4,
      positionY: 84,
      moveX: 1.5,
      moveY: -0.85,
      height: 8,
      width: 8,
      rotate: -0.5,
    },
  },
  {
    identifier: 'leaf-eight',
    size: 3300,
    backgroundPositionX: 82.5,
    backgroundPositionY: 0,
    config: {
      positionX: 9,
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
    size: 3200,
    backgroundPositionX: 31.15,
    backgroundPositionY: 0,
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
    size: 3200,
    backgroundPositionX: 76,
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
    size: 3800,
    backgroundPositionX: 91.25,
    backgroundPositionY: 0,
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
    size: 810,
    backgroundPositionX: 1,
    backgroundPositionY: 0,
    config: {
      positionX: 80,
      positionY: 83,
      positionZ: 2,
      rotate: 0.2,
      moveX: 1.5,
      moveY: -0.85,
      height: 26,
      width: 36,
    },
  },
  {
    identifier: 'speaker',
    size: 1370,
    backgroundPositionX: 100,
    backgroundPositionY: 1,
    config: {
      positionX: 10,
      positionY: 51,
      positionZ: 2,
      moveX: 1.5,
      moveY: -0.85,
      height: 24,
      width: 20,
    },
  },
  {
    identifier: 'skis',
    size: 760,
    backgroundPositionX: 16,
    backgroundPositionY: 7,
    config: {
      positionX: 83,
      positionY: 39,
      positionZ: 10,
      moveX: 1.5,
      moveY: -0.85,
      height: 36,
      width: 36,
    },
  },
  {
    identifier: 'recycle',
    size: 1800,
    backgroundPositionX: 72.15,
    backgroundPositionY: 0,
    config: {
      positionX: 27,
      positionY: 12,
      rotate: -2,
      moveX: 1.5,
      moveY: -0.85,
      height: 15,
      width: 15,
    },
  },
]

const KodyParallax = () => (
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
        {ITEMS.map((item: ParallaxItem) => (
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
