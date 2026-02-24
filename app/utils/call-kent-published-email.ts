const callKentEpisodeArtworkSize = 200

type GetPublishedCallKentEpisodeEmailParams = {
	firstName: string
	episodeTitle: string
	episodeUrl: string
	imageUrl?: string | null
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
}

function getPublishedCallKentEpisodeEmail({
	firstName,
	episodeTitle,
	episodeUrl,
	imageUrl,
}: GetPublishedCallKentEpisodeEmailParams) {
	const safeFirstName = escapeHtml(firstName)
	const safeEpisodeTitle = escapeHtml(episodeTitle)
	const safeEpisodeUrl = escapeHtml(episodeUrl)
	const safeImageUrl = imageUrl ? escapeHtml(imageUrl) : null

	const text = `
Hi ${firstName},

Thanks for your call. Kent just replied and the episode has been published to the podcast!

${episodeTitle}
${episodeUrl}
`.trim()

	const artworkMarkup = safeImageUrl
		? `
      <p style="margin: 16px 0;">
        <a href="${safeEpisodeUrl}" style="display: inline-block; text-decoration: none;">
          <img
            src="${safeImageUrl}"
            alt="Call Kent episode artwork for ${safeEpisodeTitle}"
            width="${callKentEpisodeArtworkSize}"
            height="${callKentEpisodeArtworkSize}"
            style="display: block; width: ${callKentEpisodeArtworkSize}px; height: ${callKentEpisodeArtworkSize}px; object-fit: cover; border-radius: 8px; border: 0;"
          />
        </a>
      </p>
    `.trim()
		: ''

	const html = `
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  </head>
  <body style="font-family: ui-sans-serif, sans-serif; line-height: 1.5; color: #111827;">
    <p style="margin: 0 0 12px;">Hi ${safeFirstName},</p>
    <p style="margin: 0 0 12px;">
      Thanks for your call. Kent just replied and the episode has been published to the podcast!
    </p>
    ${artworkMarkup}
    <p style="margin: 0;">
      <a href="${safeEpisodeUrl}" style="color: #2563eb;">${safeEpisodeTitle}</a>
    </p>
  </body>
</html>
`.trim()

	return { text, html }
}

export { getPublishedCallKentEpisodeEmail }
