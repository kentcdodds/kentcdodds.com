import clsx from 'clsx'
import * as React from 'react'
import type {MdxListItem} from 'types'
import {H2} from '../typography'
import {ArrowButton} from '../arrow-button'
import {Grid} from '../grid'
import {ArticleCard} from '../article-card'

interface BlogSectionProps {
  articles: Array<MdxListItem>
  title: string
  description: string
  showArrowButton?: boolean
}

function BlogSection({
  articles,
  title,
  description,
  showArrowButton,
}: BlogSectionProps) {
  return (
    <Grid>
      <div className="flex flex-col col-span-full mb-20 space-y-10 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="space-y-2 lg:space-y-0">
          <H2>{title}</H2>
          <H2 variant="secondary" as="p">
            {description}
          </H2>
        </div>

        {showArrowButton === false ? null : (
          <ArrowButton direction="right">See the full blog</ArrowButton>
        )}
      </div>

      {articles.slice(0, 3).map((article, idx) => (
        <div
          key={article.slug}
          className={clsx('col-span-4', {
            'hidden lg:block': idx >= 2,
          })}
        >
          <ArticleCard {...article} />
        </div>
      ))}
    </Grid>
  )
}

export {BlogSection}
