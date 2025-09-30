"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.headers = void 0;
exports.loader = loader;
exports.default = RecordScreen;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var framer_motion_1 = require("framer-motion");
var arrow_button_tsx_1 = require("#app/components/arrow-button.tsx");
var button_tsx_1 = require("#app/components/button.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, calls, _c;
        var request = _b.request;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.getUser)(request)];
                case 1:
                    user = _d.sent();
                    if (!user) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma_server_ts_1.prisma.call.findMany({
                            where: { userId: user.id },
                            select: { id: true, title: true },
                        })];
                case 2:
                    _c = _d.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _c = [];
                    _d.label = 4;
                case 4:
                    calls = _c;
                    return [2 /*return*/, (0, node_1.json)({ calls: calls }, {
                            headers: {
                                'Cache-Control': 'private, max-age=3600',
                                Vary: 'Cookie',
                            },
                        })];
            }
        });
    });
}
exports.headers = misc_tsx_1.reuseUsefulLoaderHeaders;
function MaybeOutlet(_a) {
    var open = _a.open;
    return (<framer_motion_1.AnimatePresence>
			{open ? (<framer_motion_1.motion.div variants={{
                collapsed: {
                    height: 0,
                    marginTop: 0,
                    marginBottom: 0,
                    opacity: 0,
                },
                expanded: {
                    height: 'auto',
                    marginTop: '1rem',
                    marginBottom: '3rem',
                    opacity: 1,
                },
            }} initial="collapsed" animate="expanded" exit="collapsed" transition={{ duration: 0.15 }} className="relative col-span-full">
					<react_1.Outlet />
				</framer_motion_1.motion.div>) : null}
		</framer_motion_1.AnimatePresence>);
}
function Record(_a) {
    var active = _a.active, title = _a.title, slug = _a.slug;
    return (<grid_tsx_1.Grid nested className="border-b border-gray-200 dark:border-gray-600">
			<react_1.Link to={active ? './' : slug} className="text-primary group relative col-span-full flex flex-col py-5 text-xl font-medium focus:outline-none">
				<div className="bg-secondary absolute -inset-px -mx-6 hidden rounded-lg group-hover:block group-focus:block"/>
				<span className="relative">{title}</span>
			</react_1.Link>
			<div className="col-span-full">
				<MaybeOutlet open={active}/>
			</div>
		</grid_tsx_1.Grid>);
}
function RecordScreen() {
    var pathname = (0, react_1.useLocation)().pathname;
    var user = (0, use_root_data_ts_1.useRootData)().user;
    var data = (0, react_1.useLoaderData)();
    var activeSlug = pathname.split('/').slice(-1)[0];
    var calls = data.calls;
    return (<>
			<grid_tsx_1.Grid className="mb-10 mt-24 lg:mb-24">
				<arrow_button_tsx_1.BackLink to="/calls" className="col-span-full lg:col-span-8 lg:col-start-3">
					{"Back to overview"}
				</arrow_button_tsx_1.BackLink>
			</grid_tsx_1.Grid>

			<grid_tsx_1.Grid as="header" className="mb-12">
				<typography_tsx_1.H2 className="col-span-full lg:col-span-8 lg:col-start-3">
					{"Record your call, and I'll answer."}
				</typography_tsx_1.H2>
			</grid_tsx_1.Grid>

			{user ? null : (<grid_tsx_1.Grid>
					<div className="col-span-full lg:col-span-8 lg:col-start-3">
						<typography_tsx_1.Paragraph className="mb-4">{"Please login to have your questions answered."}</typography_tsx_1.Paragraph>
						<button_tsx_1.ButtonLink to="/login">Login (or sign up)</button_tsx_1.ButtonLink>
					</div>
				</grid_tsx_1.Grid>)}

			{user ? (<grid_tsx_1.Grid as="main">
					<div className="col-span-full lg:col-span-8 lg:col-start-3">
						<Record slug="./new" active={activeSlug === 'new'} title="Make a new recording"/>
					</div>

					{calls.length > 0 ? (<ul className="col-span-full lg:col-span-8 lg:col-start-3">
							{calls.map(function (call) { return (<li key={call.id}>
									<Record slug={"./".concat(call.id)} active={activeSlug === call.id} title={call.title}/>
								</li>); })}
						</ul>) : null}
				</grid_tsx_1.Grid>) : null}
		</>);
}
