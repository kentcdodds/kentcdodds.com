import {getBlogMdxListItems} from './mdx.tsx'
import {formatDate, getDomainUrl} from './misc.tsx'

async function getRssFeedXml(request: Request) {
  const posts = await getBlogMdxListItems({request})

  const blogUrl = `${getDomainUrl(request)}/blog`

  return `
    <rss xmlns:blogChannel="${blogUrl}" version="2.0">
      <channel>
        <title>Oswald Faust Blog</title>
        <link>${blogUrl}</link>
        <description>Oswald Faust Blog</description>
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
              <pubDate>${formatDate(
                post.frontmatter.date ?? new Date(),
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
