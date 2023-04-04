import clsx from 'clsx'

export function AppleIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.859 6.15322C15.474 5.36022 15.94 4.23822 15.771 3.09222C14.766 3.16222 13.591 3.80522 12.907 4.64322C12.282 5.40322 11.768 6.53222 11.968 7.63022C13.067 7.66422 14.202 7.00522 14.859 6.15322Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.7438 9.41843C18.7788 8.20843 17.4228 7.50543 16.1408 7.50543C14.4498 7.50543 13.7348 8.31543 12.5598 8.31543C11.3478 8.31543 10.4288 7.50843 8.9658 7.50843C7.5288 7.50843 5.9998 8.38643 5.0298 9.88743C3.6668 12.0014 3.8998 15.9764 6.1088 19.3614C6.8998 20.5734 7.9558 21.9354 9.3368 21.9474C10.5658 21.9594 10.9128 21.1594 12.5778 21.1504C14.2428 21.1414 14.5578 21.9584 15.7858 21.9454C17.1678 21.9344 18.2808 20.4244 19.0718 19.2134C19.6388 18.3454 19.8488 17.9074 20.2898 16.9274C17.0928 15.7104 16.5798 11.1634 19.7438 9.41843Z"
        fill="currentColor"
      />
    </svg>
  )
}

const arrowRotationMap = {
  up: 'rotate-180',
  right: '-rotate-90',
  down: 'rotate-0',
  left: 'rotate-90',
  'top-right': '-rotate-135',
}

export function ArrowIcon({
  direction,
  size = 32,
  className,
}: {
  direction: 'up' | 'right' | 'down' | 'left' | 'top-right'
  size?: number
  className?: string
}) {
  return (
    <svg
      className={clsx(className, 'transform', arrowRotationMap[direction])}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.101 5.5V23.1094L9.40108 17.4095L8.14807 18.6619L15.9862 26.5L23.852 18.6342L22.5996 17.3817L16.8725 23.1094V5.5H15.101Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function AwardIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="M17.25 10a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.75 14.75l-1 4.5 4.25-1.5 4.25 1.5-1-4.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function BadgeIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M14.25 8.75l4-4H5.75l4 4"
      />
      <circle
        cx={12}
        cy={14}
        r={5.25}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
  )
}

export function BehanceIcon({
  size = 24,
  title = 'Behance',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24">
      <title>{title}</title>
      <path d="M0 4.48v14.763h7.155a7.52 7.52 0 001.93-.248 5.148 5.148 0 001.68-.766 3.767 3.767 0 001.167-1.337c.286-.542.43-1.187.43-1.935 0-.924-.22-1.711-.668-2.37-.446-.654-1.119-1.113-2.028-1.374.668-.316 1.166-.723 1.506-1.218.338-.496.506-1.117.506-1.86 0-.688-.112-1.268-.337-1.732a2.86 2.86 0 00-.963-1.127 4.202 4.202 0 00-1.492-.608A9.092 9.092 0 006.96 4.48zm15.667.99v1.457h5.985V5.471zM3.251 6.996h3.04c.288 0 .569.02.836.073.273.046.508.134.716.26.21.12.376.292.501.512.121.22.181.504.181.848 0 .619-.181 1.07-.555 1.343-.378.277-.854.414-1.43.414H3.25zM18.796 8.25c-.82 0-1.559.146-2.23.436-.67.29-1.246.688-1.731 1.192a5.247 5.247 0 00-1.12 1.79 6.27 6.27 0 00-.395 2.236c0 .827.129 1.59.384 2.28.258.691.62 1.281 1.086 1.78a4.84 4.84 0 001.726 1.15c.68.269 1.438.405 2.28.405 1.208 0 2.244-.277 3.095-.833.86-.553 1.49-1.471 1.906-2.757h-2.585c-.1.33-.36.649-.784.946-.43.3-.942.45-1.534.45-.824 0-1.46-.217-1.899-.647-.441-.43-.727-1.229-.727-2.074h7.713a7.571 7.571 0 00-.204-2.38 5.795 5.795 0 00-.94-2.029 4.734 4.734 0 00-1.666-1.416c-.68-.354-1.47-.529-2.375-.529zm-.089 2.217c.721 0 1.313.21 1.661.595.35.39.607.944.677 1.692h-4.777a3.32 3.32 0 01.134-.705c.075-.266.204-.516.394-.753.19-.232.44-.43.744-.59.31-.16.698-.239 1.167-.239zM3.251 12.664h3.533c.7 0 1.269.16 1.695.484.426.328.64.868.64 1.629 0 .388-.062.71-.194.956-.13.25-.31.447-.528.59-.217.15-.475.25-.766.314-.286.064-.59.092-.911.092H3.25z" />
    </svg>
  )
}

export function BookIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="M19.25 15.25v-9.5a1 1 0 00-1-1H6.75a2 2 0 00-2 2v10"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.25 15.25H6.75a2 2 0 100 4h12.5v-4z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function BriefcaseIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="M4.75 9.75a2 2 0 012-2h10.5a2 2 0 012 2v7.5a2 2 0 01-2 2H6.75a2 2 0 01-2-2v-7.5z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.75 18.75v-12a2 2 0 012-2h2.5a2 2 0 012 2v12"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CheckCircledIcon({
  size = 36,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="18" cy="18" r="18" fill="currentColor" />
      <path
        d="M10.8115 17L16.4214 22.6099L25.0314 14"
        stroke="white"
        strokeWidth="2"
      />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M5.75 12.8665L8.33995 16.4138C9.15171 17.5256 10.8179 17.504 11.6006 16.3715L18.25 6.75"
      />
    </svg>
  )
}

