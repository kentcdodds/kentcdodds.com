import { clsx } from 'clsx'
import { ArrowLink } from '../arrow-button.tsx'
import { Grid } from '../grid.tsx'
import { H2 } from '../typography.tsx'

interface HeaderSectionProps {
	ctaUrl?: string
	cta?: string
	as?: React.ElementType
	title: string
	subTitle: string
	className?: string
}

function HeaderSection({
	ctaUrl,
	cta,
	title,
	subTitle,
	className,
	as,
}: HeaderSectionProps) {
	return (
		<Grid as={as}>
			<div
				className={clsx(
					'col-span-full flex flex-col space-y-10 lg:flex-row lg:items-end lg:justify-between lg:space-y-0',
					className,
				)}
			>
				<div className="space-y-2 lg:space-y-0">
					<H2>{title}</H2>
					<H2 variant="secondary" as="p">
						{subTitle}
					</H2>
				</div>

				{cta && ctaUrl ? (
					<ArrowLink to={ctaUrl} direction="right">
						{cta}
					</ArrowLink>
				) : null}
			</div>
		</Grid>
	)
}

export { HeaderSection }
