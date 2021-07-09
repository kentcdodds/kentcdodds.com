import * as React from 'react'
import {ArrowIcon} from './icons/arrow-icon'
import {H2, H3, Paragraph} from './typography'
import {ButtonLink} from './button'
import {ArrowLink} from './arrow-button'

export interface CourseCardProps {
  title: string
  description: string
  imageUrl: string
  courseUrl: string
  imageAlt: string
}

function CourseCard({
  title,
  description,
  imageUrl,
  imageAlt,
  courseUrl,
}: CourseCardProps) {
  return (
    <div className="relative pt-12 w-full h-full">
      <div className="relative block pb-10 pt-36 px-8 w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg md:pb-20 md:px-16">
        <H2>{title}</H2>
        <div className="mt-4 max-w-sm">
          <H2 variant="secondary" as="p">
            {description}
          </H2>
        </div>

        <div className="mt-16">
          <ButtonLink to={courseUrl}>
            <span>Visit course</span>
            <ArrowIcon direction="top-right" size={24} />
          </ButtonLink>
        </div>
      </div>

      <div className="absolute left-16 top-0">
        <img
          alt={imageAlt}
          className="w-auto h-32 object-contain"
          src={imageUrl}
        />
      </div>
    </div>
  )
}

function SmallCourseCard({
  title,
  description,
  imageUrl,
  imageAlt,
  courseUrl,
}: CourseCardProps) {
  return (
    <div className="bg-secondary relative flex flex-col items-start px-8 py-12 w-full h-full rounded-lg lg:px-12">
      <img
        alt={imageAlt}
        className="flex-none w-auto h-32 object-contain"
        src={imageUrl}
      />
      <div className="flex flex-none items-end mb-4 h-48">
        <H3>{title}</H3>
      </div>
      <Paragraph className="flex-auto mb-16 max-w-sm">{description}</Paragraph>

      <ArrowLink to={courseUrl} className="flex-none">
        Visit course
      </ArrowLink>
    </div>
  )
}

export {CourseCard, SmallCourseCard}
