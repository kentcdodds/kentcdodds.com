"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocialMetas = getSocialMetas;
var images_tsx_1 = require("#app/images.tsx");
function getSocialMetas(_a) {
    var url = _a.url, _b = _a.title, title = _b === void 0 ? 'Helping people make the world a better place through quality software' : _b, _c = _a.description, description = _c === void 0 ? 'Make the world better with software' : _c, _d = _a.image, image = _d === void 0 ? (0, images_tsx_1.getGenericSocialImage)({
        url: url,
        words: title,
        featuredImage: images_tsx_1.images.kodyFlyingSnowboardingBlue.id,
    }) : _d, _e = _a.keywords, keywords = _e === void 0 ? '' : _e, _f = _a.ogType, ogType = _f === void 0 ? 'website' : _f;
    return [
        { title: title },
        { name: 'description', content: description },
        { name: 'keywords', content: keywords },
        { name: 'image', content: image },
        { name: 'og:url', content: url },
        { name: 'og:title', content: title },
        { name: 'og:description', content: description },
        { name: 'og:image', content: image },
        { name: 'og:type', content: ogType },
        {
            name: 'twitter:card',
            content: image ? 'summary_large_image' : 'summary',
        },
        { name: 'twitter:creator', content: '@kentcdodds' },
        { name: 'twitter:site', content: '@kentcdodds' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: image },
        { name: 'twitter:image:alt', content: title },
    ];
}
