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
exports.default = SearchRoute;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var grid_tsx_1 = require("#app/components/grid.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var search_server_ts_1 = require("#app/utils/search.server.ts");
function itemsToSegmentedItems(items) {
    var init = [];
    return items.reduce(function (segmentedResults, item) {
        var listItem = { route: item.route, title: item.title };
        var segment = segmentedResults.find(function (s) { return s.name === item.segment; });
        if (segment) {
            segment.items.push(listItem);
        }
        else {
            segmentedResults.push({ name: item.segment, items: [listItem] });
        }
        return segmentedResults;
    }, init);
}
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var query, results, data, winner;
        var request = _b.request, params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    query = params.query;
                    if (typeof query !== 'string' || !query)
                        return [2 /*return*/, (0, node_1.redirect)('/')];
                    return [4 /*yield*/, (0, search_server_ts_1.searchKCD)({ request: request, query: query })];
                case 1:
                    results = _c.sent();
                    if (results.length > 1) {
                        data = {
                            total: results.length,
                            segments: itemsToSegmentedItems(results),
                        };
                        return [2 /*return*/, (0, node_1.json)(data)];
                    }
                    winner = results[0];
                    if (results.length === 1 && winner) {
                        return [2 /*return*/, (0, node_1.redirect)(winner.route)];
                    }
                    else {
                        return [2 /*return*/, (0, node_1.json)({ total: 0, segments: [] })];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function SearchRoute() {
    var query = (0, react_1.useParams)().query;
    var data = (0, react_1.useLoaderData)();
    return (<div>
			{data.total > 0 ? (<hero_section_tsx_1.HeroSection title="Multiple matches found" subtitle="Try something a bit more specific next time." arrowUrl="#results" arrowLabel={"".concat(data.total, " Results")} imageBuilder={images_tsx_1.images.kodyProfileGray}/>) : (<hero_section_tsx_1.HeroSection title="No matches found" subtitle="Try being less specific." imageBuilder={images_tsx_1.images.kodyProfileGray}/>)}
			<grid_tsx_1.Grid as="main">
				<div className="col-span-full" id="results">
					<typography_tsx_1.H3>{data.total} Results</typography_tsx_1.H3>
					<typography_tsx_1.H4 as="p" variant="secondary">{"For the query: \"".concat(query, "\"")}</typography_tsx_1.H4>
					<spacer_tsx_1.Spacer size="2xs"/>
					{data.segments.map(function (_a) {
            var items = _a.items, name = _a.name;
            return (<div key={name}>
							<typography_tsx_1.H4 className="mb-3">{name}</typography_tsx_1.H4>
							<ul className="list-inside list-disc">
								{items.map(function (i) { return (<li key={i.route} className="leading-loose">
										<react_1.Link to={i.route}>{i.title}</react_1.Link>
									</li>); })}
							</ul>
							<spacer_tsx_1.Spacer size="3xs"/>
						</div>);
        })}
				</div>
			</grid_tsx_1.Grid>
		</div>);
}
