import * as React from 'react'
import clsx from 'clsx'
import {motion} from 'framer-motion'
import {H2} from '../typography'
import {ArrowLink} from '../arrow-button'
import {Grid} from '../grid'

type HeroSectionProps = {
  title: string
  subtitle?: string
  action?: React.ReactNode
} & (
  | {
      imageUrl: string
      imageAlt: string
      imageSize?: 'medium' | 'large' | 'giant'
      image?: never
    }
  | {
      imageUrl?: never
      imageAlt?: never
      imageSize?: never
      image?: never
    }
  | {
      imageUrl?: never
      imageAlt?: never
      imageSize?: 'medium' | 'large' | 'giant'
      image: React.ReactNode
    }
) &
  (
    | {
        arrowUrl: string
        arrowLabel: string
      }
    | {
        arrowUrl?: never
        arrowLabel?: never
      }
  )

const childVariants = {
  initial: {opacity: 0, y: 25},
  visible: {opacity: 1, y: 0, transition: {duration: 0.5}},
}

function HeroSection({
  action,
  title,
  subtitle,
  arrowUrl,
  arrowLabel,
  image,
  imageUrl,
  imageAlt,
  imageSize = 'medium',
}: HeroSectionProps) {
  const hasImage = image ?? imageUrl

  return (
    <Grid
      className={clsx('lg:min-h-[40rem] mb-24 pt-24 lg:pb-12 lg:h-hero', {
        'lg:mb-64': arrowLabel,
        'lg:-mb-24': !arrowLabel,
      })}
    >
      {hasImage ? (
        <div
          className={clsx('col-span-full mb-12 lg:mb-0', {
            'lg:col-start-7 lg:col-span-5 px-10': imageSize === 'medium',
            'lg:col-start-6 lg:col-span-6 pl-10 flex items-start justify-end':
              imageSize === 'large',
            'lg:col-start-6 lg:col-span-7 lg:px-0 lg:-mt-24 lg:-mr-5vw flex items-center justify-center':
              imageSize === 'giant',
          })}
        >
          {imageUrl ? (
            <motion.img
              className={clsx('w-full h-auto object-contain', {
                'max-h-50vh': imageSize === 'medium',
                'max-h-75vh': imageSize === 'giant',
              })}
              src={imageUrl}
              alt={imageAlt}
              initial={{scale: 1.5, opacity: 0}}
              animate={{scale: 1, opacity: 1}}
              transition={{duration: 0.75}}
            />
          ) : (
            image
          )}
        </div>
      ) : null}

      <div
        className={clsx(
          'col-span-full pt-6 lg:flex lg:flex-col lg:col-start-1 lg:row-start-1 lg:h-full',
          {
            'lg:col-span-5': hasImage,
            'lg:col-span-7': !hasImage,
          },
        )}
      >
        <motion.div
          className="flex flex-auto flex-col"
          initial="initial"
          animate="visible"
          variants={{
            initial: {opacity: 0},
            visible: {opacity: 1, transition: {staggerChildren: 0.2}},
          }}
        >
          <motion.div variants={childVariants}>
            <H2 as="h2">{title}</H2>
          </motion.div>

          {subtitle ? (
            <motion.div variants={childVariants}>
              <H2 as="p" variant="secondary" className="mt-3">
                {subtitle}
              </H2>
            </motion.div>
          ) : null}
          {action ? (
            <motion.div
              variants={childVariants}
              className="flex flex-col mt-14 space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0"
            >
              {action}
            </motion.div>
          ) : null}
        </motion.div>
        {arrowUrl ? (
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{delay: 1}}
            className="hidden pt-12 lg:block"
          >
            <ArrowLink to={arrowUrl} direction="down" textSize="small">
              {arrowLabel}
            </ArrowLink>
          </motion.div>
        ) : null}
      </div>
    </Grid>
  )
}

export {HeroSection}
