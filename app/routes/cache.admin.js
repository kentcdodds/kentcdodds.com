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
exports.loader = loader;
exports.action = action;
exports.default = CacheAdminRoute;
exports.ErrorBoundary = ErrorBoundary;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var tiny_invariant_1 = require("tiny-invariant");
var button_tsx_1 = require("#app/components/button.tsx");
var form_elements_tsx_1 = require("#app/components/form-elements.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var cache_server_ts_1 = require("#app/utils/cache.server.ts");
var litefs_js_server_ts_1 = require("#app/utils/litefs-js.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var session_server_ts_1 = require("#app/utils/session.server.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var searchParams, query, limit, currentInstanceInfo, instance, instances, cacheKeys;
        var _c, _d;
        var request = _b.request;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireAdminUser)(request)];
                case 1:
                    _e.sent();
                    searchParams = new URL(request.url).searchParams;
                    query = searchParams.get('query');
                    limit = Number((_c = searchParams.get('limit')) !== null && _c !== void 0 ? _c : 100);
                    return [4 /*yield*/, (0, litefs_js_server_ts_1.getInstanceInfo)()];
                case 2:
                    currentInstanceInfo = _e.sent();
                    instance = (_d = searchParams.get('instance')) !== null && _d !== void 0 ? _d : currentInstanceInfo.currentInstance;
                    return [4 /*yield*/, (0, litefs_js_server_ts_1.getAllInstances)()];
                case 3:
                    instances = _e.sent();
                    return [4 /*yield*/, (0, litefs_js_server_ts_1.ensureInstance)(instance)];
                case 4:
                    _e.sent();
                    if (!(typeof query === 'string')) return [3 /*break*/, 6];
                    return [4 /*yield*/, (0, cache_server_ts_1.searchCacheKeys)(query, limit)];
                case 5:
                    cacheKeys = _e.sent();
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, (0, cache_server_ts_1.getAllCacheKeys)(limit)];
                case 7:
                    cacheKeys = _e.sent();
                    _e.label = 8;
                case 8: return [2 /*return*/, (0, node_1.json)({ cacheKeys: cacheKeys, instance: instance, instances: instances, currentInstanceInfo: currentInstanceInfo })];
            }
        });
    });
}
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var formData, key, currentInstance, instance, type, _c;
        var _d;
        var request = _b.request;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireAdminUser)(request)];
                case 1:
                    _e.sent();
                    return [4 /*yield*/, request.formData()];
                case 2:
                    formData = _e.sent();
                    key = formData.get('cacheKey');
                    return [4 /*yield*/, (0, litefs_js_server_ts_1.getInstanceInfo)()];
                case 3:
                    currentInstance = (_e.sent()).currentInstance;
                    instance = (_d = formData.get('instance')) !== null && _d !== void 0 ? _d : currentInstance;
                    type = formData.get('type');
                    (0, tiny_invariant_1.default)(typeof key === 'string', 'cacheKey must be a string');
                    (0, tiny_invariant_1.default)(typeof type === 'string', 'type must be a string');
                    (0, tiny_invariant_1.default)(typeof instance === 'string', 'instance must be a string');
                    return [4 /*yield*/, (0, litefs_js_server_ts_1.ensureInstance)(instance)];
                case 4:
                    _e.sent();
                    _c = type;
                    switch (_c) {
                        case 'sqlite': return [3 /*break*/, 5];
                        case 'lru': return [3 /*break*/, 7];
                    }
                    return [3 /*break*/, 8];
                case 5: return [4 /*yield*/, cache_server_ts_1.cache.delete(key)];
                case 6:
                    _e.sent();
                    return [3 /*break*/, 9];
                case 7:
                    {
                        cache_server_ts_1.lruCache.delete(key);
                        return [3 /*break*/, 9];
                    }
                    _e.label = 8;
                case 8:
                    {
                        throw new Error("Unknown cache type: ".concat(type));
                    }
                    _e.label = 9;
                case 9: return [2 /*return*/, (0, node_1.json)({ success: true })];
            }
        });
    });
}
function CacheAdminRoute() {
    var _a, _b, _c;
    var data = (0, react_1.useLoaderData)();
    var searchParams = (0, react_1.useSearchParams)()[0];
    var submit = (0, react_1.useSubmit)();
    var query = (_a = searchParams.get('query')) !== null && _a !== void 0 ? _a : '';
    var limit = (_b = searchParams.get('limit')) !== null && _b !== void 0 ? _b : '100';
    var instance = (_c = searchParams.get('instance')) !== null && _c !== void 0 ? _c : data.instance;
    var handleFormChange = (0, misc_tsx_1.useDebounce)(function (form) {
        submit(form);
    }, 400);
    return (<div className="mx-10vw">
			<typography_tsx_1.H2 className="mt-3">Cache Admin</typography_tsx_1.H2>
			<spacer_tsx_1.Spacer size="2xs"/>
			<react_1.Form method="get" className="flex flex-col gap-4" onChange={function (e) { return handleFormChange(e.currentTarget); }}>
				<div className="flex-1">
					<div className="relative flex-1">
						<button type="submit" className="absolute left-6 top-0 flex h-full items-center justify-center border-none bg-transparent p-0 text-slate-500">
							<icons_tsx_1.SearchIcon />
						</button>
						<input type="search" defaultValue={query} name="query" placeholder="Filter Cache Keys" className="text-primary bg-primary border-secondary focus:bg-secondary w-full rounded-full border py-6 pl-14 pr-6 text-lg font-medium hover:border-team-current focus:border-team-current focus:outline-none md:pr-24"/>
						<div className="absolute right-2 top-0 flex h-full w-14 items-center justify-between text-lg font-medium text-slate-500">
							<span title="Total results shown">
								{data.cacheKeys.sqlite.length + data.cacheKeys.lru.length}
							</span>
						</div>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-4">
					<form_elements_tsx_1.Field label="Limit" name="limit" defaultValue={limit} type="number" step="1" min="1" max="10000" placeholder="results limit"/>
					<form_elements_tsx_1.FieldContainer label="Instance" id="instance">
						{function (_a) {
            var inputProps = _a.inputProps;
            return (<select {...inputProps} name="instance" defaultValue={instance} className={form_elements_tsx_1.inputClassName}>
								{Object.entries(data.instances).map(function (_a) {
                    var inst = _a[0], region = _a[1];
                    return (<option key={inst} value={inst}>
										{[
                            inst,
                            "(".concat(region, ")"),
                            inst === data.currentInstanceInfo.currentInstance
                                ? '(current)'
                                : '',
                            inst === data.currentInstanceInfo.primaryInstance
                                ? ' (primary)'
                                : '',
                        ]
                            .filter(Boolean)
                            .join(' ')}
									</option>);
                })}
							</select>);
        }}
					</form_elements_tsx_1.FieldContainer>
				</div>
			</react_1.Form>
			<spacer_tsx_1.Spacer size="2xs"/>
			<div className="flex flex-col gap-4">
				<typography_tsx_1.H3>LRU Cache:</typography_tsx_1.H3>
				{data.cacheKeys.lru.map(function (key) { return (<CacheKeyRow key={key} cacheKey={key} instance={instance} type="lru"/>); })}
			</div>
			<spacer_tsx_1.Spacer size="3xs"/>
			<div className="flex flex-col gap-4">
				<typography_tsx_1.H3>SQLite Cache:</typography_tsx_1.H3>
				{data.cacheKeys.sqlite.map(function (key) { return (<CacheKeyRow key={key} cacheKey={key} instance={instance} type="sqlite"/>); })}
			</div>
		</div>);
}
function CacheKeyRow(_a) {
    var cacheKey = _a.cacheKey, instance = _a.instance, type = _a.type;
    var fetcher = (0, react_1.useFetcher)();
    var dc = (0, misc_tsx_1.useDoubleCheck)();
    return (<div className="flex items-center gap-2 font-mono">
			<fetcher.Form method="POST">
				<input type="hidden" name="cacheKey" value={cacheKey}/>
				<input type="hidden" name="instance" value={instance}/>
				<input type="hidden" name="type" value={type}/>
				<button_tsx_1.Button size="small" variant="danger" {...dc.getButtonProps({ type: 'submit' })}>
					{fetcher.state === 'idle'
            ? dc.doubleCheck
                ? 'You sure?'
                : 'Delete'
            : 'Deleting...'}
				</button_tsx_1.Button>
			</fetcher.Form>
			<a href={"/resources/cache/".concat(type, "/").concat(encodeURIComponent(cacheKey), "?instance=").concat(instance)}>
				{cacheKey}
			</a>
		</div>);
}
function ErrorBoundary() {
    var error = (0, misc_tsx_1.useCapturedRouteError)();
    console.error(error);
    if (error instanceof Error) {
        return <div>An unexpected error occurred: {error.message}</div>;
    }
    else {
        return <div>Unknown error</div>;
    }
}
