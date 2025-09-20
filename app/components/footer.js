"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Footer = Footer;
var react_1 = require("@remix-run/react");
var images_tsx_1 = require("#app/images.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
var external_links_tsx_1 = require("../external-links.tsx");
var form_tsx_1 = require("../kit/form.tsx");
var icon_link_tsx_1 = require("./icon-link.tsx");
var icons_tsx_1 = require("./icons.tsx");
var signature_tsx_1 = require("./signature.tsx");
var typography_tsx_1 = require("./typography.tsx");
function NewsletterSection() {
    return (<div>
			<typography_tsx_1.H6 as="div">Stay up to date</typography_tsx_1.H6>
			<div className="mt-4 max-w-md">
				<typography_tsx_1.Paragraph prose={false}>
					{"\n            Subscribe to the newsletter to stay up to date with articles,\n            courses and much more!\n          "}
					<react_1.Link prefetch="intent" to="/subscribe" className="text-secondary underlined hover:text-team-current focus:text-team-current">
						{"Learn more about the newsletter"}{' '}
						<icons_tsx_1.ArrowIcon className="inline-block" direction="top-right"/>
					</react_1.Link>
				</typography_tsx_1.Paragraph>
			</div>

			<div className="mt-8">
				<form_tsx_1.KitForm formId="newsletter" kitFormId="827139"/>
			</div>
		</div>);
}
function ContactSection() {
    return (<div>
			<typography_tsx_1.H6 as="div">Contact</typography_tsx_1.H6>
			<ul className="mt-4">
				<FooterLink name="Email Kent" href="/contact"/>
				<FooterLink name="Call Kent" href="/calls"/>
				<FooterLink name="Office hours" href="/office-hours"/>
			</ul>
		</div>);
}
function GeneralSection() {
    return (<div>
			<typography_tsx_1.H6 as="div">General</typography_tsx_1.H6>
			<ul className="mt-4">
				<FooterLink name="My Mission" href="/transparency"/>
				<FooterLink name="Privacy policy" href="/transparency#privacy"/>
				<FooterLink name="Terms of use" href="/transparency#terms"/>
				<FooterLink name="Code of conduct" href="/conduct"/>
			</ul>
		</div>);
}
function SitemapSection() {
    return (<div>
			<typography_tsx_1.H6 as="div">Sitemap</typography_tsx_1.H6>
			<ul className="mt-4">
				<FooterLink name="Home" href="/"/>
				<FooterLink name="Blog" href="/blog"/>
				<FooterLink name="Courses" href="/courses"/>
				<FooterLink name="Discord" href="/discord"/>
				<FooterLink name="Chats Podcast" href="/chats"/>
				<FooterLink name="Workshops" href="/workshops"/>
				<FooterLink name="Talks" href="/talks"/>
				<FooterLink name="Testimony" href="/testimony"/>
				<FooterLink name="Testimonials" href="/testimonials"/>
				<FooterLink name="About" href="/about"/>
				<FooterLink name="Credits" href="/credits"/>
				<FooterLink name="Sitemap.xml" reload href="/sitemap.xml"/>
			</ul>
		</div>);
}
function AboutSection() {
    return (<div>
			<typography_tsx_1.H4 as="div">Kent C. Dodds</typography_tsx_1.H4>

			<p className="text-secondary mt-6 max-w-md text-2xl">
				Full time educator making our world better
			</p>

			<div className="text-secondary mt-6 flex items-center justify-between gap-4 xl:flex-col xl:items-start">
				<div className="flex gap-4">
					<icon_link_tsx_1.IconLink href={external_links_tsx_1.externalLinks.github}>
						<icons_tsx_1.GithubIcon size={32}/>
					</icon_link_tsx_1.IconLink>
					<icon_link_tsx_1.IconLink href={external_links_tsx_1.externalLinks.youtube}>
						<icons_tsx_1.YoutubeIcon size={32}/>
					</icon_link_tsx_1.IconLink>
					<icon_link_tsx_1.IconLink href={external_links_tsx_1.externalLinks.twitter}>
						<icons_tsx_1.XIcon size={32}/>
					</icon_link_tsx_1.IconLink>
					<icon_link_tsx_1.IconLink href={external_links_tsx_1.externalLinks.rss}>
						<icons_tsx_1.RssIcon size={32}/>
					</icon_link_tsx_1.IconLink>
				</div>

				<div className="text-secondary relative flex w-24 items-center xl:mt-20 xl:w-32">
					{/* absolute position so that it doesn't change line-height of social icons */}
					<signature_tsx_1.Signature className="absolute block w-full"/>
				</div>
			</div>
		</div>);
}
function FooterLink(_a) {
    var name = _a.name, href = _a.href, reload = _a.reload;
    return (<li className="py-1">
			<misc_tsx_1.AnchorOrLink prefetch={href.startsWith('http') ? undefined : 'intent'} href={href} className="text-secondary underlined inline-block whitespace-nowrap text-lg hover:text-team-current focus:text-team-current focus:outline-none" reload={reload}>
				{name}
			</misc_tsx_1.AnchorOrLink>
		</li>);
}
function Footer(_a) {
    var _b;
    var image = _a.image;
    var userInfo = (0, use_root_data_ts_1.useRootData)().userInfo;
    var subscribedToNewsletter = Boolean(userInfo) ||
        ((_b = userInfo === null || userInfo === void 0 ? void 0 : userInfo.kit) === null || _b === void 0 ? void 0 : _b.tags.some(function (_a) {
            var name = _a.name;
            return name === 'Subscribed: general newsletter';
        }));
    var featuredImg = (<div className="aspect-[4/3]">
			<img loading="lazy" {...(0, images_tsx_1.getImgProps)(image, {
        className: 'w-full rounded-sm object-contain max-w-[400px] max-h-[400px]',
        widths: [300, 800],
        sizes: ['(max-width: 639px) 80vw', '400px'],
        transformations: {
            resize: {
                aspectRatio: '4:3',
                type: 'fit',
            },
        },
    })}/>
		</div>);
    return (<footer className="border-t border-gray-200 pb-16 pt-48 dark:border-gray-600">
			<div className="relative mx-10vw">
				<div className="relative mx-auto grid max-w-7xl grid-cols-4 grid-rows-max-content gap-x-4 md:grid-cols-8 xl:grid-cols-12 xl:gap-x-6">
					<div className="col-span-full md:col-span-3 xl:row-span-2">
						<AboutSection />
					</div>

					<div className="col-span-full mt-20 md:col-span-5 md:col-start-1 xl:hidden">
						{subscribedToNewsletter ? featuredImg : <NewsletterSection />}
					</div>

					<div className="col-span-2 mt-20 md:col-start-5 md:row-start-1 md:mt-0">
						<ContactSection />
					</div>

					<div className="col-span-2 mt-20 md:col-start-7 md:row-start-1 md:mt-0 xl:col-start-5 xl:row-start-2 xl:mt-16">
						<GeneralSection />
					</div>

					<div className="col-span-full mt-20 md:col-span-2 md:col-start-7 xl:col-start-5 xl:row-span-2 xl:row-start-1 xl:ml-56 xl:mt-0">
						<SitemapSection />
					</div>

					{/*
Note that the <NewsletterSection /> is rendered twice. The position of this cell changes based on breakpoint.
When we would move the cell around with css only, the tabIndex won't match the visual order.
*/}
					<div className="col-span-4 col-start-9 row-span-2 row-start-1 mt-0 hidden xl:block">
						{subscribedToNewsletter ? featuredImg : <NewsletterSection />}
					</div>

					<div className="col-span-full mt-24 text-lg text-gray-500 dark:text-slate-500 md:mt-44">
						<span>All rights reserved</span>{' '}
						<span className="block md:inline">{"\u00A9 Kent C. Dodds ".concat(new Date().getFullYear())}</span>
					</div>
				</div>
			</div>
		</footer>);
}