export function ChevronDownIcon({
  className,
  title,
}: {
  className?: string
  title?: string
}) {
  return (
    <svg
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M15.25 10.75L12 14.25L8.75 10.75"
      />
    </svg>
  )
}

export function ChevronLeftIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M13.25 8.75L9.75 12L13.25 15.25"
      />
    </svg>
  )
}

export function ChevronRightIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M10.75 8.75L14.25 12L10.75 15.25"
      />
    </svg>
  )
}

export function ChevronUpIcon({
  className,
  title,
}: {
  className?: string
  title?: string
}) {
  return (
    <svg
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M15.25 14.25L12 10.75L8.75 14.25"
      />
    </svg>
  )
}

export function ClipboardIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M9 6.75H7.75C6.64543 6.75 5.75 7.64543 5.75 8.75V17.25C5.75 18.3546 6.64543 19.25 7.75 19.25H16.25C17.3546 19.25 18.25 18.3546 18.25 17.25V8.75C18.25 7.64543 17.3546 6.75 16.25 6.75H15"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M14 8.25H10C9.44772 8.25 9 7.80228 9 7.25V5.75C9 5.19772 9.44772 4.75 10 4.75H14C14.5523 4.75 15 5.19772 15 5.75V7.25C15 7.80228 14.5523 8.25 14 8.25Z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M9.75 12.25H14.25"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M9.75 15.25H14.25"
      />
    </svg>
  )
}

export function CodeIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <rect
        width="14.5"
        height="14.5"
        x="4.75"
        y="4.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        rx="2"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M8.75 10.75L11.25 13L8.75 15.25"
      />
    </svg>
  )
}

export function CodepenIcon({
  size = 24,
  title = 'Codepen',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <title>{title}</title>
      <path
        d="M12.15 24.29a1.14 1.14 0 01-.65-.2l-11-7.28a.91.91 0 01-.32-.3v-.05a1.24 1.24 0 01-.18-.64V8.45a1.23 1.23 0 01.18-.63v-.06a1 1 0 01.32-.29l11-7.28a1.22 1.22 0 011.3 0l11 7.28a1 1 0 01.32.29.1.1 0 010 .05 1.23 1.23 0 01.18.63v7.37a1.24 1.24 0 01-.18.64v.05a1 1 0 01-.32.3l-11 7.28a1.14 1.14 0 01-.65.21zm1.15-7.84V21l7.78-5.17-3.43-2.31zm-10.08-.62L11 21v-4.55l-4.35-2.93zm5.49-3.69l3.44 2.31 3.44-2.31-3.44-2.32zm11 0L22 13.68V10.6zM2.3 10.6v3.08l2.29-1.54zm11-2.77l4.35 2.92 3.43-2.3-7.78-5.17zm-10.08.62l3.43 2.3L11 7.83V3.28z"
        fill="currentColor"
      />
    </svg>
  )
}

export function CopyIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M6.5 15.25V15.25C5.5335 15.25 4.75 14.4665 4.75 13.5V6.75C4.75 5.64543 5.64543 4.75 6.75 4.75H13.5C14.4665 4.75 15.25 5.5335 15.25 6.5V6.5"
      />
      <rect
        width="10.5"
        height="10.5"
        x="8.75"
        y="8.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        rx="2"
      />
    </svg>
  )
}

