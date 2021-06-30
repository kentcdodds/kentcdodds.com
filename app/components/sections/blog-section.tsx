import clsx from 'clsx'
import * as React from 'react'
import type {MdxListItem} from 'types'
import {H2} from '../typography'
import {ArrowButton} from '../arrow-button'
import {Grid} from '../grid'
import {ArticleCard} from '../article-card'

function BlogSection({articles}: {articles: Array<MdxListItem>}) {
  return (
    <Grid>
      <div className="flex flex-col col-span-full mb-10 space-y-10 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="space-y-2 lg:space-y-0">
          <H2>Most popular from the blog.</H2>
          <H2 variant="secondary" as="p">
            Probably the most helpful as well.
          </H2>
        </div>

        <ArrowButton direction="right">See the full blog</ArrowButton>
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
