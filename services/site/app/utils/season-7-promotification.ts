export const SEASON_7_PROMOTIFICATION_NAME = 'chats-with-kent-season-7'

export function isSeason7ChatsPath(pathname: string) {
	return /^\/chats\/(?:0?7)(?:\/|$)/.test(pathname)
}