export function DiscordLogo() {
  return (
    <svg
      height="48"
      viewBox="0 0 292 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0)">
        <path
          d="M61.7958 16.494C57.0736 14.2846 52.0244 12.6789 46.7456 11.7646C46.0973 12.9367 45.3399 14.5132 44.8177 15.7673C39.2062 14.9234 33.6463 14.9234 28.138 15.7673C27.6159 14.5132 26.8413 12.9367 26.1872 11.7646C20.9027 12.6789 15.8477 14.2905 11.1255 16.5057C1.60078 30.8988 -0.981215 44.9344 0.309785 58.7707C6.62708 63.4883 12.7493 66.3541 18.7682 68.2294C20.2543 66.1841 21.5797 64.0099 22.7215 61.7185C20.5469 60.8922 18.4641 59.8725 16.4961 58.6887C17.0182 58.3019 17.5289 57.8975 18.0223 57.4814C30.0257 63.0957 43.0677 63.0957 54.9277 57.4814C55.4269 57.8975 55.9375 58.3019 56.4539 58.6887C54.4801 59.8783 52.3916 60.898 50.217 61.7244C51.3588 64.0099 52.6785 66.19 54.1703 68.2352C60.195 66.3599 66.3229 63.4942 72.6402 58.7707C74.155 42.7309 70.0525 28.8242 61.7958 16.494ZM24.3568 50.2615C20.7535 50.2615 17.7985 46.8976 17.7985 42.8012C17.7985 38.7048 20.6904 35.3351 24.3568 35.3351C28.0233 35.3351 30.9782 38.6989 30.9151 42.8012C30.9208 46.8976 28.0233 50.2615 24.3568 50.2615ZM48.5932 50.2615C44.9899 50.2615 42.0349 46.8976 42.0349 42.8012C42.0349 38.7048 44.9267 35.3351 48.5932 35.3351C52.2596 35.3351 55.2146 38.6989 55.1515 42.8012C55.1515 46.8976 52.2596 50.2615 48.5932 50.2615Z"
          fill="currentColor"
        />
        <path
          d="M98.0293 26.1707H113.693C117.469 26.1707 120.659 26.7743 123.276 27.9757C125.886 29.177 127.843 30.8531 129.14 32.998C130.436 35.1429 131.09 37.5984 131.09 40.3645C131.09 43.072 130.413 45.5275 129.059 47.7251C127.705 49.9286 125.645 51.6692 122.874 52.9526C120.103 54.236 116.671 54.8806 112.569 54.8806H98.0293V26.1707ZM112.408 47.5845C114.95 47.5845 116.907 46.934 118.272 45.6388C119.638 44.3378 120.321 42.568 120.321 40.3235C120.321 38.243 119.712 36.5845 118.496 35.3421C117.28 34.0997 115.438 33.4727 112.976 33.4727H108.076V47.5845H112.408Z"
          fill="currentColor"
        />
        <path
          d="M154.541 54.8456C152.372 54.2713 150.415 53.4391 148.677 52.3432V45.5335C149.991 46.5707 151.752 47.4264 153.961 48.1003C156.17 48.7684 158.305 49.1024 160.37 49.1024C161.334 49.1024 162.063 48.9735 162.556 48.7156C163.05 48.4578 163.297 48.1472 163.297 47.7897C163.297 47.3795 163.165 47.0396 162.895 46.7641C162.625 46.4887 162.103 46.2601 161.329 46.0667L156.509 44.9591C153.749 44.3028 151.792 43.3944 150.628 42.2282C149.463 41.0678 148.883 39.5441 148.883 37.6571C148.883 36.0689 149.388 34.6918 150.41 33.5138C151.425 32.3359 152.871 31.4275 154.747 30.7887C156.624 30.1441 158.815 29.8218 161.334 29.8218C163.583 29.8218 165.643 30.0679 167.52 30.5602C169.396 31.0525 170.945 31.6795 172.179 32.4472V38.8878C170.916 38.1201 169.47 37.5165 167.818 37.0593C166.171 36.6081 164.479 36.3854 162.734 36.3854C160.215 36.3854 158.959 36.8249 158.959 37.6981C158.959 38.1084 159.154 38.4131 159.544 38.6182C159.934 38.8233 160.651 39.0343 161.69 39.257L165.706 39.9954C168.329 40.4584 170.285 41.273 171.57 42.4333C172.856 43.5937 173.498 45.3108 173.498 47.5846C173.498 50.0752 172.437 52.0502 170.308 53.5153C168.179 54.9804 165.161 55.7129 161.248 55.7129C158.947 55.7071 156.71 55.4199 154.541 54.8456Z"
          fill="currentColor"
        />
        <path
          d="M182.978 53.9839C180.678 52.8352 178.939 51.2764 177.78 49.3073C176.621 47.3382 176.036 45.123 176.036 42.6616C176.036 40.2003 176.638 37.9968 177.843 36.057C179.048 34.1172 180.815 32.5935 183.145 31.4859C185.474 30.3783 188.257 29.8274 191.499 29.8274C195.515 29.8274 198.849 30.6889 201.5 32.4118V39.919C200.565 39.2626 199.474 38.7293 198.229 38.3191C196.984 37.9089 195.653 37.7037 194.23 37.7037C191.74 37.7037 189.795 38.1667 188.389 39.0985C186.983 40.0303 186.278 41.2434 186.278 42.7495C186.278 44.2263 186.96 45.4336 188.326 46.383C189.692 47.3265 191.671 47.8012 194.27 47.8012C195.607 47.8012 196.927 47.6019 198.229 47.2093C199.526 46.8108 200.645 46.3244 201.58 45.75V53.011C198.637 54.816 195.223 55.7185 191.338 55.7185C188.068 55.7068 185.279 55.1325 182.978 53.9839Z"
          fill="currentColor"
        />
        <path
          d="M211.518 53.9841C209.2 52.8355 207.433 51.2649 206.216 49.2665C205 47.2681 204.386 45.0412 204.386 42.5798C204.386 40.1185 204.994 37.9208 206.216 35.9928C207.438 34.0647 209.194 32.5527 211.501 31.4568C213.801 30.3609 216.55 29.8159 219.734 29.8159C222.919 29.8159 225.667 30.3609 227.968 31.4568C230.269 32.5527 232.025 34.053 233.23 35.9693C234.435 37.8857 235.037 40.0833 235.037 42.574C235.037 45.0353 234.435 47.2623 233.23 49.2606C232.025 51.259 230.263 52.8296 227.945 53.9783C225.627 55.1269 222.89 55.7012 219.729 55.7012C216.567 55.7012 213.83 55.1327 211.518 53.9841ZM223.722 46.7055C224.698 45.7093 225.191 44.3907 225.191 42.7498C225.191 41.1089 224.703 39.802 223.722 38.835C222.747 37.8622 221.415 37.3758 219.729 37.3758C218.013 37.3758 216.67 37.8622 215.689 38.835C214.714 39.8079 214.226 41.1089 214.226 42.7498C214.226 44.3907 214.714 45.7093 215.689 46.7055C216.665 47.7018 218.013 48.2058 219.729 48.2058C221.415 48.1999 222.747 47.7018 223.722 46.7055Z"
          fill="currentColor"
        />
        <path
          d="M259.17 31.3395V40.2004C258.149 39.5147 256.829 39.1748 255.194 39.1748C253.053 39.1748 251.401 39.8371 250.253 41.1615C249.1 42.486 248.526 44.5488 248.526 47.3383V54.8865H238.686V30.8883H248.326V38.5185C248.859 35.7289 249.726 33.672 250.919 32.3416C252.107 31.0172 253.644 30.355 255.515 30.355C256.932 30.355 258.149 30.6832 259.17 31.3395Z"
          fill="currentColor"
        />
        <path
          d="M291.864 25.3503V54.8866H282.023V49.5127C281.191 51.5345 279.929 53.0758 278.231 54.1306C276.532 55.1797 274.432 55.7071 271.942 55.7071C269.716 55.7071 267.777 55.1562 266.118 54.0486C264.46 52.941 263.181 51.4232 262.28 49.4951C261.385 47.567 260.931 45.387 260.931 42.9491C260.903 40.435 261.379 38.1787 262.36 36.1803C263.336 34.1819 264.718 32.6231 266.497 31.5037C268.276 30.3844 270.307 29.8218 272.585 29.8218C277.273 29.8218 280.417 31.9022 282.023 36.0572V25.3503H291.864ZM280.555 46.5415C281.559 45.5452 282.058 44.2501 282.058 42.6678C282.058 41.1382 281.57 39.8899 280.595 38.9347C279.619 37.9795 278.282 37.4989 276.601 37.4989C274.943 37.4989 273.618 37.9853 272.625 38.9581C271.632 39.931 271.139 41.1909 271.139 42.7498C271.139 44.3087 271.632 45.5804 272.625 46.5649C273.618 47.5494 274.926 48.0417 276.561 48.0417C278.219 48.0359 279.55 47.5377 280.555 46.5415Z"
          fill="currentColor"
        />
        <path
          d="M139.382 33.4432C142.091 33.4432 144.288 31.4281 144.288 28.9424C144.288 26.4567 142.091 24.4417 139.382 24.4417C136.672 24.4417 134.476 26.4567 134.476 28.9424C134.476 31.4281 136.672 33.4432 139.382 33.4432Z"
          fill="currentColor"
        />
        <path
          d="M134.472 36.5435C137.478 37.8679 141.208 37.9265 144.283 36.5435V55.0154H134.472V36.5435Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0">
          <rect
            width="292"
            height="56.4706"
            fill="white"
            transform="translate(0 11.7646)"
          />
        </clipPath>
      </defs>
    </svg>
  )
}

