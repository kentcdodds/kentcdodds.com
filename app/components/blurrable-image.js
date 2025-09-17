"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlurrableImage = BlurrableImage;
var clsx_1 = require("clsx");
var React = require("react");
var isServer = typeof document === 'undefined';
function BlurrableImage(_a) {
    var img = _a.img, blurDataUrl = _a.blurDataUrl, rest = __rest(_a, ["img", "blurDataUrl"]);
    var id = React.useId();
    var _b = React.useState(function () {
        if (isServer)
            return false;
        // on the client, it's possible the images has already finished loading.
        // we've got the data-evt-onload attribute on the image
        // (which our entry.server replaces with simply "onload") which will remove
        // the class "opacity-0" from the image once it's loaded. So we'll check
        // if the image is already loaded and if so, we know that visible should
        // initialize to true.
        var el = document.getElementById(id);
        return el instanceof HTMLImageElement && !el.classList.contains('opacity-0');
    }), visible = _b[0], setVisible = _b[1];
    var jsImgElRef = React.useRef(null);
    React.useEffect(function () {
        if (!jsImgElRef.current)
            return;
        if (jsImgElRef.current.complete) {
            setVisible(true);
            return;
        }
        var current = true;
        jsImgElRef.current.addEventListener('load', function () {
            if (!jsImgElRef.current || !current)
                return;
            setTimeout(function () {
                setVisible(true);
            }, 0);
        });
        return function () {
            current = false;
        };
    }, []);
    var jsImgEl = React.cloneElement(img, {
        ref: jsImgElRef,
        id: id,
        // React doesn't like the extra onload prop the server's going to send,
        // but it also doesn't like an onload prop and recommends onLoad instead.
        // but we want to use the onload prop because it's a bit more performant
        // and as a result it's possible the user will never see the blurred image
        // at all which would be great. So we suppress the warning here and we use
        // this funny data-evt-prefixed attribute which our server renderer will
        // remove for us (check entry.server).
        suppressHydrationWarning: true,
        // @ts-expect-error this is a funny thing we do...
        'data-evt-onload': isServer
            ? "this.classList.remove('opacity-0')"
            : undefined,
        className: (0, clsx_1.clsx)('absolute h-full w-full', img.props.className, 'transition-opacity', {
            'opacity-0': !visible,
        }),
    });
    return (<div {...rest} className={(0, clsx_1.clsx)('relative', rest.className)}>
			{blurDataUrl ? (<>
					<img key={blurDataUrl} src={blurDataUrl} className={(0, clsx_1.clsx)('absolute h-full w-full', img.props.className)} alt={img.props.alt}/>
					<div className={(0, clsx_1.clsx)('absolute h-full w-full', img.props.className, 'backdrop-blur-xl')}/>
				</>) : null}
			{jsImgEl}
			<noscript className="absolute z-10 h-full w-full">{img}</noscript>
		</div>);
}
