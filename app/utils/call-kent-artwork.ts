type CallKentEpisodeArtworkOptions = {
	title: string
	/**
	 * Display URL text rendered in the artwork (no protocol recommended).
	 * Example: "kentcdodds.com/calls/01/01"
	 */
	url: string
	/**
	 * Display name rendered in the artwork.
	 * Example: "- Kent"
	 */
	name: string
	/**
	 * Absolute URL for Cloudinary `l_fetch:` layer (Gravatar or Cloudinary URL).
	 */
	avatarUrl: string
	/**
	 * Whether to apply a circular crop (`r_max`) to the avatar layer.
	 * Generally true for real photos, false for illustrations.
	 */
	avatarIsRound: boolean
	/**
	 * Output image dimensions (square). Defaults to 3000 like production.
	 */
	size?: number
}

function toBase64(string: string) {
	if (typeof window === 'undefined') {
		return Buffer.from(string).toString('base64')
	} else {
		return window.btoa(string)
	}
}

// Cloudinary needs double-encoding for `l_text:` payloads.
function doubleEncode(s: string) {
	return encodeURIComponent(encodeURIComponent(s))
}

/**
 * Generates the Cloudinary URL for Call Kent episode artwork.
 *
 * Keep this in sync with the publish-time artwork generation so the "preview"
 * shown to callers matches what ultimately gets uploaded to Transistor.
 */
export function getCallKentEpisodeArtworkUrl({
	title,
	url,
	name,
	avatarUrl,
	avatarIsRound,
	size = 3000,
}: CallKentEpisodeArtworkOptions) {
	const encodedTitle = doubleEncode(title)
	const encodedUrl = doubleEncode(url)
	const encodedName = doubleEncode(name)

	// Cloudinary fetch layers use base64-encoded remote URLs.
	const encodedAvatar = encodeURIComponent(toBase64(avatarUrl))
	const radius = avatarIsRound ? ',r_max' : ''

	const textLines = Number(Math.ceil(Math.min(title.length, 50) / 18).toFixed())
	const avatarYPosition = textLines + 0.6
	const nameYPosition = -textLines + 5.2

	const vars = `$th_${size},$tw_${size},$gw_$tw_div_12,$gh_$th_div_12`
	return [
		`https://res.cloudinary.com/kentcdodds-com/image/upload`,
		vars,
		`w_$tw,h_$th,l_kentcdodds.com:social-background`,
		`co_white,c_fit,g_north_west,w_$gw_mul_6,h_$gh_mul_2.6,x_$gw_mul_0.8,y_$gh_mul_0.8,l_text:kentcdodds.com:Matter-Medium.woff2_180:${encodedTitle}`,
		`c_crop${radius},g_north_west,h_$gh_mul_5.5,w_$gh_mul_5.5,x_$gw_mul_0.8,y_$gh_mul_${avatarYPosition},l_fetch:${encodedAvatar}`,
		`co_rgb:a9adc1,c_fit,g_south_west,w_$gw_mul_8,h_$gh_mul_4,x_$gw_mul_0.8,y_$gh_mul_0.8,l_text:kentcdodds.com:Matter-Regular.woff2_120:${encodedUrl}`,
		`co_rgb:a9adc1,c_fit,g_south_west,w_$gw_mul_8,h_$gh_mul_4,x_$gw_mul_0.8,y_$gh_mul_${nameYPosition},l_text:kentcdodds.com:Matter-Regular.woff2_140:${encodedName}`,
		`c_fit,g_east,w_$gw_mul_11,h_$gh_mul_11,x_$gw,l_kentcdodds.com:illustrations:mic`,
		`c_fill,w_$tw,h_$th/kentcdodds.com/social-background.png`,
	].join('/')
}