export function DollarIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="7.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M14.25 8.75H11.375C10.4775 8.75 9.75 9.47754 9.75 10.375V10.375C9.75 11.2725 10.4775 12 11.375 12H12.625C13.5225 12 14.25 12.7275 14.25 13.625V13.625C14.25 14.5225 13.5225 15.25 12.625 15.25H9.75"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12 7.75V8.25"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12 15.75V16.25"
      />
    </svg>
  )
}

export function DribbbleIcon({
  size = 24,
  title = 'Dribbble',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <title>{title}</title>
      <path
        d="M19.25 12a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0zM8.271 6.5c2.787 1.6 6.678 4.66 8.879 10M16 6.39C14.357 8.374 10.69 11.71 5 11M10.688 19s.812-6.5 8.03-8.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function EmojiHappyIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8.75 4.75h6.5a4 4 0 014 4v6.5a4 4 0 01-4 4h-6.5a4 4 0 01-4-4v-6.5a4 4 0 014-4z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7.75 12.75S9 15.25 12 15.25s4.25-2.5 4.25-2.5"
      />
      <circle cx={14} cy={10} r={1} fill="currentColor" />
      <circle cx={10} cy={10} r={1} fill="currentColor" />
    </svg>
  )
}

export function EyeIcon({size = 24}: {size?: number}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M19.25 12C19.25 13 17.5 18.25 12 18.25C6.5 18.25 4.75 13 4.75 12C4.75 11 6.5 5.75 12 5.75C17.5 5.75 19.25 11 19.25 12Z"
      />
      <circle
        cx="12"
        cy="12"
        r="2.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function FastForwardIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 15.86l-3.25 2.39V5.75L8 8.14M19.25 12l-8.5-6.25v12.5l8.5-6.25z"
      />
    </svg>
  )
}

export function GithubIcon({
  size = 24,
  title = 'GitHub',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"
      />
    </svg>
  )
}

export function GlobeIcon({
  size = 24,
  title = 'Globe',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <title>{title}</title>
      <circle
        cx={12}
        cy={12}
        r={7.25}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15.25 12c0 4.5-2.007 7.25-3.25 7.25-1.243 0-3.25-2.75-3.25-7.25S10.757 4.75 12 4.75c1.243 0 3.25 2.75 3.25 7.25zM5 12h14"
      />
    </svg>
  )
}

