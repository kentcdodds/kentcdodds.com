import * as React from 'react'
import {ArrowIcon} from './icons/arrow-icon'
import {H2} from './title'
import {Button} from './button'

export interface CourseCardProps {
  title: string
  description: string
  imageUrl: string
  courseUrl: string
}

function CourseCard({
  title,
  description,
  imageUrl,
  courseUrl,
}: CourseCardProps) {
  return (
    <div className="relative pt-12 w-full h-full">
      <a
        className="group relative block pb-10 pt-36 px-8 w-full h-full dark:bg-gray-800 rounded-lg md:pb-20 md:px-16"
        href={courseUrl}
      >
        <div>
          <H2>{title}</H2>
        </div>
        <div className="mt-4 max-w-sm">
          <H2 variant="secondary">{description}</H2>
        </div>

        <div className="mt-16">
          <Button>
            <div className="inline-flex items-center space-x-5">
              <span>Visit course</span>
              <ArrowIcon direction="top-right" size={24} />
            </div>
          </Button>
        </div>
      </a>

      <div className="absolute left-16 top-0">
        <img alt="" className="w-auto h-32 object-cover" src={imageUrl} />
      </div>
    </div>
  )
}

export {CourseCard}
