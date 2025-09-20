"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamStats = TeamStats;
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var framer_motion_1 = require("framer-motion");
var React = require("react");
var images_tsx_1 = require("#app/images.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var team_provider_tsx_1 = require("#app/utils/team-provider.tsx");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
var barColors = {
    RED: 'bg-team-red',
    YELLOW: 'bg-team-yellow',
    BLUE: 'bg-team-blue',
};
function Stat(_a) {
    var totalReads = _a.totalReads, team = _a.team, percent = _a.percent, ranking = _a.ranking, direction = _a.direction, display = _a.display, onClick = _a.onClick;
    var userInfo = (0, use_root_data_ts_1.useRootData)().userInfo;
    var currentTeam = (0, team_provider_tsx_1.useTeam)()[0];
    var avatar = userInfo
        ? userInfo.avatar
        : images_tsx_1.kodyProfiles[(0, misc_tsx_1.getOptionalTeam)(team)];
    var isUsersTeam = team === currentTeam;
    var MotionEl = onClick ? framer_motion_1.motion.button : framer_motion_1.motion.div;
    var shouldReduceMotion = (0, framer_motion_1.useReducedMotion)();
    var transition = shouldReduceMotion ? { duration: 0 } : {};
    return (<MotionEl tabIndex={0} onClick={onClick} title={display === 'ranking'
            ? "Rank of the ".concat(team.toLowerCase(), " team")
            : "Total reads by the ".concat(team.toLowerCase(), " team")} initial="initial" whileHover="hover" whileFocus="hover" className="relative flex origin-right items-center justify-center focus:outline-none" transition={transition} variants={{
            initial: { width: 22 },
        }}>
			<framer_motion_1.motion.div transition={transition} variants={{
            initial: {
                height: 12 + 24 * percent,
                width: 16,
                y: direction === 'up' ? '-100%' : 0,
            },
            hover: { height: 48, width: 24 },
        }} className={(0, clsx_1.clsx)('relative flex justify-center', {
            'rounded-t-md': direction === 'up',
            'rounded-b-md': direction === 'down',
        }, barColors[team])}>
				<framer_motion_1.motion.span transition={transition} variants={{
            initial: { opacity: 0, scale: 1, y: 0, fontSize: 0 },
            hover: {
                opacity: 1,
                scale: 1,
                y: direction === 'up' ? '-100%' : '100%',
                fontSize: '18px',
            },
        }} className={(0, clsx_1.clsx)('text-primary absolute text-lg font-medium', {
            'bottom-0': direction === 'down',
            'top-0': direction === 'up',
        })}>
					{(0, misc_tsx_1.formatNumber)(display === 'ranking' ? ranking : totalReads)}
				</framer_motion_1.motion.span>
			</framer_motion_1.motion.div>

			{isUsersTeam ? (<framer_motion_1.motion.div className="absolute left-1/2 top-0 rounded-md border-team-current" transition={transition} variants={{
                initial: {
                    width: 22,
                    height: 22,
                    x: '-50%',
                    y: direction === 'up' ? 4 : -26,
                    borderWidth: 2,
                    borderRadius: 4,
                },
                hover: {
                    width: 36,
                    height: 36,
                    x: '-50%',
                    y: direction === 'up' ? 6 : -42,
                    borderWidth: 3,
                    borderRadius: 8,
                },
            }}>
					<framer_motion_1.motion.img transition={transition} variants={{
                initial: { borderWidth: 2, borderRadius: 4 - 2 },
                hover: { borderWidth: 4, borderRadius: 8 - 3 },
            }} className="h-full w-full border-white object-cover dark:border-gray-900" src={avatar.src} alt={avatar.alt}/>
				</framer_motion_1.motion.div>) : null}
		</MotionEl>);
}
function TeamStats(_a) {
    var totalReads = _a.totalReads, rankings = _a.rankings, direction = _a.direction, pull = _a.pull, onStatClick = _a.onStatClick;
    var optionalUser = (0, use_root_data_ts_1.useOptionalUser)();
    var _b = React.useState(false), altDown = _b[0], setAltDown = _b[1];
    var team = (0, team_provider_tsx_1.useTeam)()[0];
    React.useEffect(function () {
        var set = function (e) { return setAltDown(e.altKey); };
        document.addEventListener('keydown', set);
        document.addEventListener('keyup', set);
        return function () {
            document.removeEventListener('keyup', set);
            document.removeEventListener('keydown', set);
        };
    }, []);
    var loginLink = optionalUser ? null : (<div className={(0, clsx_1.clsx)('text-center', {
            'mb-2': direction === 'down',
            'mt-2': direction === 'up',
        })}>
			<react_1.Link to="/login" className="underlined">
				Login
			</react_1.Link>
		</div>);
    return (<div className={(0, clsx_1.clsx)('group relative inline-flex h-8 flex-col justify-end', "set-color-team-current-".concat(team.toLowerCase()), {
            'justify-end': direction === 'down',
            'justify-start': direction === 'up',
        })}>
			<div className={(0, clsx_1.clsx)('absolute flex h-8 items-center gap-2 text-sm opacity-0 transition focus-within:opacity-100 group-hover:opacity-100', {
            'right-0': pull === 'right',
            'left-0': pull === 'left',
            '-top-9': direction === 'down',
            '-bottom-20': !loginLink && direction === 'up',
            '-bottom-9': loginLink && direction === 'up',
        })}>
				<span title="Total reads" className="text-primary">
					{totalReads}{' '}
				</span>
				<react_1.Link className="text-secondary underlined hover:text-team-current focus:text-team-current" to="/teams#read-rankings">
					{"what's this?"}
				</react_1.Link>
			</div>
			{direction === 'down' ? loginLink : null}
			<ul className={(0, clsx_1.clsx)('relative flex h-0 overflow-visible border-team-current px-4', {
            'border-t': direction === 'down',
            'border-b': direction === 'up',
        })}>
				{rankings.map(function (ranking) { return (<li key={ranking.team} className="h-0 overflow-visible">
						<Stat 
        // trigger a re-render if the percentage changes
        key={ranking.percent} {...ranking} direction={direction} display={altDown ? 'reads' : 'ranking'} onClick={onStatClick ? function () { return onStatClick(ranking.team); } : undefined}/>
					</li>); })}
			</ul>
			{direction === 'up' ? loginLink : null}
		</div>);
}
