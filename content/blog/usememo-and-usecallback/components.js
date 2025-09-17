"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandyDispenser = CandyDispenser;
exports.Poll = Poll;
var React = require("react");
function CandyDispenser() {
    var initialCandies = ['snickers', 'skittles', 'twix', 'milky way'];
    var _a = React.useState(initialCandies), candies = _a[0], setCandies = _a[1];
    function dispense(candy) {
        setCandies(function (allCandies) { return allCandies.filter(function (c) { return c !== candy; }); });
    }
    return (<div>
			<h1>Candy Dispenser</h1>
			<div>
				<div>Available Candy</div>
				{candies.length === 0 ? (<button onClick={function () { return setCandies(initialCandies); }}>refill</button>) : (<ul>
						{candies.map(function (candy) { return (<li key={candy}>
								<button onClick={function () { return dispense(candy); }}>grab</button> {candy}
							</li>); })}
					</ul>)}
			</div>
		</div>);
}
function Poll() {
    var _a = React.useState(null), answer = _a[0], setAnswer = _a[1];
    var isWrong = answer === 'useCallback';
    var isRight = answer === 'original';
    return (<div style={{ margin: '20px 0 50px 0' }}>
			{isRight ? (<div>You are correct! 🥳</div>) : (<div>
					<div style={{ marginBottom: 10 }}>
						<button onClick={function () { return setAnswer('original'); }}>original</button>
					</div>
					<div>
						<button onClick={function () { return setAnswer('useCallback'); }} disabled={isWrong}>
							useCallback
						</button>
					</div>
					{answer === 'useCallback' ? (<div>Sorry, wrong answer. Try again</div>) : null}
				</div>)}
		</div>);
}
