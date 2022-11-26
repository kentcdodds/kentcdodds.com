const spacerSizes = {
  '3xs': 'h-6 lg:h-8',
  '2xs': 'h-10 lg:h-12',
  xs: 'h-20 lg:h-24',
  sm: 'h-32 lg:h-36',
  base: 'h-40 lg:h-48',
  lg: 'h-56 lg:h-64',
}

function Spacer({
  size,
  className = '',
}: {
  size: keyof typeof spacerSizes
  className?: string
}) {
  return <div className={`${className} ${spacerSizes[size]}`} />
}

export {Spacer}
