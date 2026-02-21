import * as React from 'react'

function CandyDispenser() {
	const initialCandies = ['snickers', 'skittles', 'twix', 'milky way']
	const [candies, setCandies] = React.useState(initialCandies)
	function dispense(candy: string) {
		setCandies((allCandies) => allCandies.filter((c) => c !== candy))
	}
	const isEmpty = candies.length === 0
	return (
		<div className="candy-dispenser">
			<h3 className="candy-dispenser-title">Candy Dispenser</h3>

			<div className="candy-dispenser-section-title">Available candy</div>

			{isEmpty ? (
				<div className="candy-dispenser-empty">
					<div className="candy-dispenser-empty-message">Out of candy</div>
					<button
						type="button"
						className="candy-dispenser-button candy-dispenser-refill"
						onClick={() => setCandies(initialCandies)}
					>
						Refill
					</button>
				</div>
			) : (
				<ul className="candy-dispenser-list">
					{candies.map((candy) => (
						<li key={candy} className="candy-dispenser-item">
							<button
								type="button"
								className="candy-dispenser-button"
								onClick={() => dispense(candy)}
							>
								grab
							</button>
							<span className="candy-dispenser-candy-name">{candy}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

function Poll() {
	const [answer, setAnswer] = React.useState<'useCallback' | 'original' | null>(
		null,
	)
	const isWrong = answer === 'useCallback'
	const isRight = answer === 'original'
	const feedbackVariant = isRight ? 'right' : isWrong ? 'wrong' : undefined
	const feedbackMessage = isRight ? (
		<>
			You are correct! <span aria-hidden="true">🥳</span>
		</>
	) : isWrong ? (
		'Sorry, wrong answer. Try again.'
	) : (
		'Pick one.'
	)
	return (
		<div className="usememo-and-usecallback-poll">
			<div className="usememo-and-usecallback-poll-options">
				<button
					type="button"
					className="usememo-and-usecallback-poll-button"
					onClick={() => setAnswer('original')}
					disabled={isRight}
				>
					original
				</button>
				<button
					type="button"
					className="usememo-and-usecallback-poll-button"
					onClick={() => setAnswer('useCallback')}
					disabled={isWrong || isRight}
				>
					useCallback
				</button>
			</div>

			<div
				className="usememo-and-usecallback-poll-feedback"
				data-variant={feedbackVariant}
				role="status"
			>
				{feedbackMessage}
			</div>
		</div>
	)
}

export { CandyDispenser, Poll }
