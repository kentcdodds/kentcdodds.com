async function markdownToHtml(markdownString: string) {
  const {unified} = await import('unified')
  const {default: markdown} = await import('remark-parse')
  const {default: remark2rehype} = await import('remark-rehype')
  const {default: rehypeStringify} = await import('rehype-stringify')
  const result = await unified()
    .use(markdown)
    .use(remark2rehype)
    .use(rehypeStringify)
    .process(markdownString)

  return result.value.toString()
}

async function markdownToHtmlUnwrapped(markdownString: string) {
  const wrapped = await markdownToHtml(markdownString)
  return wrapped.replace(/(^<p>|<\/p>$)/g, '')
}

async function markdownToHtmlDocument(markdownString: string) {
  const {unified} = await import('unified')
  const {default: markdown} = await import('remark-parse')
  const {default: remark2rehype} = await import('remark-rehype')
  const {default: rehypeStringify} = await import('rehype-stringify')
  const {default: doc} = await import('rehype-document')
  const {default: format} = await import('rehype-format')
  const result = await unified()
    .use(markdown)
    .use(remark2rehype)
    .use(doc)
    .use(format)
    .use(rehypeStringify)
    .process(markdownString)

  return result.value.toString()
}

async function stripHtml(htmlString: string) {
  const {unified} = await import('unified')
  const {default: rehypeParse} = await import('rehype-parse')
  const {toString: hastToString} = await import('hast-util-to-string')
  const result = unified().use(rehypeParse).parse(htmlString)

  return hastToString(result)
}

export {
  markdownToHtml,
  markdownToHtmlUnwrapped,
  markdownToHtmlDocument,
  stripHtml,
}
