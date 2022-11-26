import {AppleIcon, RssIcon, SpotifyIcon, GoogleIcon} from './icons'

function PodcastAppLink({
  icon,
  children,
  ...props
}: JSX.IntrinsicElements['a'] & {icon: React.ReactElement}) {
  return (
    <a
      {...props}
      className="focus-ring text-primary bg-secondary mb-4 mr-4 flex flex-none items-center space-x-4 rounded-full px-8 py-4"
    >
      <span className="text-gray-400">{icon}</span>
      <span>{children}</span>
    </a>
  )
}

function PodcastSubs({
  apple,
  google,
  spotify,
  rss,
}: {
  apple: string
  google: string
  spotify: string
  rss: string
}) {
  return (
    <div className="col-span-full -mb-4 -mr-4 flex flex-wrap items-start justify-start lg:col-span-10">
      <PodcastAppLink icon={<AppleIcon />} href={apple}>
        Apple podcasts
      </PodcastAppLink>
      <PodcastAppLink icon={<GoogleIcon />} href={google}>
        Google podcasts
      </PodcastAppLink>
      <div className="flex-no-wrap flex">
        <PodcastAppLink icon={<SpotifyIcon />} href={spotify}>
          Spotify
        </PodcastAppLink>
        <PodcastAppLink icon={<RssIcon />} href={rss}>
          RSS
        </PodcastAppLink>
      </div>
    </div>
  )
}

export {PodcastSubs}
