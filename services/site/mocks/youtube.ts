import { http, HttpResponse, type HttpHandler } from 'msw'

const playlistFeedXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Better with Kent</title>
 <entry>
  <id>yt:video:XYhLG7a5Qp0</id>
  <yt:videoId>XYhLG7a5Qp0</yt:videoId>
  <title>How to Prioritize Software Tasks</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=XYhLG7a5Qp0"/>
  <published>2026-06-03T08:29:53+00:00</published>
  <media:group>
   <media:title>How to Prioritize Software Tasks</media:title>
   <media:description>Kent walks the Kano model on a real food-delivery backlog: Must-be, Performance, and Delighter &#8212; why GPS was a wow in 2015 and a basic today.

Chapters
0:00 The backlog fight</media:description>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:c1w-Y4IRZFw</id>
  <yt:videoId>c1w-Y4IRZFw</yt:videoId>
  <title>What Software Engineers Need in 2026</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=c1w-Y4IRZFw"/>
  <published>2026-05-29T19:32:28+00:00</published>
  <media:group>
   <media:title>What Software Engineers Need in 2026</media:title>
   <media:description>Kent maps the durable skills that stay valuable as agents take more implementation.

Chapters
0:00 Intro</media:description>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:JBgT_sVdM8w</id>
  <yt:videoId>JBgT_sVdM8w</yt:videoId>
  <title>Introducing Better with Kent</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=JBgT_sVdM8w"/>
  <published>2026-05-22T23:10:08+00:00</published>
  <media:group>
   <media:title>Introducing Better with Kent</media:title>
   <media:description>AI is accelerating change for software engineers. Kent introduces Better with Kent.

Subscribe on YouTube.</media:description>
  </media:group>
 </entry>
</feed>`

const youtubeHandlers: Array<HttpHandler> = [
	http.get('https://www.youtube.com/feeds/videos.xml', () => {
		return new HttpResponse(playlistFeedXml, {
			status: 200,
			headers: { 'Content-Type': 'text/xml; charset=utf-8' },
		})
	}),
]

export { youtubeHandlers }
