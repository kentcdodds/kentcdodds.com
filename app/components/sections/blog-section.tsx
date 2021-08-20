import clsx from 'clsx'
import * as React from 'react'
import type {MdxListItem} from '~/types'
import {Grid} from '../grid'
import {ArticleCard} from '../article-card'
import {HeaderSection} from './header-section'

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
  showArrowButton = true,
}: BlogSectionProps) {
  return (
    <>
      <HeaderSection
        title={title}
        subTitle={description}
        cta={showArrowButton ? 'See the full blog' : undefined}
        ctaUrl="/blog"
        className="mb-16"
      />
      <Grid className="gap-y-16">
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
    </>
  )
}

export {BlogSection}
