import { expect, test } from 'vitest'
import {
	buildGeneratedWranglerConfig,
	buildPreviewResourceNames,
} from '../preview-resources.ts'

test('buildPreviewResourceNames keeps queue/db/kv names within limits', () => {
	const names = buildPreviewResourceNames(`preview-${'x'.repeat(80)}`)

	expect(names.d1DatabaseName.endsWith('-db')).toBe(true)
	expect(names.siteCacheKvTitle.endsWith('-site-cache-kv')).toBe(true)
	expect(names.callsDraftQueueName.endsWith('-calls-draft-queue')).toBe(true)
	expect(names.d1DatabaseName.length).toBeLessThanOrEqual(63)
	expect(names.siteCacheKvTitle.length).toBeLessThanOrEqual(63)
	expect(names.callsDraftQueueName.length).toBeLessThanOrEqual(63)
})

test('buildGeneratedWranglerConfig rewrites preview bindings and queue consumers', () => {
	const baseConfig: Record<string, unknown> = {
		env: {
			preview: {
				name: 'old-worker',
				vars: { EXISTING: 'value' },
				d1_databases: [
					{
						binding: 'APP_DB',
						database_name: 'old-db',
						database_id: 'old-db-id',
					},
					{
						binding: 'ANOTHER_DB',
						database_name: 'keep-db',
						database_id: 'keep-db-id',
					},
				],
				kv_namespaces: [
					{ binding: 'SITE_CACHE_KV', id: 'old-kv-id', preview_id: 'old-kv-id' },
					{ binding: 'ANOTHER_KV', id: 'keep-kv-id', preview_id: 'keep-kv-id' },
				],
				r2_buckets: [
					{ binding: 'MDX_REMOTE_R2', bucket_name: 'old-mdx-bucket' },
					{ binding: 'ANOTHER_R2', bucket_name: 'keep-r2-bucket' },
				],
				queues: {
					producers: [
						{ binding: 'CALLS_DRAFT_QUEUE', queue: 'old-calls-draft-queue' },
						{ binding: 'ANOTHER_QUEUE', queue: 'keep-queue' },
					],
					consumers: [
						{
							queue: 'old-calls-draft-queue',
							max_batch_size: 1,
							max_batch_timeout: 5,
						},
						{
							queue: 'another-calls-draft-queue',
							max_batch_size: 1,
							max_batch_timeout: 5,
						},
						{
							queue: 'keep-queue',
							max_batch_size: 10,
							max_batch_timeout: 2,
						},
					],
				},
			},
		},
	}

	const generated = buildGeneratedWranglerConfig({
		baseConfig,
		environment: 'preview',
		workerName: 'new-worker',
		d1DatabaseName: 'new-db-name',
		d1DatabaseId: 'new-db-id',
		siteCacheKvId: 'new-kv-id',
		callsDraftQueueName: 'new-calls-draft-queue',
		mdxRemoteR2BucketName: null,
	})
	const previewConfig = (
		(generated.env as Record<string, unknown>).preview as Record<string, unknown>
	)

	expect(previewConfig.name).toBe('new-worker')
	expect(previewConfig.vars).toEqual({
		EXISTING: 'value',
		APP_ENV: 'preview',
	})
	expect(previewConfig.d1_databases).toEqual([
		{
			binding: 'ANOTHER_DB',
			database_name: 'keep-db',
			database_id: 'keep-db-id',
		},
		{
			binding: 'APP_DB',
			database_name: 'new-db-name',
			database_id: 'new-db-id',
			migrations_dir: 'prisma/migrations',
		},
	])
	expect(previewConfig.kv_namespaces).toEqual([
		{
			binding: 'ANOTHER_KV',
			id: 'keep-kv-id',
			preview_id: 'keep-kv-id',
		},
		{
			binding: 'SITE_CACHE_KV',
			id: 'new-kv-id',
			preview_id: 'new-kv-id',
		},
	])
	expect(previewConfig.r2_buckets).toEqual([
		{
			binding: 'ANOTHER_R2',
			bucket_name: 'keep-r2-bucket',
		},
	])
	expect(previewConfig.queues).toEqual({
		producers: [
			{
				binding: 'ANOTHER_QUEUE',
				queue: 'keep-queue',
			},
			{
				binding: 'CALLS_DRAFT_QUEUE',
				queue: 'new-calls-draft-queue',
			},
		],
		consumers: [
			{
				queue: 'keep-queue',
				max_batch_size: 10,
				max_batch_timeout: 2,
			},
			{
				queue: 'new-calls-draft-queue',
				max_batch_size: 1,
				max_batch_timeout: 5,
			},
		],
	})
	expect(
		((baseConfig.env as Record<string, unknown>).preview as Record<string, unknown>)
			.name,
	).toBe('old-worker')
})

test('buildGeneratedWranglerConfig adds mdx remote r2 binding when configured', () => {
	const generated = buildGeneratedWranglerConfig({
		baseConfig: {
			env: {
				preview: {
					name: 'old-worker',
					r2_buckets: [{ binding: 'ANOTHER_R2', bucket_name: 'keep-r2-bucket' }],
				},
			},
		},
		environment: 'preview',
		workerName: 'new-worker',
		d1DatabaseName: 'new-db-name',
		d1DatabaseId: 'new-db-id',
		siteCacheKvId: 'new-kv-id',
		callsDraftQueueName: 'new-calls-draft-queue',
		mdxRemoteR2BucketName: 'mdx-remote-bucket',
	})
	const previewConfig = (
		(generated.env as Record<string, unknown>).preview as Record<string, unknown>
	)

	expect(previewConfig.r2_buckets).toEqual([
		{
			binding: 'ANOTHER_R2',
			bucket_name: 'keep-r2-bucket',
		},
		{
			binding: 'MDX_REMOTE_R2',
			bucket_name: 'mdx-remote-bucket',
		},
	])
})
