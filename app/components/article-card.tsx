import * as React from 'react'
import {H3} from './title'

export interface ArticleCardProps {
  title: string
  date: Date | number | string
  readTime: string
  imageUrl: string
  articleUrl: string
}

function ArticleCard({
  title,
  date,
  readTime,
  imageUrl,
  articleUrl,
}: ArticleCardProps) {
  const dateString = new Date(date).toLocaleDateString('en-US', {
    dateStyle: 'long',
  })

  return (
    <a className="group relative w-full" href={articleUrl}>
      <button className="absolute z-10 left-6 top-6 px-8 py-4 text-black whitespace-nowrap text-lg font-medium bg-white rounded-lg opacity-0 group-hover:opacity-100 transition">
        Click to copy url
      </button>

      <div className="aspect-w-3 aspect-h-4 w-full">
        <img className="rounded-lg object-cover" src={imageUrl} />
      </div>

      <div className="mt-8 text-blueGray-500 text-xl font-medium">
        {dateString} — {readTime} read
      </div>
      <div className="mt-4 text-black dark:text-white group-hover:underline">
        <H3>{title}</H3>
      </div>
    </a>
  )
}

export {ArticleCard}
