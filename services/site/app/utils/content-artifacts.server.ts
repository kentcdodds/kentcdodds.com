/**
 * Worker-mode accessors for MDX artifact globals set by the dynamic app worker
 * bootstrap. Returns null in Node so dev/Express paths keep working.
 *
 * Types will be reconciled with `types/mdx-artifacts.d.ts` from the MDX pipeline
 * agent; names follow `docs/agents/cloudflare-worker-architecture.md`.
 */

import { type ComponentType } from 'react'
import { type MdxListItem } from '#app/types.ts'
import { getRuntimeBinding } from '#app/utils/runtime-bindings.server.ts'

const contentDataKey = Symbol.for('kentcdodds.contentData')
const loadMdxModuleKey = Symbol.for('kentcdodds.loadMdxModule')

/** Minimal local contract until `types/mdx-artifacts.d.ts` lands. */
export type ContentArtifactDocument = {
	contentDir: string
	slug: string
	code?: string
	githubResolvable?: boolean
	frontmatter: Record<string, unknown>
	readTime?: { text: string; minutes: number; time: number; words: number }
	dateDisplay?: string
	bannerBlurDataUrl?: string
	bannerCredit?: string
}

export type ContentArtifactData = {
	schemaVersion: number
	version: string
	generatedAt: string
	documents: Record<string, ContentArtifactDocument>
	blogList: Array<MdxListItem>
	dirLists: Record<string, Array<{ name: string; slug: string }>>
	dataFiles: Record<string, string>
}

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
