import * as React from 'react'
import {motion, Variants} from 'framer-motion'
import type {ImageBuilder} from '~/images'
import {getImgProps} from '~/images'
import {ArrowIcon} from './icons/arrow-icon'
import {H2} from './typography'
import {ButtonLink} from './button'

const MotionButtonLink = motion(ButtonLink)

const arrowVariants: Variants = {
  initial: {x: 0, y: 0},
  hover: {x: 8, y: -8},
  tap: {x: 24, y: -24},
}
export interface CourseCardProps {
  title: string
  description: string
  imageBuilder: ImageBuilder
  courseUrl: string
}

function CourseCard({
  title,
  description,
  imageBuilder,
  courseUrl,
}: CourseCardProps) {
  return (
    <div className="relative pt-12 w-full h-full">
      <div className="relative block pb-10 pt-36 px-8 w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg md:pb-20 md:px-16">
        <H2 as="h3">{title}</H2>
        <div className="mt-4 max-w-sm">
          <H2 variant="secondary" as="p">
            {description}
          </H2>
        </div>

        <div className="mt-16">
          <MotionButtonLink
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            animate="initial"
            to={courseUrl}
          >
            <span>Visit course</span>
            <motion.span variants={arrowVariants}>
              <ArrowIcon direction="top-right" size={24} />
            </motion.span>
          </MotionButtonLink>
        </div>
      </div>

      <div className="absolute left-16 top-0">
        <img
          className="w-auto h-32 object-contain"
          {...getImgProps(imageBuilder, {
            widths: [128, 256, 384],
            sizes: ['8rem'],
          })}
        />
      </div>
    </div>
  )
}

export {CourseCard}
