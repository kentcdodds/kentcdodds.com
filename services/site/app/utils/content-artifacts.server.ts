/**
 * Worker-mode accessors for MDX artifact globals set by the dynamic app worker
 * bootstrap. Returns null in Node when artifact globals are not set.
 */

import { type ComponentType } from 'react'
import {
	type MdxArtifactBundle,
	type MdxArtifactDocument,
	type MdxDirListEntry,
} from '../../types/mdx-artifacts.ts'
import { getRuntimeBinding } from '#app/utils/runtime-bindings.server.ts'

const contentDataKey = Symbol.for('kentcdodds.contentData')
const loadMdxModuleKey = Symbol.for('kentcdodds.loadMdxModule')

export type ContentArtifactDocument = MdxArtifactDocument
export type ContentArtifactData = MdxArtifactBundle

export type MdxModule = {
	default: ComponentType<Record<string, unknown>>
}

export type LoadMdxModuleFn = (
	contentDir: string,
	slug: string,
) => Promise<MdxModule | null>

export type ContentRpcBinding = {
	getDocumentCode(contentDir: string, slug: string): Promise<string | null>
}

function isContentRpcBinding(value: unknown): value is ContentRpcBinding {
	if (!value || typeof value !== 'object') return false
	return typeof (value as ContentRpcBinding).getDocumentCode === 'function'
}

function getContentRpcBinding(): ContentRpcBinding | undefined {
	const binding = getRuntimeBinding('CONTENT_RPC')
	return isContentRpcBinding(binding) ? binding : undefined
}

function getArtifactStore() {
	return globalThis as typeof globalThis & {
		[contentDataKey]?: ContentArtifactData | null
		[loadMdxModuleKey]?: LoadMdxModuleFn | null
	}
}

export function getArtifactDirList(
	contentData: ContentArtifactData,
	contentDir: string,
): Array<MdxDirListEntry> {
	if (contentDir === 'blog') return contentData.dirLists.blog
	if (contentDir === 'pages') return contentData.dirLists.pages
	return []
}

export function getContentData(): ContentArtifactData | null {
	const store = getArtifactStore()
	return store[contentDataKey] ?? null
}

export function getLoadMdxModule(): LoadMdxModuleFn | null {
	const store = getArtifactStore()
	const fn = store[loadMdxModuleKey]
	return typeof fn === 'function' ? fn : null
}

export function isWorkerContentMode(): boolean {
	return getContentData() !== null
}

export function getArtifactDataFile(key: string): string | null {
	const data = getContentData()
	if (!data) return null
	return data.dataFiles[key] ?? null
}

export async function getDocumentCode(
	contentDir: string,
	slug: string,
): Promise<string | null> {
	const rpc = getContentRpcBinding()
	if (rpc) {
		return rpc.getDocumentCode(contentDir, slug)
	}

	const data = getContentData()
	const doc = data?.documents[`${contentDir}/${slug}`]
	return doc?.code ?? null
}
