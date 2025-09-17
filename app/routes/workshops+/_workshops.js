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
exports.useWorkshopsData = exports.headers = exports.handle = void 0;
exports.loader = loader;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var providers_tsx_1 = require("#app/utils/providers.tsx");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
var workshop_tickets_server_ts_1 = require("#app/utils/workshop-tickets.server.ts");
var workshops_server_ts_1 = require("#app/utils/workshops.server.ts");
exports.handle = {
    id: 'workshops',
};
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, _c, workshops, workshopEvents, tags, _i, workshops_1, workshop, _d, _e, category, headers;
        var request = _b.request;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    timings = {};
                    return [4 /*yield*/, Promise.all([
                            (0, workshops_server_ts_1.getWorkshops)({ request: request, timings: timings }),
                            (0, workshop_tickets_server_ts_1.getScheduledEvents)({ request: request, timings: timings }),
                        ])];
                case 1:
                    _c = _f.sent(), workshops = _c[0], workshopEvents = _c[1];
                    tags = new Set();
                    for (_i = 0, workshops_1 = workshops; _i < workshops_1.length; _i++) {
                        workshop = workshops_1[_i];
                        for (_d = 0, _e = workshop.categories; _d < _e.length; _d++) {
                            category = _e[_d];
                            tags.add(category);
                        }
                    }
                    headers = {
                        'Cache-Control': 'public, max-age=3600',
                        Vary: 'Cookie',
                        'Server-Timing': (0, timing_server_ts_1.getServerTimeHeader)(timings),
                    };
                    return [2 /*return*/, (0, node_1.json)({
                            workshops: workshops.filter(misc_tsx_1.typedBoolean),
                            workshopEvents: workshopEvents.filter(misc_tsx_1.typedBoolean),
                            tags: Array.from(tags),
                        }, { headers: headers })];
            }
        });
    });
}
exports.headers = misc_tsx_1.reuseUsefulLoaderHeaders;
function WorkshopsHome() {
    return <react_1.Outlet />;
}
exports.default = WorkshopsHome;
var useWorkshopsData = function () {
    return (0, providers_tsx_1.useMatchLoaderData)(exports.handle.id);
};
exports.useWorkshopsData = useWorkshopsData;
