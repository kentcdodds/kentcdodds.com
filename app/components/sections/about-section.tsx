import { ArrowLink } from '../arrow-button.tsx'
import { Grid } from '../grid.tsx'
import { H2, Paragraph } from '../typography.tsx'
import { getImgProps, images } from '~/images.tsx'

function AboutSection() {
	return (
		<Grid>
			<div className="col-span-full table lg:col-span-6">
				<div className="table-cell text-center align-middle">
					<div>
						<img
							loading="lazy"
							{...getImgProps(images.kentSnowSports, {
								className: 'rounded-lg object-cover w-full h-full',
								widths: [300, 650, 1300, 1800, 2600],
								sizes: [
									'(max-width: 1023px) 80vw',
									'(min-width:1024px) and (max-width:1620px) 40vw',
									'630px',
								],
								transformations: {
									resize: {
										type: 'fill',
										aspectRatio: '3:4',
									},
								},
							})}
						/>
					</div>
				</div>
			</div>

			<div className="col-span-full flex flex-col justify-center lg:col-span-4 lg:col-start-8 lg:mt-0">
				<img
					{...getImgProps(images.snowboard, {
						className: 'mt-20 w-full h-full object-contain self-start lg:mt-0',
						widths: [300, 600, 850, 1600, 2550],
						sizes: ['(min-width:1024px) and (max-width:1620px) 25vw', '410px'],
					})}
				/>

				<H2 className="mt-12">{`Big extreme sports enthusiast.`}</H2>
				<H2 className="mt-2" variant="secondary" as="p">
					{`With a big heart for helping people.`}
				</H2>

				<Paragraph className="mt-8">
					{`
            I'm a JavaScript engineer and teacher and I'm active in the open
            source community. And I'm also a husband, father, and an extreme
            sports and sustainability enthusiast.
          `}
				</Paragraph>

				<ArrowLink
					to="/about"
					direction="right"
					className="mt-14"
					prefetch="intent"
				>
					Learn more about me
				</ArrowLink>
			</div>
		</Grid>
	)
}

export { AboutSection }
