import * as dateFns from 'date-fns'
import {getBlogMdxListItems} from './mdx'
import {getDomainUrl} from './misc'

async function getRssFeedXml(request: Request) {
  const posts = await getBlogMdxListItems({request})

  const blogUrl = `${getDomainUrl(request)}/blog`

  return `
    <rss xmlns:blogChannel="${blogUrl}" version="2.0">
      <channel>
        <title>Kent C. Dodds Blog</title>
        <link>${blogUrl}</link>
        <description>The Kent C. Dodds Blog</description>
        <language>en-us</language>
        <generator>Kody the Koala</generator>
        <ttl>40</ttl>
        ${posts
          .map(post =>
            `
            <item>
              <title>${cdata(post.frontmatter.title ?? 'Untitled Post')}</title>
              <description>${cdata(
                post.frontmatter.description ?? 'This post is... indescribable',
              )}</description>
              <pubDate>${dateFns.format(
                dateFns.add(
                  post.frontmatter.date
                    ? dateFns.parseISO(post.frontmatter.date)
                    : Date.now(),
                  {minutes: new Date().getTimezoneOffset()},
                ),
                'yyyy-MM-ii',
              )}</pubDate>
              <link>${blogUrl}/${post.slug}</link>
              <guid>${blogUrl}/${post.slug}</guid>
            </item>
          `.trim(),
          )
          .join('\n')}
      </channel>
    </rss>
  `.trim()
}

function cdata(s: string) {
  return `<![CDATA[${s}]]>`
}

export {getRssFeedXml}