export function GoogleIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.4371 20.52C17.1467 20.52 20.2754 17.2795 20.2754 12.7058C20.2754 12.1823 20.2202 11.7776 20.1429 11.3745H12.4383V14.1243H17.071C16.8813 15.2925 15.6677 17.5728 12.4383 17.5728C9.65598 17.5728 7.38356 15.3134 7.38356 12.5198C7.38356 9.72662 9.65477 7.46601 12.4383 7.46601C14.0305 7.46601 15.0881 8.13203 15.6899 8.69936L17.9051 6.61522C16.4789 5.30606 14.6419 4.52002 12.4371 4.52002C7.9277 4.52002 4.27539 8.09966 4.27539 12.5198C4.27539 16.9408 7.9277 20.52 12.4371 20.52"
        fill="currentColor"
      />
    </svg>
  )
}

export function HeartIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M11.995 7.233c-1.45-1.623-3.867-2.06-5.683-.573-1.816 1.486-2.072 3.971-.645 5.73l6.328 5.86 6.329-5.86c1.426-1.759 1.201-4.26-.646-5.73-1.848-1.471-4.233-1.05-5.683.573z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function InstagramIcon({
  size = 24,
  title = 'Instagram',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <title>{title}</title>
      <path
        d="M4.75 7.75a3 3 0 013-3h8.5a3 3 0 013 3v8.5a3 3 0 01-3 3h-8.5a3 3 0 01-3-3v-8.5z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 8a.5.5 0 11-1 0 .5.5 0 011 0z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.25 13a3.25 3.25 0 11-6.5 0 3.25 3.25 0 016.5 0z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LaptopIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="M5.75 5.75a1 1 0 011-1h10.5a1 1 0 011 1v8.5H5.75v-8.5zM18.25 14.5l.746 3.544a1 1 0 01-.979 1.206H5.982a1 1 0 01-.978-1.206L5.75 14.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LinkedInIcon({
  size = 24,
  title = 'LinkedIn',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <title>{title}</title>
      <path
        d="M4.75 7.75a3 3 0 013-3h8.5a3 3 0 013 3v8.5a3 3 0 01-3 3h-8.5a3 3 0 01-3-3v-8.5z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.75 16.25V14a2.25 2.25 0 014.5 0v2.25M10.75 11.75v4.5M7.75 11.75v4.5M7.75 8.75v.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LogoutIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M15.75 8.75L19.25 12L15.75 15.25"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M19 12H10.75"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M15.25 4.75H6.75C5.64543 4.75 4.75 5.64543 4.75 6.75V17.25C4.75 18.3546 5.64543 19.25 6.75 19.25H15.25"
      />
    </svg>
  )
}

export function MailIcon({size = 24}: {size?: number}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="M4.75 8.75L12 4.75L19.25 8.75V17.25C19.25 18.3546 18.3546 19.25 17.25 19.25H6.75C5.64543 19.25 4.75 18.3546 4.75 17.25V8.75Z"
        stroke="#141414"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 9L13.25 13.25H10.75L5 9"
        stroke="#141414"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MenuIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="6" y="9" width="20" height="2" rx="1" fill="currentColor" />
      <rect x="6" y="15" width="20" height="2" rx="1" fill="currentColor" />
      <rect x="6" y="21" width="20" height="2" rx="1" fill="currentColor" />
    </svg>
  )
}

export function MessageIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 18.25c3.5 0 7.25-1.75 7.25-6.25S15.5 5.75 12 5.75 4.75 7.5 4.75 12c0 1.03.196 1.916.541 2.67.215.47.336.987.24 1.495l-.262 1.399a1 1 0 001.168 1.167l3.207-.602a2.24 2.24 0 01.764-.003c.527.084 1.062.124 1.592.124z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.5 12a.5.5 0 11-1 0 .5.5 0 011 0zM12.5 12a.5.5 0 11-1 0 .5.5 0 011 0zM15.5 12a.5.5 0 11-1 0 .5.5 0 011 0z"
      />
    </svg>
  )
}

export function MicrophoneIcon({size = 24}: {size?: number}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M8.75 8C8.75 6.20507 10.2051 4.75 12 4.75C13.7949 4.75 15.25 6.20507 15.25 8V11C15.25 12.7949 13.7949 14.25 12 14.25C10.2051 14.25 8.75 12.7949 8.75 11V8Z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M5.75 12.75C5.75 12.75 6 17.25 12 17.25C18 17.25 18.25 12.75 18.25 12.75"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12 17.75V19.25"
      />
    </svg>
  )
}

export function MinIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M18.25 12L5.75 12"
      />
    </svg>
  )
}

