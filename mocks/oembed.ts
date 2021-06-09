import type {DefaultRequestBody, MockedRequest, RestHandler} from 'msw'
import {rest} from 'msw'

const oembedHandlers: Array<RestHandler<MockedRequest<DefaultRequestBody>>> = [
  rest.get('https://oembed.com/providers.json', async (req, res, ctx) => {
    return res(
      ctx.json([
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
      ]),
    )
  }),

  rest.get('https://publish.twitter.com/oembed', async (req, res, ctx) => {
    return res(
      ctx.json({
        html: '<blockquote class="twitter-tweet" data-dnt="true" data-theme="dark"><p lang="en" dir="ltr">I spent a few minutes working on this, just for you all. I promise, it wont disappoint. Though it may surprise 🎉<br><br>🙏 <a href="https://t.co/wgTJYYHOzD">https://t.co/wgTJYYHOzD</a></p>— Kent C. Dodds (@kentcdodds) <a href="https://twitter.com/kentcdodds/status/783161196945944580?ref_src=twsrc%5Etfw">October 4, 2016</a></blockquote>',
      }),
    )
  }),

  rest.get('https://www.youtube.com/oembed', async (req, res, ctx) => {
    return res(
      ctx.json({
        title: "🚨 Announcement! I'm Going Full-Time Educator 👨‍🏫",
        author_name: 'Kent C. Dodds',
        author_url: 'https://www.youtube.com/user/kentdoddsfamily',
        type: 'video',
        height: 113,
        width: 200,
        version: '1.0',
        provider_name: 'YouTube',
        provider_url: 'https://www.youtube.com/',
        thumbnail_height: 360,
        thumbnail_width: 480,
        thumbnail_url: 'https://i.ytimg.com/vi/ticz3T7xSWI/hqdefault.jpg',
        html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/ticz3T7xSWI?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
      }),
    )
  }),
]

export {oembedHandlers}
