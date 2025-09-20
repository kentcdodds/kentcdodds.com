"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mdxPageMeta = void 0;
exports.getBannerAltProp = getBannerAltProp;
exports.getBannerTitleProp = getBannerTitleProp;
exports.useMdxComponent = useMdxComponent;
var lru_cache_1 = require("lru-cache");
var mdxBundler = require("mdx-bundler/client/index.js");
var React = require("react");
var cloudinary_video_tsx_1 = require("#app/components/cloudinary-video.tsx");
var images_tsx_1 = require("#app/images.tsx");
var form_tsx_1 = require("#app/kit/form.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("./seo.ts");
var theme_tsx_1 = require("./theme.tsx");
var use_root_data_ts_1 = require("./use-root-data.ts");
function getBannerAltProp(frontmatter) {
    var _a, _b, _c, _d;
    return ((_d = (_c = (_b = (_a = frontmatter.bannerAlt) !== null && _a !== void 0 ? _a : frontmatter.bannerTitle) !== null && _b !== void 0 ? _b : frontmatter.bannerCredit) !== null && _c !== void 0 ? _c : frontmatter.title) !== null && _d !== void 0 ? _d : 'Post banner');
}
function getBannerTitleProp(frontmatter) {
    var _a, _b;
    return ((_b = (_a = frontmatter.bannerTitle) !== null && _a !== void 0 ? _a : frontmatter.bannerAlt) !== null && _b !== void 0 ? _b : frontmatter.bannerCredit);
}
var mdxPageMeta = function (_a) {
    var _b, _c, _d, _e, _f, _g;
    var data = _a.data, matches = _a.matches;
    var requestInfo = (_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data.requestInfo;
    if (data === null || data === void 0 ? void 0 : data.page) {
        // NOTE: keyword metadata is not used because it was used and abused by
        // spammers. We use them for sorting on our own site, but we don't list
        // it in the meta tags because it's possible to be penalized for doing so.
        var _h = (_c = data.page.frontmatter.meta) !== null && _c !== void 0 ? _c : {}, keywords = _h.keywords, extraMetaInfo = __rest(_h, ["keywords"]);
        var extraMeta = Object.entries(extraMetaInfo).reduce(function (acc, _a) {
            var _b;
            var key = _a[0], val = _a[1];
            return __spreadArray(__spreadArray([], acc, true), [(_b = {}, _b[key] = String(val), _b)], false);
        }, []);
        var title = data.page.frontmatter.title;
        var isDraft = data.page.frontmatter.draft;
        var isUnlisted = data.page.frontmatter.unlisted;
        if (isDraft)
            title = "(DRAFT) ".concat(title !== null && title !== void 0 ? title : '');
        return __spreadArray(__spreadArray([
            isDraft || isUnlisted ? { robots: 'noindex' } : null
        ], (0, seo_ts_1.getSocialMetas)({
            title: title,
            description: data.page.frontmatter.description,
            url: (0, misc_tsx_1.getUrl)(requestInfo),
            image: (0, images_tsx_1.getSocialImageWithPreTitle)({
                url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
                featuredImage: (_d = data.page.frontmatter.bannerCloudinaryId) !== null && _d !== void 0 ? _d : 'kentcdodds.com/illustrations/kody-flying_blue',
                title: (_f = (_e = data.page.frontmatter.socialImageTitle) !== null && _e !== void 0 ? _e : data.page.frontmatter.title) !== null && _f !== void 0 ? _f : 'Untitled',
                preTitle: (_g = data.page.frontmatter.socialImagePreTitle) !== null && _g !== void 0 ? _g : "Check out this article",
            }),
            ogType: (0, misc_tsx_1.getUrl)(requestInfo).includes('/blog/') ? 'article' : 'website',
        }), true), extraMeta, true).filter(misc_tsx_1.typedBoolean);
    }
    else {
        return [
            { title: 'Not found' },
            {
                description: 'You landed on a page that Kody the Coding Koala could not find 🐨😢',
            },
        ];
    }
};
exports.mdxPageMeta = mdxPageMeta;
function OptionalUser(_a) {
    var children = _a.children;
    var user = (0, use_root_data_ts_1.useOptionalUser)();
    return children(user);
}
var mdxComponents = {
    a: misc_tsx_1.AnchorOrLink,
    Themed: theme_tsx_1.Themed,
    CloudinaryVideo: cloudinary_video_tsx_1.CloudinaryVideo,
    ThemedBlogImage: ThemedBlogImage,
    BlogImage: BlogImage,
    SubscribeForm: SubscribeForm,
    OptionalUser: OptionalUser,
};
/**
 * This should be rendered within a useMemo
 * @param code the code to get the component from
 * @returns the component
 */
function getMdxComponent(code) {
    var Component = mdxBundler.getMDXComponent(code);
    function KCDMdxComponent(_a) {
        var components = _a.components, rest = __rest(_a, ["components"]);
        return (<Component components={__assign(__assign({}, mdxComponents), components)} {...rest}/>);
    }
    return KCDMdxComponent;
}
function BlogImage(_a) {
    var cloudinaryId = _a.cloudinaryId, imgProps = _a.imgProps, transparentBackground = _a.transparentBackground;
    return (<img 
    // @ts-expect-error classname is overridden by getImgProps
    className="w-full rounded-lg object-cover py-8" {...(0, images_tsx_1.getImgProps)((0, images_tsx_1.getImageBuilder)(cloudinaryId, imgProps.alt), {
        widths: [350, 550, 700, 845, 1250, 1700, 2550],
        sizes: [
            '(max-width:1023px) 80vw',
            '(min-width:1024px) and (max-width:1620px) 50vw',
            '850px',
        ],
        transformations: {
            background: transparentBackground ? undefined : 'rgb:e6e9ee',
        },
    })} {...imgProps}/>);
}
function ThemedBlogImage(_a) {
    var darkCloudinaryId = _a.darkCloudinaryId, lightCloudinaryId = _a.lightCloudinaryId, imgProps = _a.imgProps, transparentBackground = _a.transparentBackground;
    return (<theme_tsx_1.Themed light={<BlogImage cloudinaryId={lightCloudinaryId} imgProps={imgProps} transparentBackground={transparentBackground}/>} dark={<BlogImage cloudinaryId={darkCloudinaryId} imgProps={imgProps} transparentBackground={transparentBackground}/>}/>);
}
function SubscribeForm(props) {
    var formId = props.formId, kitTagId = props.kitTagId, kitFormId = props.kitFormId;
    if (typeof formId !== 'string' ||
        typeof kitFormId !== 'string' ||
        typeof kitTagId !== 'string') {
        console.error("SubscribeForm improperly used. Must have a formId, kitFormId, and kitTagId", props);
        return null;
    }
    return (<div className="mb-12 border-b-2 border-t-2 border-team-current p-5">
			<form_tsx_1.KitForm formId={formId} kitFormId={kitFormId} kitTagId={kitTagId}/>
		</div>);
}
// This exists so we don't have to call new Function for the given code
// for every request for a given blog post/mdx file.
var mdxComponentCache = new lru_cache_1.LRUCache({
    max: 1000,
});
function useMdxComponent(code) {
    return React.useMemo(function () {
        if (mdxComponentCache.has(code)) {
            return mdxComponentCache.get(code);
        }
        var component = getMdxComponent(code);
        mdxComponentCache.set(code, component);
        return component;
    }, [code]);
}