export function MoonIcon() {
  return (
    <svg
      className="w-full"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.228 7.9439C10.5176 8.82869 7.75757 12.1054 7.75757 15.9987C7.75757 20.5716 11.5618 24.2919 16.2367 24.2919C19.2323 24.2919 21.9337 22.7699 23.4514 20.3585C23.2779 20.3676 23.1033 20.3722 22.9287 20.3722C17.7826 20.3722 13.5951 16.2772 13.5951 11.2435C13.5951 10.1032 13.8108 8.98914 14.228 7.9439M16.2367 26.4993C10.3171 26.4993 5.50037 21.7899 5.50037 15.9987C5.50037 10.2109 10.3171 5.49927 16.2367 5.49927C16.6598 5.49927 17.0501 5.72963 17.2435 6.09753C17.438 6.46428 17.4087 6.90668 17.1638 7.24363C16.3059 8.42297 15.8535 9.80631 15.8535 11.2435C15.8535 15.06 19.0272 18.1637 22.9287 18.1637C23.6483 18.1637 24.3573 18.0582 25.0359 17.8531C25.4378 17.7293 25.8785 17.8359 26.1738 18.1304C26.4715 18.425 26.5758 18.8559 26.4446 19.2467C25.0019 23.5847 20.9 26.4993 16.2367 26.4993"
        fill="currentColor"
      />
    </svg>
  )
}

export function MugIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="M7.25 6.75h-.5a2 2 0 00-2 2v2.5a2 2 0 002 2h.5M19.25 4.75H7.75v9.5a2 2 0 002 2h7.5a2 2 0 002-2v-9.5zM19.25 19.25H4.75"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PartyIcon({size = 24}: {size?: number}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="m8.89 9.281-4.017 8.513c-.427.834.426 1.744 1.287 1.373l8.442-2.98"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.32 10.977c1.64 1.893 2.378 4.108 1.65 4.949-.73.84-2.65-.011-4.29-1.903-1.64-1.893-2.378-4.108-1.65-4.949.73-.84 2.65.011 4.29 1.903ZM9.5 17.637c-.597-.382-1.227-.93-1.82-1.614-.39-.45-.73-.92-1.01-1.384"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m15.75 9.25.129-.129a3 3 0 0 0 0-4.242l-.129-.129M17 13l.293-.293a1 1 0 0 1 1.414 0L19 13"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PauseIcon({size = 24}: {size?: number}) {
  return (
    <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M15.25 6.75V17.25"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M8.75 6.75V17.25"
      />
    </svg>
  )
}

export function PlayIcon() {
  return (
    <svg
      width="75"
      height="75"
      viewBox="0 0 75 75"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="37.4883" cy="37.8254" r="37" fill="white" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M35.2643 33.025L41.0017 36.9265C41.6519 37.369 41.6499 38.3118 40.9991 38.7518L35.2616 42.6276C34.5113 43.1349 33.4883 42.6077 33.4883 41.7143V33.9364C33.4883 33.0411 34.5146 32.5151 35.2643 33.025"
        fill="#030404"
      />
    </svg>
  )
}

export function PlusIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12 5.75V18.25"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M18.25 12L5.75 12"
      />
    </svg>
  )
}

export function RocketIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="M13.456 6.855a8 8 0 015.408-2.105h.386v.386a8 8 0 01-2.105 5.408l-6.15 6.704-4.243-4.243 6.704-6.15zM7.25 16.75l-2.5 2.5M9.25 18.75l-.5.5M5.25 14.75l-.5.5M13 19.25L14.24 14 11 17.25l2 2zM6.75 13L10 9.75l-5.25 1 2 2.25z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function RssIcon({
  size = 24,
  title = 'RSS',
  className,
}: {
  size?: number
  title?: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      className={className}
    >
      <title>{title}</title>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.33465 15.52C6.23018 15.52 5.33459 16.4153 5.33459 17.5199C5.33459 18.6244 6.23018 19.5201 7.33465 19.5201C8.43912 19.5201 9.33471 18.6244 9.33471 17.5199C9.33471 16.4153 8.43912 15.52 7.33465 15.52Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.33472 10.52V13.0919C8.87972 13.0919 11.7639 15.9753 11.7639 19.5202H14.3347C14.3347 14.5577 10.2973 10.52 5.33472 10.52Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.33472 5.52002V8.18702C11.5846 8.18702 16.6688 13.2701 16.6688 19.52H19.3347C19.3347 11.8001 13.0546 5.52002 5.33472 5.52002Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.75068 11.3405C1.65161 9.23359 1.65161 5.80439 3.75068 3.69748C4.76756 2.67681 6.11976 2.11292 7.55689 2.11292C8.99619 2.11292 10.3484 2.67681 11.3653 3.69748C13.4622 5.80439 13.4622 9.23359 11.3653 11.3405C9.2662 13.4452 5.84975 13.4452 3.75068 11.3405ZM18 16.4548L13.595 12.0333C15.7986 9.06529 15.5874 4.8471 12.9047 2.15226C10.0479 -0.715235 5.06587 -0.719606 2.21121 2.15226C-0.737072 5.10937 -0.737072 9.9286 2.21121 12.8857C3.68536 14.3654 5.62112 15.1041 7.55906 15.1041C9.14861 15.1041 10.7229 14.5752 12.0555 13.5785L16.4605 18L18 16.4548Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function SpinnerIcon({
  size = 24,
  ...svgProps
}: {size?: number} & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      {...svgProps}
    >
      <circle
        className="opacity-25"
        cx={12}
        cy={12}
        r={10}
        stroke="currentColor"
        strokeWidth={4}
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export function SpotifyIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.81041 8.76871C10.2023 7.77533 15.3362 8.08921 18.5284 9.95221C19.3463 10.4236 19.0245 11.6166 18.1549 11.6166L18.1538 11.6161C17.9648 11.6161 17.8489 11.5694 17.6852 11.4749C15.1028 9.93252 10.4819 9.56239 7.49273 10.3977C7.3611 10.4337 7.19741 10.4916 7.02416 10.4916C6.54435 10.4916 6.17873 10.1165 6.17873 9.63496C6.17873 9.14221 6.48416 8.86321 6.81041 8.76871M17.0305 14.3819C16.9461 14.3594 16.9703 14.4336 16.5827 14.23C14.3142 12.8873 10.933 12.3456 7.9236 13.163C7.74979 13.2102 7.65529 13.2569 7.49216 13.2569C6.68835 13.2569 6.47573 12.0492 7.35098 11.8023C10.888 10.8083 14.682 11.3883 17.3235 12.9593C17.6177 13.1337 17.7342 13.3593 17.7342 13.6743C17.7302 14.0658 17.4254 14.3819 17.0305 14.3819M16.0534 16.7618V16.763C15.4476 16.763 13.5362 14.6418 8.16323 15.7426C8.02148 15.7797 7.83585 15.8371 7.73123 15.8371C7.04498 15.8371 6.91391 14.8105 7.65135 14.6536C10.6236 13.9977 13.6617 14.0551 16.252 15.6048C16.8702 15.9991 16.6075 16.7618 16.0534 16.7618M12.3994 21.52C17.3674 21.52 21.3994 17.488 21.3994 12.52C21.3994 7.55202 17.3674 3.52002 12.3994 3.52002C7.43141 3.52002 3.39941 7.55202 3.39941 12.52C3.39941 17.488 7.43141 21.52 12.3994 21.52"
        fill="currentColor"
      />
    </svg>
  )
}

