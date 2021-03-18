import type {Octokit} from '@octokit/rest'
import type {MdxPage} from 'types'
import config from '../../config'
import {downloadMdxFileOrDirectory} from './github.server'
import {compileMdx} from './compile-mdx.server'

async function getMdx(slug: string, octokit: Octokit): Promise<MdxPage> {
  const files = await downloadMdxFileOrDirectory(
    octokit,
    `${config.contentSrc.path}/${slug}`,
  )

  const {code, frontmatter} = await compileMdx(slug, files)
  return {slug, code, frontmatter: frontmatter as MdxPage['frontmatter']}
}

export {getMdx}
