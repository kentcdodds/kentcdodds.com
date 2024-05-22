import {
	http,
	type DefaultRequestMultipartBody,
	type HttpHandler,
	HttpResponse,
} from 'msw'

const oembedHandlers: Array<HttpHandler> = [
	http.get<any, DefaultRequestMultipartBody>(
		'https://oembed.com/providers.json',
		async () => {
			return HttpResponse.json([
				{
					provider_name: 'YouTube',
					provider_url: 'https://www.youtube.com/',
					endpoints: [
						{
							schemes: [
								'https://*.youtube.com/watch*',
								'https://*.youtube.com/v/*',
								'https://youtu.be/*',
								'https://*.youtube.com/playlist?list=*',
							],
							url: 'https://www.youtube.com/oembed',
							discovery: true,
						},
					],
				},
				{
					provider_name: 'CodeSandbox',
					provider_url: 'https://codesandbox.io',
					endpoints: [
						{
							schemes: [
								'https://codesandbox.io/s/*',
								'https://codesandbox.io/embed/*',
							],
							url: 'https://codesandbox.io/oembed',
						},
					],
				},
				{
					provider_name: 'Twitter',
					provider_url: 'http://www.twitter.com/',
					endpoints: [
						{
							schemes: [
								'https://twitter.com/*/status/*',
								'https://*.twitter.com/*/status/*',
								'https://twitter.com/*/moments/*',
								'https://*.twitter.com/*/moments/*',
							],
							url: 'https://publish.twitter.com/oembed',
						},
					],
				},
			])
		},
	),

	http.get<any, DefaultRequestMultipartBody>(
		'https://publish.twitter.com/oembed',
		async () => {
			return HttpResponse.json({
				html: '<blockquote class="twitter-tweet" data-dnt="true" data-theme="dark"><p lang="en" dir="ltr">I spent a few minutes working on this, just for you all. I promise, it wont disappoint. Though it may surprise 🎉<br><br>🙏 <a href="https://t.co/wgTJYYHOzD">https://t.co/wgTJYYHOzD</a></p>— Kent C. Dodds (@kentcdodds) <a href="https://twitter.com/kentcdodds/status/783161196945944580?ref_src=twsrc%5Etfw">October 4, 2016</a></blockquote>',
			})
		},
	),

	http.get<any, DefaultRequestMultipartBody>(
		'https://codesandbox.io/oembed',
		async () => {
			return HttpResponse.json({
				html: '<iframe width="1000" height="500" src="https://codesandbox.io/embed/ynn88nx9x?view=editor" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin" style="width: 1000px; height: 500px; border: 0px; border-radius: 4px; overflow: hidden;"></iframe>',
			})
		},
	),

	http.get<any, DefaultRequestMultipartBody>(
		'https://www.youtube.com/oembed',
		async () => {
			return HttpResponse.json({
				html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
			})
		},
	),
]

export { oembedHandlers }
