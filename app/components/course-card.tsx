import type {Variants} from 'framer-motion'
import {motion, useReducedMotion} from 'framer-motion'
import type {ImageBuilder} from '~/images'
import {getImgProps} from '~/images'
import {ArrowIcon} from './icons'
import {H2, H3, Paragraph} from './typography'
import {ButtonLink} from './button'
import {ArrowLink} from './arrow-button'

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

export function CourseCard({
  title,
  description,
  imageBuilder,
  courseUrl,
}: CourseCardProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="relative h-full w-full pt-12">
      <div className="relative block h-full w-full rounded-lg bg-gray-100 px-8 pb-10 pt-36 dark:bg-gray-800 md:px-16 md:pb-20">
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
            href={courseUrl}
            prefetch="intent"
          >
            <span>Visit course</span>
            <motion.span variants={shouldReduceMotion ? arrowVariants : {}}>
              <ArrowIcon direction="top-right" size={24} />
            </motion.span>
          </MotionButtonLink>
        </div>
      </div>

      <div className="absolute left-16 top-0">
        <img
          className="h-32 w-auto object-contain"
          {...getImgProps(imageBuilder, {
            widths: [128, 256, 384],
            sizes: ['8rem'],
          })}
        />
      </div>
    </div>
  )
}

export function SmallCourseCard({
  title,
  description,
  imageBuilder,
  courseUrl,
}: CourseCardProps) {
  return (
    <div className="bg-secondary relative col-span-full mt-12 flex flex-col items-start rounded-lg px-8 py-12 lg:col-span-4 lg:mt-0 lg:px-12">
      <img
        loading="lazy"
        className="h-32 w-auto flex-none object-contain"
        {...getImgProps(imageBuilder, {
          widths: [128, 256, 384],
          sizes: ['8rem'],
        })}
      />
      <div className="mb-4 flex flex-none items-end">
        <H3>{title}</H3>
      </div>
      <Paragraph className="mb-16 max-w-sm flex-auto">{description}</Paragraph>

      <ArrowLink href={courseUrl} className="flex-none">
        Visit course
      </ArrowLink>
    </div>
  )
}
