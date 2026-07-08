#!/usr/bin/env node
import './bootstrap-env.ts'
import fs from 'node:fs/promises'
import {
	type MdxArtifactBundle,
	type MdxArtifactDocument,
} from '../../types/mdx-artifacts.ts'
import {
	representativeDocumentKeys,
	verifyDocumentRenderParity,
	verifyDocumentsRenderParity,
} from './render-parity.ts'

type CliOptions = {
	bundlePath: string
	representativeOnly: boolean
}

function parseArgs(argv: Array<string>): CliOptions {
	let bundlePath = '/tmp/bundle.json'
	let representativeOnly = false

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		if (arg === '--bundle') {
			bundlePath = argv[++index] ?? bundlePath
			continue
		}
		if (arg === '--representative-only') {
			representativeOnly = true
			continue
		}
		if (arg === '--help' || arg === '-h') {
			printHelp()
			process.exit(0)
		}
		throw new Error(`Unknown argument: ${arg}`)
	}

	return { bundlePath, representativeOnly }
}

function printHelp() {
	console.log(`Usage: node other/mdx-artifacts/verify-mdx-artifacts.ts [options]

Options:
  --bundle <path>         Bundle JSON path (default: /tmp/bundle.json)
  --representative-only   Verify only the representative document set
`)
}

async function main() {
	const options = parseArgs(process.argv.slice(2))
	const raw = await fs.readFile(options.bundlePath, 'utf8')
	const bundle = JSON.parse(raw) as MdxArtifactBundle

	const selectedEntries = options.representativeOnly
		? representativeDocumentKeys.flatMap((key) => {
				const document = bundle.documents[key]
				return document ? [[key, document] as const] : []
			})
		: Object.entries(bundle.documents)

	const selectedDocuments: Record<
		string,
		Pick<MdxArtifactDocument, 'code' | 'esm'>
	> = {}
	for (const [key, document] of selectedEntries) {
		selectedDocuments[key] = { code: document.code, esm: document.esm }
	}

	const result = await verifyDocumentsRenderParity(selectedDocuments)

	console.log(
		JSON.stringify(
			{
				verified: result.total - result.mismatches.length,
				total: result.total,
				mismatches: result.mismatches,
			},
			null,
			2,
		),
	)

	if (result.mismatches.length) {
		for (const mismatch of result.mismatches.slice(0, 5)) {
			const document = bundle.documents[mismatch.key]
			if (!document) continue
			const parity = await verifyDocumentRenderParity(document, mismatch.key)
			console.error(`Mismatch sample for ${mismatch.key}`)
			console.error('IIFE prefix:', parity.iifeHtml.slice(0, 400))
			console.error('ESM prefix:', parity.esmHtml.slice(0, 400))
		}
		process.exit(1)
	}
}

main().catch((error: unknown) => {
	console.error(error)
	process.exit(1)
})
