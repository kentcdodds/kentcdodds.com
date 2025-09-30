"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meta = exports.handle = void 0;
exports.default = NotFoundPage;
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var images_tsx_1 = require("#app/images.tsx");
exports.handle = {
    getSitemapEntries: function () { return null; },
};
var meta = function () {
    return [{ title: "Ain't nothing here" }];
};
exports.meta = meta;
function NotFoundPage() {
    return (<main>
			<hero_section_tsx_1.HeroSection title="404 - Oh no, you found a page that's missing stuff." subtitle="This is not a page on kentcdodds.com. So sorry." imageBuilder={images_tsx_1.images.bustedOnewheel}/>
		</main>);
}
