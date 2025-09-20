"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogSection = BlogSection;
var clsx_1 = require("clsx");
var article_card_tsx_1 = require("../article-card.tsx");
var grid_tsx_1 = require("../grid.tsx");
var spacer_tsx_1 = require("../spacer.tsx");
var header_section_tsx_1 = require("./header-section.tsx");
function BlogSection(_a) {
    var articles = _a.articles, title = _a.title, description = _a.description, _b = _a.showArrowButton, showArrowButton = _b === void 0 ? true : _b;
    if (!articles.length)
        return null;
    return (<>
			<header_section_tsx_1.HeaderSection title={title} subTitle={description} cta={showArrowButton ? 'See the full blog' : undefined} ctaUrl="/blog"/>
			<spacer_tsx_1.Spacer size="2xs"/>
			<grid_tsx_1.Grid className="gap-y-16">
				{articles.slice(0, 3).map(function (article, idx) { return (<div key={article.slug} className={(0, clsx_1.clsx)('col-span-4', {
                'hidden lg:block': idx >= 2,
            })}>
						<article_card_tsx_1.ArticleCard article={article}/>
					</div>); })}
			</grid_tsx_1.Grid>
		</>);
}
