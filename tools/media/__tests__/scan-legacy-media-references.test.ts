import { expect, test } from 'vitest'
import { scanFileContents } from '../scan-legacy-media-references.ts'

test('scanFileContents reports cloudinary host references with line details', () => {
	const source = [
		'first line',
		'![img](https://res.cloudinary.com/kentcdodds-com/image/upload/sample.jpg)',
	].join('\n')
	const matches = scanFileContents({
		filePath: 'content/blog/example/index.mdx',
		source,
	})
	expect(matches).toEqual([
		{
			ruleId: 'cloudinary-host',
			ruleDescription: 'Legacy Cloudinary delivery host reference',
			filePath: 'content/blog/example/index.mdx',
			line: 2,
			column: 16,
			text: 'res.cloudinary.com',
		},
	])
})

test('scanFileContents reports cloudinary id fields and component names', () => {
	const source = [
		'bannerCloudinaryId: test/banner',
		'<CloudinaryVideo cloudinaryId="video/id" />',
	].join('\n')
	const matches = scanFileContents({ filePath: 'content/example.mdx', source })
	expect(matches.map((match) => match.ruleId)).toEqual([
		'cloudinary-field',
		'cloudinary-field',
		'cloudinary-video-component',
	])
})