export function SquareIcon({size = 24}: {size?: number}) {
  return (
    <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24">
      <rect
        width="12.5"
        height="12.5"
        x="5.75"
        y="5.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        rx="1"
      />
    </svg>
  )
}

export function SunIcon() {
  return (
    <svg
      className="w-full"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.0003 21.4194C13.0123 21.4194 10.5813 18.9874 10.5813 15.9994C10.5813 13.0114 13.0123 10.5804 16.0003 10.5804C18.9883 10.5804 21.4193 13.0114 21.4193 15.9994C21.4193 18.9874 18.9883 21.4194 16.0003 21.4194M16.0003 8.64136C11.9423 8.64136 8.64233 11.9414 8.64233 15.9994C8.64233 20.0574 11.9423 23.3574 16.0003 23.3574C20.0573 23.3574 23.3583 20.0574 23.3583 15.9994C23.3583 11.9414 20.0573 8.64136 16.0003 8.64136"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.0004 7.08447C16.5364 7.08447 16.9704 6.64946 16.9704 6.11446V3.34546C16.9704 2.81046 16.5364 2.37646 16.0004 2.37646C15.4644 2.37646 15.0304 2.81046 15.0304 3.34546V6.11446C15.0304 6.64946 15.4644 7.08447 16.0004 7.08447"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.11559 15.0298H3.34559C2.81059 15.0298 2.37659 15.4648 2.37659 15.9998C2.37659 16.5348 2.81059 16.9688 3.34559 16.9688H6.11559C6.65159 16.9688 7.08459 16.5348 7.08459 15.9998C7.08459 15.4648 6.65159 15.0298 6.11559 15.0298"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.0004 24.9146C15.4644 24.9146 15.0304 25.3496 15.0304 25.8846V28.6536C15.0304 29.1886 15.4644 29.6236 16.0004 29.6236C16.5364 29.6236 16.9704 29.1886 16.9704 28.6536V25.8846C16.9704 25.3496 16.5364 24.9146 16.0004 24.9146"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M28.6542 15.0298H25.8842C25.3492 15.0298 24.9152 15.4648 24.9152 15.9998C24.9152 16.5348 25.3492 16.9688 25.8842 16.9688H28.6542C29.1902 16.9688 29.6242 16.5348 29.6242 15.9998C29.6242 15.4648 29.1902 15.0298 28.6542 15.0298"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22.9896 9.97995C23.2376 9.97995 23.4856 9.88495 23.6756 9.69595L24.7036 8.66795C25.0816 8.28995 25.0816 7.67495 24.7036 7.29595C24.3246 6.91795 23.7106 6.91795 23.3316 7.29595L22.3036 8.32495C21.9256 8.70295 21.9256 9.31695 22.3036 9.69595C22.4926 9.88495 22.7416 9.97995 22.9896 9.97995"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.32507 9.69593C8.51407 9.88493 8.76207 9.97993 9.01107 9.97993C9.25907 9.97993 9.50707 9.88493 9.69607 9.69593C10.0751 9.31693 10.0751 8.70293 9.69607 8.32493L8.66807 7.29693C8.28907 6.91893 7.67507 6.91893 7.29707 7.29693C6.91807 7.67493 6.91807 8.28993 7.29707 8.66793L8.32507 9.69593Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.32507 22.3043L7.29707 23.3313C6.91807 23.7093 6.91807 24.3243 7.29707 24.7023C7.48607 24.8923 7.73407 24.9873 7.98207 24.9873C8.23007 24.9873 8.47807 24.8923 8.66807 24.7023L9.69607 23.6753C10.0751 23.2973 10.0751 22.6833 9.69607 22.3043C9.31807 21.9253 8.70307 21.9253 8.32507 22.3043"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M23.6752 22.3043C23.2962 21.9253 22.6822 21.9253 22.3032 22.3043C21.9252 22.6833 21.9252 23.2973 22.3042 23.6753L23.3322 24.7023C23.5212 24.8923 23.7692 24.9873 24.0182 24.9873C24.2662 24.9873 24.5142 24.8923 24.7032 24.7023C25.0822 24.3243 25.0822 23.7093 24.7032 23.3313L23.6752 22.3043Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function TriangleIcon({size = 24}: {size?: number}) {
  return (
    <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M18.25 12L5.75 5.75V18.25L18.25 12Z"
      />
    </svg>
  )
}

export function TrophyIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="M7.75 4.75h8.5V11a4.25 4.25 0 01-8.5 0V4.75zM16.5 6.75h.104a2.646 2.646 0 01.904 5.133l-1.008.367M7.5 6.75h-.104a2.646 2.646 0 00-.904 5.133l1.008.367M12 15.5V19M8.75 19.25h6.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TwitchIcon({
  size = 24,
  title = 'Twitch',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <title>{title}</title>
      <path
        d="M18.25 4.75H5.75a1 1 0 00-1 1v9.5a1 1 0 001 1h2v3l3.25-3h6L19.25 14V5.75a1 1 0 00-1-1zM15.25 9.75v2.5M11.25 9.75v2.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TwitterIcon({
  size = 24,
  title = 'Twitter',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M22.46,6C21.69,6.35 20.86,6.58 20,6.69C20.88,6.16 21.56,5.32 21.88,4.31C21.05,4.81 20.13,5.16 19.16,5.36C18.37,4.5 17.26,4 16,4C13.65,4 11.73,5.92 11.73,8.29C11.73,8.63 11.77,8.96 11.84,9.27C8.28,9.09 5.11,7.38 3,4.79C2.63,5.42 2.42,6.16 2.42,6.94C2.42,8.43 3.17,9.75 4.33,10.5C3.62,10.5 2.96,10.3 2.38,10C2.38,10 2.38,10 2.38,10.03C2.38,12.11 3.86,13.85 5.82,14.24C5.46,14.34 5.08,14.39 4.69,14.39C4.42,14.39 4.15,14.36 3.89,14.31C4.43,16 6,17.26 7.89,17.29C6.43,18.45 4.58,19.13 2.56,19.13C2.22,19.13 1.88,19.11 1.54,19.07C3.44,20.29 5.7,21 8.12,21C16,21 20.33,14.46 20.33,8.79C20.33,8.6 20.33,8.42 20.32,8.23C21.16,7.63 21.88,6.87 22.46,6Z"
      />
    </svg>
  )
}

