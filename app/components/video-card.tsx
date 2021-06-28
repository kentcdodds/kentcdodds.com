import * as React from 'react'
import {PlayIcon} from './icons/play-icon'
import {H5} from './typography'

export interface VideoCardProps {
  title: string
  description: string
  imageUrl: string
  imageAlt: string
  videoUrl: string
}

function VideoCard({title, description, imageAlt, imageUrl}: VideoCardProps) {
  return (
    <div className="w-full">
      <div className="aspect-w-4 aspect-h-3 w-full">
        <img
          alt={imageAlt}
          src={imageUrl}
          className="rounded-lg object-cover"
        />

        <div className="flex items-center justify-center w-full h-full">
          <PlayIcon />
        </div>
      </div>
      <div className="mt-8">
        <H5>{title}</H5>
      </div>
      <p className="text-blueGray-500 text-xl">{description}</p>
    </div>
  )
}
export {VideoCard}
