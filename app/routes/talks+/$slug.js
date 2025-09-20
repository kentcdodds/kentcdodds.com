"use strict";
// this is a placeholder to make /routes/talks+/_talks catch nested paths
Object.defineProperty(exports, "__esModule", { value: true });
exports.meta = void 0;
exports.default = TalksSlug;
var images_tsx_1 = require("#app/images.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var meta = function (_a) {
    var _b, _c, _d;
    var matches = _a.matches, params = _a.params;
    var _e = ((_c = (_b = matches.find(function (m) { return m.id === 'routes/talks+/_talks'; })) === null || _b === void 0 ? void 0 : _b.data) !== null && _c !== void 0 ? _c : {}).talks, talks = _e === void 0 ? [] : _e;
    var requestInfo = ((_d = matches.find(function (m) { return m.id === 'root'; })) === null || _d === void 0 ? void 0 : _d.data).requestInfo;
    var talk = params.slug ? talks.find(function (t) { return t.slug === params.slug; }) : null;
    var title = talk ? talk.title : '404: Talk not found';
    return (0, seo_ts_1.getSocialMetas)({
        title: talk ? "".concat(title, " by Kent C. Dodds") : title,
        description: talk ? talk.description : '404: Talk not found',
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getSocialImageWithPreTitle)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            featuredImage: 'kent/kent-speaking-all-things-open',
            title: title,
            preTitle: "Checkout this talk by Kent",
        }),
    });
};
exports.meta = meta;
function TalksSlug() {
    return null;
}
