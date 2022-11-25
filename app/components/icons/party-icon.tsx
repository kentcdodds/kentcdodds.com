function PartyIcon({size = 24}: {size?: number}) {
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

export {PartyIcon}
