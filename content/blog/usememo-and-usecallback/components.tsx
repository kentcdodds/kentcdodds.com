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
			<h2 className="candy-dispenser-title">Candy Dispenser</h2>

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
					disabled={isWrong}
				>
					useCallback
				</button>
			</div>

			{isRight ? (
				<div
					className="usememo-and-usecallback-poll-feedback"
					data-variant="right"
					role="status"
				>
					You are correct! <span aria-hidden="true">🥳</span>
				</div>
			) : isWrong ? (
				<div
					className="usememo-and-usecallback-poll-feedback"
					data-variant="wrong"
					role="status"
				>
					Sorry, wrong answer. Try again.
				</div>
			) : (
				<div className="usememo-and-usecallback-poll-feedback" role="status">
					Pick one.
				</div>
			)}
		</div>
	)
}

export { CandyDispenser, Poll }