export function UsersIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M5.78168 19.25H13.2183C13.7828 19.25 14.227 18.7817 14.1145 18.2285C13.804 16.7012 12.7897 14 9.5 14C6.21031 14 5.19605 16.7012 4.88549 18.2285C4.773 18.7817 5.21718 19.25 5.78168 19.25Z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M15.75 14C17.8288 14 18.6802 16.1479 19.0239 17.696C19.2095 18.532 18.5333 19.25 17.6769 19.25H16.75"
      />
      <circle
        cx="9.5"
        cy="7.5"
        r="2.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M14.75 10.25C16.2688 10.25 17.25 9.01878 17.25 7.5C17.25 5.98122 16.2688 4.75 14.75 4.75"
      />
    </svg>
  )
}

export function YoutubeIcon({
  size = 24,
  title = 'YouTube',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.5,18.78 17.18,18.84C15.88,18.91 14.69,18.94 13.59,18.94L12,19C7.81,19 5.2,18.84 4.17,18.56C3.27,18.31 2.69,17.73 2.44,16.83C2.31,16.36 2.22,15.73 2.16,14.93C2.09,14.13 2.06,13.44 2.06,12.84L2,12C2,9.81 2.16,8.2 2.44,7.17C2.69,6.27 3.27,5.69 4.17,5.44C4.64,5.31 5.5,5.22 6.82,5.16C8.12,5.09 9.31,5.06 10.41,5.06L12,5C16.19,5 18.8,5.16 19.83,5.44C20.73,5.69 21.31,6.27 21.56,7.17Z"
      />
    </svg>
  )
}

export function RefreshIcon({
  size = 24,
  title = 'Refresh',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <title>{title}</title>
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M11.25 4.75 8.75 7l2.5 2.25M12.75 19.25l2.5-2.25-2.5-2.25"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.75 7h3.5a6 6 0 0 1 6 6v.25M14.25 17h-3.5a6 6 0 0 1-6-6v-.25"
      />
    </svg>
  )
}

export function AlarmIcon({
  size = 24,
  title = 'Alarm',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <title>{title}</title>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7 18L5.75 19.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17 18L18.25 19.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 8.75V12L14.25 14.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19.25 12C19.25 16.0041 16.0041 19.25 12 19.25C7.99594 19.25 4.75 16.0041 4.75 12C4.75 7.99594 7.99594 4.75 12 4.75C16.0041 4.75 19.25 7.99594 19.25 12Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18.75 4.75L19.25 5.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.25 4.75L4.75 5.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </svg>
  )
}
