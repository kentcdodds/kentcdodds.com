import unified from 'unified'
import markdown from 'remark-parse'
import remark2rehype from 'remark-rehype'
import doc from 'rehype-document'
import format from 'rehype-format'
import rehypStringify from 'rehype-stringify'

async function markdownToHtml(markdownString: string) {
  const {contents} = await unified()
    .use(markdown)
    .use(remark2rehype)
    .use(rehypStringify)
    .process(markdownString)

  return contents.toString()
}

async function markdownToHtmlUnwrapped(markdownString: string) {
  const wrapped = await markdownToHtml(markdownString)
  return wrapped.replace(/(^<p>|<\/p>$)/g, '')
}

async function markdownToHtmlDocument(markdownString: string) {
  const {contents} = await unified()
    .use(markdown)
    .use(remark2rehype)
    .use(doc)
    .use(format)
    .use(rehypStringify)
    .process(markdownString)

  return contents.toString()
}

export {markdownToHtml, markdownToHtmlUnwrapped, markdownToHtmlDocument}
