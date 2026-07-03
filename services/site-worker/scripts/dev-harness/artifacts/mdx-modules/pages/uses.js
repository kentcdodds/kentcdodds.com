// <stdin>
import * as React from "react";
import * as _jsx_runtime from "react/jsx-runtime";
var MDXContent = (() => {
  var Component = (() => {
    var m = Object.create;
    var h = Object.defineProperty;
    var p = Object.getOwnPropertyDescriptor;
    var f = Object.getOwnPropertyNames;
    var u = Object.getPrototypeOf, g = Object.prototype.hasOwnProperty;
    var w = (t, e) => () => (e || t((e = { exports: {} }).exports, e), e.exports), k = (t, e) => {
      for (var r in e) h(t, r, { get: e[r], enumerable: true });
    }, l = (t, e, r, a) => {
      if (e && typeof e == "object" || typeof e == "function") for (let i of f(e)) !g.call(t, i) && i !== r && h(t, i, { get: () => e[i], enumerable: !(a = p(e, i)) || a.enumerable });
      return t;
    };
    var y = (t, e, r) => (r = t != null ? m(u(t)) : {}, l(e || !t || !t.__esModule ? h(r, "default", { value: t, enumerable: true }) : r, t)), b = (t) => l(h({}, "__esModule", { value: true }), t);
    var o = w((B, c) => {
      c.exports = _jsx_runtime;
    });
    var v = {};
    k(v, { default: () => s, frontmatter: () => S });
    var n = y(o()), S = { title: "What Kent uses", description: "The tools Kent C. Dodds uses", bannerCloudinaryId: "kentcdodds.com/src/pages/uses/office_2025", bannerAlt: "Kent's desk with two monitors, a microphone, a camera, a circular light, and more." };
    function d(t) {
      let e = { a: "a", blockquote: "blockquote", circle: "circle", code: "code", div: "div", g: "g", h1: "h1", h2: "h2", h3: "h3", img: "img", li: "li", p: "p", path: "path", span: "span", svg: "svg", ul: "ul", ...t.components };
      return (0, n.jsxs)(n.Fragment, { children: [(0, n.jsx)(e.h1, { id: "uses", children: (0, n.jsx)(e.a, { href: "#uses", children: "Uses" }) }), `
`, (0, n.jsxs)(e.p, { children: [`I regularly get messages asking about the specifics of some piece of software or
hardware I use. When they do, I send them this page (And you can too! The short
URL for this page is `, (0, n.jsx)(e.a, { href: "https://kcd.im/uses", children: (0, n.jsx)(e.code, { children: "kcd.im/uses" }) }), ")."] }), `
`, (0, n.jsx)("callout-info", { children: (0, n.jsx)(e.p, { children: "Full disclosure, many links on this site are affiliate links." }) }), `
`, (0, n.jsx)(e.h2, { id: "services", children: (0, n.jsx)(e.a, { href: "#services", children: "Services" }) }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://kcd.im/fathom", children: "Fathom" }), " - My preferred tool for ethical analytics"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://fly.io", children: "Fly.io" }), " - An amazing hosting platform"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://kcd.im/cloudinary", children: "Cloudinary" }), " - Fantastic image hosting"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://github.com", children: "GitHub" }), ` - Where I host my code. I also run CI/CD
pipelines via GitHub Actions.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://kcd.im/stickermule", children: "Sticker Mule" }), ` - How I get a bunch of stickers of
my OSS projects etc. printed for myself that I can hand out.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://iwantmyname.com", children: "iwantmyname.com" }), " - Where I buy all my domain names."] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://cal.com", children: "Cal.com" }), ` - For: "Grab a time whenever" link with
consulting fees built-in.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://notion.so/calendar", children: "Notion Calendar" }), ` - My calendar app and it allows
me to share my availability with specific blocks of time.`] }), `
`] }), `
`, (0, n.jsx)(e.h2, { id: "tech", children: (0, n.jsx)(e.a, { href: "#tech", children: "Tech" }) }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://reactjs.org/", children: "React" }), ` - The most widely used frontend framework in the
world`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://remix.run", children: "Remix" }), "/", (0, n.jsx)(e.a, { href: "https://reactrouter.com/", children: "React Router v7" }), ` - The
best framework to build a web app`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://www.prisma.io/", children: "Prisma" }), ` - A fantastic ORM for Node.js (I use it with
Postgres/SQLite hosted on Fly.io).`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://zod.dev/", children: "Zod" }), ` - A great schema declaration and data validation
library for TypeScript.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://www.typescriptlang.org/", children: "TypeScript" }), ` - I can't imagine building
JavaScript projects without TypeScript.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://testing-library.com/", children: "Testing Library" }), ` - A great testing library for
anything that interacts with the DOM.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://vitest.dev/", children: "Vitest" }), " - A great testing framework."] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://playwright.dev/", children: "Playwright" }), " - I use this for E2E testing."] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://mswjs.io/", children: "MSW" }), " - Next generation API mocking."] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://prettier.io/", children: "Prettier" }), " - I can't imagine life without it."] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://www.radix-ui.com/", children: "Radix UI" }), ` - An accessibility-focused set of
easy-to-use and easy-to-style components.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://tailwindcss.com/", children: "TailwindCSS" }), ` - A great way to keep my styling
consistent and stay productive.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://github.com/kentcdodds/mdx-bundler", children: "mdx-bundler" }), ` - Compile and bundle
your MDX files and their dependencies. FAST.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://xstate.js.org/", children: "XState" }), ` - Any time I have a complex state problem, I
use this.`] }), `
`] }), `
`, (0, n.jsx)(e.h2, { id: "editor", children: (0, n.jsx)(e.a, { href: "#editor", children: "Editor" }) }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://www.cursor.com", children: "Cursor" }), ` - My preferred editor. Find my settings here:
`, (0, n.jsx)(e.a, { href: "https://kcd.im/vscode", children: "kcd.im/vscode" })] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://marketplace.visualstudio.com/items?itemName=sdras.night-owl&WT.mc_id=twitter-social-sdras", children: "Night Owl" }), `
editor theme by `, (0, n.jsx)(e.a, { href: "https://x.com/sarah_edo", children: "Sarah Drasner" })] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://dank.sh", children: "Dank Mono" }), ` font by
`, (0, n.jsx)(e.a, { href: "https://x.com/_philpl", children: "Phil Pl\xFCckthun" })] }), `
`] }), `
`, (0, n.jsx)(e.h2, { id: "chromebrave-extensions", children: (0, n.jsx)(e.a, { href: "#chromebrave-extensions", children: "Chrome/Brave Extensions" }) }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://chrome.google.com/webstore/detail/1password-extension-deskt/aomjjhallfgjeglblehebfpbcfeobpgk", children: "1Password extension (desktop app required)" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://chrome.google.com/webstore/detail/octolinker/jlmafbaeoofdegohdhinkhilhclaklkp", children: "OctoLinker" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://chrome.google.com/webstore/detail/password-alert/noondiphcddnnabmjcihcjfbhfklnnep", children: "Password Alert" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi", children: "React Developer Tools" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://chrome.google.com/webstore/detail/refined-github/hlepfoohegkhhmjieoechaddaejaokhf", children: "Refined GitHub" }) }), `
`] }), `
`, (0, n.jsx)(e.h2, { id: "desktop-apps", children: (0, n.jsx)(e.a, { href: "#desktop-apps", children: "Desktop Apps" }) }), `
`, (0, n.jsxs)(e.p, { children: [`You can find all the apps I auto-install when I setup a new MacBook in
`, (0, n.jsxs)(e.a, { href: "https://github.com/kentcdodds/dotfiles/blob/master/.macos", children: ["my dotfiles ", (0, n.jsx)(e.code, { children: ".macos" }), " script"] }), `.
Here are a few highlights (in no particular order):`] }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://brave.com", children: "Brave" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.raycast.com", children: "Raycast" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.scriptkit.com/", children: "ScriptKit" }) }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://kcd.im/flowai", children: "Wispr Flow" }), " - Voice to text (AI)"] }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://folivora.ai", children: "BetterTouchTool" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://matthewpalmer.net/vanilla/", children: "Vanilla" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.mowglii.com/itsycal", children: "Itsycal" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://1password.com", children: "1Password" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://en.wikipedia.org/wiki/Terminal_(macOS)", children: "Terminal.app" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://spotify.com", children: "Spotify" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://slack.com", children: "Slack" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://discord.com", children: "Discord" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://workflowy.com/invite/a9f7933.lnx", children: "Workflowy" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://gif.ski", children: "Gifski" }) }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://kcd.im/zoom", children: "Zoom.us" }), " (referral: 15% off Workplace Pro)"] }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://frontapp.com", children: "Front" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://mimestream.com", children: "Mimestream" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://dropbox.com", children: "Dropbox" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://sindresorhus.com/battery-indicator", children: "Battery Indicator" }) }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://www.telestream.net/screenflow", children: "ScreenFlow" }), " - Recording software"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://obsproject.com", children: "OBS" }), " - Live streaming software"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://github.com/avibrazil/RDM", children: "RDM" }), " - For setting the screen size"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://rogueamoeba.com/loopback/", children: "Loopback" }), " - To record my desktop audio (and alias my microphone so I can tell which Camlink to use)."] }), `
`] }), `
`, (0, n.jsx)(e.h2, { id: "clis", children: (0, n.jsx)(e.a, { href: "#clis", children: "CLIs" }) }), `
`, (0, n.jsxs)(e.p, { children: [`Again, you can find everything that I auto-install when I setup a new MacBook in
`, (0, n.jsxs)(e.a, { href: "https://github.com/kentcdodds/dotfiles/blob/master/.macos", children: ["my dotfiles ", (0, n.jsx)(e.code, { children: ".macos" }), " script"] }), `.
Here are a few highlights:`] }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://brew.sh/", children: "Homebrew" }) }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://github.com/github/hub", children: "hub" }), " (a better git)"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://github.com/BurntSushi/ripgrep", children: "ripgrep" }), " (a better grep)"] }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://formulae.brew.sh/formula/tree", children: "tree" }) }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://github.com/sharkdp/bat", children: "bat" }), " (a better cat)"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://github.com/dandavison/delta", children: "delta" }), " (a better git diff)"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://github.com/batpigandme/night-owlish", children: "night-owlish" }), ` (theme for bat and
delta)`] }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://npm.im/serve", children: "serve" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://npm.im/npm-quick-run", children: "npm-quick-run" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://npm.im/npm-check-updates", children: "npm-check-updates" }) }), `
`] }), `
`, (0, n.jsx)(e.h2, { id: "my-office", children: (0, n.jsx)(e.a, { href: "#my-office", children: "My Office" }) }), `
`, (0, n.jsxs)(e.div, { className: "tweet-embed", children: [`
			
		`, (0, n.jsxs)(e.a, { className: "tweet-author", href: "https://x.com/theKevinShen", target: "_blank", rel: "noreferrer noopener", children: [`
			`, (0, n.jsx)(e.img, { src: "https://pbs.twimg.com/profile_images/1808772947672510464/Fc7_PW6Z_bigger.jpg", loading: "lazy", alt: "Kevin Shen avatar" }), `
			`, (0, n.jsxs)(e.div, { children: [`
				`, (0, n.jsx)(e.span, { className: "tweet-author-name", children: "Kevin Shen" }), `
				`, (0, n.jsx)(e.span, { className: "tweet-author-handle", children: "@theKevinShen" }), `
			`] }), `
		`] }), `
			`, (0, n.jsxs)(e.blockquote, { children: [`Another studio designed & built! \u{1F525}\u2728

This time, for the incredible `, (0, n.jsx)(e.a, { href: "https://x.com/kentcdodds", target: "_blank", rel: "noreferrer noopener", children: "@kentcdodds" }), ` \u{1F60E}

So excited for you Kent!! 

Stay tuned for a longer video we filmed with Kent soon \u{1F609}

Huge thanks to our team who stopped at nothing to make this happen `, (0, n.jsx)(e.a, { href: "https://x.com/daryl_pascual", target: "_blank", rel: "noreferrer noopener", children: "@daryl_pascual" }), " ", (0, n.jsx)(e.a, { href: "https://x.com/Viktorwithak", target: "_blank", rel: "noreferrer noopener", children: "@Viktorwithak" }), " ", (0, n.jsx)(e.a, { href: "https://x.com/DatAshton", target: "_blank", rel: "noreferrer noopener", children: "@DatAshton" })] }), `
			`, (0, n.jsx)(e.a, { href: "https://x.com/theKevinShen/status/1869803430757433703", target: "_blank", rel: "noreferrer noopener", children: (0, n.jsx)(e.div, { className: "tweet-media-container", children: (0, n.jsx)(e.div, { className: "tweet-media-grid", "data-count": "1", children: (0, n.jsxs)(e.div, { className: "tweet-media-with-play-button", children: [(0, n.jsx)(e.div, { className: "tweet-media-play-button", children: (0, n.jsxs)(e.svg, { width: "75", height: "75", viewBox: "0 0 75 75", xmlns: "http://www.w3.org/2000/svg", children: [(0, n.jsx)(e.circle, { cx: "37.4883", cy: "37.8254", r: "37", fill: "white" }), (0, n.jsx)(e.path, { fillRule: "evenodd", clipRule: "evenodd", d: "M35.2643 33.025L41.0017 36.9265C41.6519 37.369 41.6499 38.3118 40.9991 38.7518L35.2616 42.6276C34.5113 43.1349 33.4883 42.6077 33.4883 41.7143V33.9364C33.4883 33.0411 34.5146 32.5151 35.2643 33.025" })] }) }), (0, n.jsx)(e.img, { src: "https://pbs.twimg.com/amplify_video_thumb/1869803362960715782/img/JaTbHvFx5oJwQdy5.jpg", width: "100%", loading: "lazy", alt: "Tweet media" })] }) }) }) }), `
			
			
			`, (0, n.jsx)(e.div, { className: "tweet-time", children: (0, n.jsx)(e.a, { href: "https://x.com/theKevinShen/status/1869803430757433703", target: "_blank", rel: "noreferrer noopener", children: "5:54 PM (UTC) \xB7 December 19th, 2024" }) }), `
			
		`, (0, n.jsxs)(e.div, { className: "tweet-stats", children: [`
			`, (0, n.jsxs)(e.a, { href: "https://x.com/theKevinShen/status/1869803430757433703", className: "tweet-reply", target: "_blank", rel: "noreferrer noopener", children: [(0, n.jsx)(e.svg, { width: "18", height: "18", viewBox: "0 0 24 24", "aria-hidden": "true", children: (0, n.jsx)(e.g, { children: (0, n.jsx)(e.path, { d: "M14.046 2.242l-4.148-.01h-.002c-4.374 0-7.8 3.427-7.8 7.802 0 4.098 3.186 7.206 7.465 7.37v3.828c0 .108.044.286.12.403.142.225.384.347.632.347.138 0 .277-.038.402-.118.264-.168 6.473-4.14 8.088-5.506 1.902-1.61 3.04-3.97 3.043-6.312v-.017c-.006-4.367-3.43-7.787-7.8-7.788zm3.787 12.972c-1.134.96-4.862 3.405-6.772 4.643V16.67c0-.414-.335-.75-.75-.75h-.396c-3.66 0-6.318-2.476-6.318-5.886 0-3.534 2.768-6.302 6.3-6.302l4.147.01h.002c3.532 0 6.3 2.766 6.302 6.296-.003 1.91-.942 3.844-2.514 5.176z" }) }) }), (0, n.jsx)(e.span, { children: "18" })] }), `
			`, (0, n.jsx)(e.a, { href: "https://x.com/intent/retweet?tweet_id=1869803430757433703", className: "tweet-retweet", target: "_blank", rel: "noreferrer noopener", children: (0, n.jsx)(e.svg, { width: "18", height: "18", viewBox: "0 0 24 24", "aria-hidden": "true", children: (0, n.jsx)(e.g, { children: (0, n.jsx)(e.path, { d: "M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z" }) }) }) }), `
			`, (0, n.jsxs)(e.a, { href: "https://x.com/intent/like?tweet_id=1869803430757433703", className: "tweet-like", target: "_blank", rel: "noreferrer noopener", children: [(0, n.jsx)(e.svg, { width: "18", height: "18", viewBox: "0 0 24 24", "aria-hidden": "true", children: (0, n.jsx)(e.g, { children: (0, n.jsx)(e.path, { d: "M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12zM7.354 4.225c-2.08 0-3.903 1.988-3.903 4.255 0 5.74 7.034 11.596 8.55 11.658 1.518-.062 8.55-5.917 8.55-11.658 0-2.267-1.823-4.255-3.903-4.255-2.528 0-3.94 2.936-3.952 2.965-.23.562-1.156.562-1.387 0-.014-.03-1.425-2.965-3.954-2.965z" }) }) }), (0, n.jsx)(e.span, { children: "120" })] }), `
			`, (0, n.jsxs)(e.a, { href: "https://x.com/theKevinShen/status/1869803430757433703", className: "tweet-link", target: "_blank", rel: "noreferrer noopener", children: [(0, n.jsxs)(e.svg, { width: "24", height: "24", fill: "none", viewBox: "0 0 24 24", children: [`
	`, (0, n.jsx)(e.path, { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M17.25 15.25V6.75H8.75" }), `
	`, (0, n.jsx)(e.path, { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M17 7L6.75 17.25" }), `
`] }), `
`, (0, n.jsx)(e.span, {})] }), `
		`] }), `
	
		`] }), `
`, (0, n.jsx)(e.h3, { id: "desk-setup", children: (0, n.jsx)(e.a, { href: "#desk-setup", children: "Desk Setup" }) }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://www.apple.com/macbook-pro/", children: "MacBook Pro (16-inch, 2024)" }), ` -
My laptop. More stats:`, `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsx)(e.li, { children: "Processor: Apple M4 Max with 16-core CPU and 16-core Neural Engine" }), `
`, (0, n.jsx)(e.li, { children: "Graphics: 40-core GPU" }), `
`, (0, n.jsx)(e.li, { children: "Memory: 128 GB" }), `
`, (0, n.jsx)(e.li, { children: "Storage: 4TB SSD" }), `
`, (0, n.jsx)(e.li, { children: "Nano-Texture Display" }), `
`] }), `
`] }), `
`, (0, n.jsx)(e.li, { children: "My desk is a custom made standing desk" }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B00V4LYKEQ?tag=kentcdodds-20", children: 'Homelegance Daria 5-Tier Bookcase, 26" W, Brown' }), " - decor"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B07JMH6BSY?tag=kentcdodds-20", children: "OWC Thunderbolt 3 Dock" }), ` - is the main box
in my desk and all wires ultimately come together before going into my laptop.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B01H5QF2TK/?tag=kentcdodds-20", children: "Cable Matters Thunderbolt 3 Cable" }), ` - This
connects my laptop to the dock. It's the only cable to goes into my laptop.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B07XV9NQSJ?tag=kentcdodds-20", children: "LG 27MD5KL-B 27 Inch Ultrafine 5K (5120 x 2880) IPS Display with macOS Compatibility, DCI-P3 99% Color Gamut and Thunderbolt 3 Port, Black" }), ` -
I have 2 of these`] }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://amazon.com/dp/B0DL6KW75T?tag=kentcdodds-20", children: "Apple Magic Keyboard with TouchID" }) }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B00CD1PTF0/?tag=kentcdodds-20", children: "Bose Companion 2 Series III Multimedia Speakers" }), ` -
My computer speakers that sit on either side of my desk.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B00OV41XAM/?tag=kentcdodds-20", children: "Mediabridge 3.5mm Male to Male Right Angle Stereo Audio Cable (8 Feet)" }), ` -
This connects my speakers to my dock`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B00HVLUR86/?tag=kentcdodds-20", children: "Audio-Technica ATH-M50x Headphones" }), ` - I
don't use these often (the joys of a home office) but when I do, they're
fantastic.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B003L20OZ0/?tag=kentcdodds-20", children: "Safco Products Vue Mesh Extended-Height Chair 3395BL" }), ` -
This is my chair. It's not terrific, but it's hard to find a chair that is
both comfortable and suited for a standing desk. (You'll probably want this
`, (0, n.jsx)(e.a, { href: "https://amazon.com/dp/B003L20OZU/?tag=kentcdodds-20", children: "Safco Products Loop Arms Set" }), ")"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B000V4PPV4/?tag=kentcdodds-20", children: "Floortex Cleartex UltiMat Polycarbonate Chair Mat" }), ` -
My chair rolls around on this.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B005UA2WO2/?tag=kentcdodds-20", children: "Imprint CumulusPRO Commercial Standing Desk Anti-Fatigue Mat" }), ` -
When I'm standing I put this on top of the chair mat. Otherwise I slide it to
the side of my desk.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://www.amazon.com/dp/B00AAXD6X0?tag=kentcdodds-20", children: "Revbalance 101 v2 - Balance Board Sports Trainer" }), ` -
I use this sometimes while standing at my desk to keep moving.`] }), `
`] }), `
`, (0, n.jsx)(e.h3, { id: "camera", children: (0, n.jsx)(e.a, { href: "#camera", children: "Camera" }) }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B08WJKKD47?tag=kentcdodds-20", children: "Sony Alpha FX3 ILME-FX3 | Full-frame Cinema Line Camera" }), " - My primary camera"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B07B9VNL8H?tag=kentcdodds-20", children: "Sigma 35mm F1.4 Art DG HSM for Sony E" }), " - My primary Lens"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B0BGQGBW8J?tag=kentcdodds-20", children: "SONY Cinema Line FX30 Super 35 Camera" }), " - My angle camera"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B0B91YP783?tag=kentcdodds-20", children: "24mm F1.4 Art DG DN for Sony E Mount" }), " - My angle lens"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B07K3FN5MR?tag=kentcdodds-20", children: "CamLink 4k" }), ` - To make my Sony Cameras work
like a regular USB Webcam (I have 2 of these)`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B07WDSYXCZ?tag=kentcdodds-20", children: "K&F Ball Head - 360\xB0 Rotating Camera Mount" }), " - My camera mounts"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B0CH3P9K1X?tag=kentcdodds-20", children: "Elgato Teleprompter" }), " - Lets me look at camera while seeing screen"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B07ZVCKBFL?tag=kentcdodds-20", children: "Highwings 20ft HDMI Cable" }), " - My HDMI cable (I have 2 of these)"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B07D5V8KY5?tag=kentcdodds-20", children: "Gonine Dummy Battery for Sony Cameras" }), " - My battery for my cameras"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B0CJLNH31B?tag=kentcdodds-20", children: "NEEWER Heavy Duty Clamp" }), " - The clamp for my camera mounts"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B09TD93MKD?tag=kentcdodds-20", children: "IFOOTAGE Spider Crab Arm" }), " - My camera mounting arms (I have 2 of these)"] }), `
`] }), `
`, (0, n.jsx)(e.h3, { id: "lighting", children: (0, n.jsx)(e.a, { href: "#lighting", children: "Lighting" }) }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B09FX783Y6?tag=kentcdodds-20", children: "Aputure Amaran P60X Video Panel Light" }), " - My hair light"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B0BSLDHMMN?tag=kentcdodds-20", children: "amaran 100x S" }), " - My face light"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B0BLC6NCGK?tag=kentcdodds-20", children: "NEEWER 33inch/85cm Parabolic Softbox" }), " - My softbox"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://www.lutron.com/", children: "Lutron" }), " - My lighting control system"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B0C3H539GG?tag=kentcdodds-20", children: "Selens Wall Mount Triangle Boom Arm" }), " - My softbox mount"] }), `
`] }), `
`, (0, n.jsx)(e.h3, { id: "microphone", children: (0, n.jsx)(e.a, { href: "#microphone", children: "Microphone" }) }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://www.amazon.com/dp/B008ZTAL0M?tag=kentcdodds-20", children: "Sennheiser MKH 50P48 Wired Super-Cardioid Condenser Studio Microphone" }), " - My microphone."] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B0002E1P30?tag=kentcdodds-20", children: "Mogami Gold Studio 15 Microphone Cable" }), " - My microphone cable"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B07VCGDP43?tag=kentcdodds-20", children: "Sony Digital XLR Adaptor Kit with Microphone - XLR-K3M" }), " - My mic connects to this and the audio comes through the camera this way"] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B0C3H539GG?tag=kentcdodds-20", children: "Selens Wall Mount Triangle Boom Arm" }), " - My mic mount"] }), `
`] }), `
`, (0, n.jsx)(e.h3, { id: "sound-proofing", children: (0, n.jsx)(e.a, { href: "#sound-proofing", children: "Sound Proofing" }) }), `
`, (0, n.jsx)(e.p, { children: (0, n.jsx)(e.a, { href: "https://youtu.be/AwLj4qCyJ7E", children: "Watch me put this together" }) }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B07VDTR22R/?tag=kentcdodds-20", children: '50 Pack Acoustic Panels 1" X 12" X 12", Black' }), ` -
Attached to cut versions of yard signs`] }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://amazon.com/dp/B07S952JN9/?tag=kentcdodds-20", children: '10 Blank Signs White 18"x24"' }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://amazon.com/dp/B07MWRV574/?tag=kentcdodds-20", children: "Gorilla Glue" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://amazon.com/dp/B007RKFBT6/?tag=kentcdodds-20", children: "Command 4 lb White Picture Hanging Strips, Small" }) }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B0B4NQGCCV?tag=kentcdodds-20", children: "BUBOS Acoustic Panels" }), " - Nice looking panels I put on my ceiling"] }), `
`] }), `
`, (0, n.jsx)(e.h2, { id: "on-the-go", children: (0, n.jsx)(e.a, { href: "#on-the-go", children: "On the Go" }) }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B01FFA730Y/?tag=kentcdodds-20", children: "KOPACK Lightweight Laptop Backpack" }), ` - I
love this backpack I bought another one as soon as the first was destroyed
`, (0, n.jsx)(e.a, { href: "https://x.com/kentcdodds/status/1182010394300170240", children: "in a onewheel accident" }), "."] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://www.amazon.com/dp/B09W2H224F?tag=kentcdodds-20", children: "Anker GaNPrime Power Bank, 10,000mAh 30W USB-C Portable Charger with 65W Wall Charger" }), ` -
This thing's pretty great!`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B07DW4TFJP/?tag=kentcdodds-20", children: "USB C Hub Multiport Adapter: Ethernet, HDMI, USB-3 and USB-C" }), ` -
This stays in my backpack and I use it often when speaking at events or
visiting people's offices.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B0872M3BZG?tag=kentcdodds-20", children: "Kensington Wireless Presenter with Red Laser Pointer" }), ` -
I've had this for years. I don't always use it, but when I need a laser
pointer/wireless presenter tool, I'm glad I have it!`] }), `
`] }), `
`, (0, n.jsx)(e.h2, { id: "home-stuff", children: (0, n.jsx)(e.a, { href: "#home-stuff", children: "Home Stuff" }) }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B09TT8GZK9/?tag=kentcdodds-20", children: "Anker MagSafe Charger Stand, Wireless Charger, 3-in-1 Cube, 15W Foldable Fast Charging for iPhone 16/15/14/13, Apple Watch, AirPods" }), ` -
Where I put my phone on my desk. The other one goes on my nightstand.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B07NF9XDWG/?tag=kentcdodds-20", children: "Synology 5 bay NAS DiskStation DS1019+" }), ` -
I use this to store all of my pictures/movies/music/etc. It's amazing.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B07R1P55GR/?tag=kentcdodds-20", children: "Seagate IronWolf 3.84TB NAS SSD Internal Solid State Drive" }), ` -
These are phenomenal SSDs for the NAS.`] }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://amazon.com/dp/B0C72WLSJ1?tag=kentcdodds-20", children: "GE Profile PFQ97HSPVDS All-in-One Washer/Dryer" }) }), `
`] }), `
`, (0, n.jsx)(e.h2, { id: "podcasts", children: (0, n.jsx)(e.a, { href: "#podcasts", children: "Podcasts" }) }), `
`, (0, n.jsx)(e.p, { children: `Here are some podcasts I "use" to keep me informed and entertained while I
drive, clean, and ride my onewheel.` }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://syntax.fm/", children: "Syntax.fm" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://kentcdodds.com/chats", children: "Chats with Kent" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://darknetdiaries.com/", children: "Darknet Diaries" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://softskills.audio/", children: "SoftSkills Engineering" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://kentcdodds.com/calls", children: "Call Kent" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/channel/UCUXjzHZ9cGchJh8X1aCM1sA", children: "Ride the Lightning Unofficial Tesla Podcast" }) }), `
`] }), `
`, (0, n.jsx)(e.h2, { id: "youtube", children: (0, n.jsx)(e.a, { href: "#youtube", children: "YouTube" }) }), `
`, (0, n.jsx)(e.p, { children: "Here are channels I'm subscribed to:" }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/kentcdodds-vids", children: "Kent C. Dodds" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/Remix-Run", children: "Remix" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/NowYouKnowChannel", children: "Now You Know" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/mkbhd", children: "MKBHD" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/Onewheel", children: "Onewheel" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/joescott", children: "Answers with Joe" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/UndecidedMF", children: "Undecided with Matt Ferrell" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/DudePerfect", children: "Dude Perfect" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/mrbeast", children: "Mr Beast" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/tesla", children: "Tesla" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/SpaceX", children: "SpaceX" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/inanutshell", children: "Kurzgesagt \u2013 In a Nutshell" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/MarkRober", children: "Mark Rober" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/churchofjesuschrist", children: "The Church of Jesus Christ of Latter-day Saints" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/BookofMormonVideos", children: "Book of Mormon Videos" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://www.youtube.com/c/thepianoguys", children: "The Piano Guys" }) }), `
`] }), `
`, (0, n.jsx)(e.h2, { id: "newsletters", children: (0, n.jsx)(e.a, { href: "#newsletters", children: "Newsletters" }) }), `
`, (0, n.jsx)(e.p, { children: "Here are the newsletters I subscribe to:" }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "/subscribe", children: "Kent C. Dodds Mailing List" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://remix.run/newsletter", children: "Remix Newsletter" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://javascriptweekly.com/", children: "JavaScript Weekly" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://frontendfoc.us/", children: "Frontend Focus" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://nodeweekly.com/", children: "Node Weekly" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://react.statuscode.com/", children: "React Status" }) }), `
`, (0, n.jsx)(e.li, { children: (0, n.jsx)(e.a, { href: "https://bytes.dev/", children: "Bytes" }) }), `
`] }), `
`, (0, n.jsx)(e.h2, { id: "other", children: (0, n.jsx)(e.a, { href: "#other", children: "Other" }) }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://amazon.com/dp/B01FCZ8I3I/?tag=kentcdodds-20", children: "Self Drilling Drywall Plastic Anchors with Screws Kit" }), ` -
I used this to mount several of the things on the walls and ceilings in my
office. They're solid, and you can screw them out if you make a mistake (which
I wish I could say I've never needed to do).`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://kcd.im/privacy", children: "Privacy.com" }), ` - A credit card system that I use
extensively to pay for things online.`] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://kcd.im/tesla", children: "Tesla Cars/Solar" }), ` - I have two Teslas, a Tesla Solar
Roof, and Tesla Powerwalls. Fantastic products, every one of them.`] }), `
`] }), `
`, (0, n.jsx)(e.h2, { id: "smart-home--ev", children: (0, n.jsx)(e.a, { href: "#smart-home--ev", children: "Smart Home & EV" }) }), `
`, (0, n.jsxs)(e.ul, { children: [`
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://www.roborock.com/", children: "Roborock" }), " - My robot vacuum and mop. Keeps the floors clean with minimal effort."] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://kcd.im/tesla", children: "Tesla Powerwalls" }), " - Home battery backup for energy storage and outage protection."] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://kcd.im/tesla", children: "Tesla Model 3" }), " - My electric car. Love the tech and efficiency."] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://kcd.im/tesla", children: "Tesla Model Y" }), " - My family's electric SUV."] }), `
`, (0, n.jsxs)(e.li, { children: [(0, n.jsx)(e.a, { href: "https://kcd.im/tesla", children: "Tesla Solar Roof" }), " - Solar panels built right into the roof for clean, renewable energy."] }), `
`] })] });
    }
    function s(t = {}) {
      let { wrapper: e } = t.components || {};
      return e ? (0, n.jsx)(e, { ...t, children: (0, n.jsx)(d, { ...t }) }) : d(t);
    }
    return b(v);
  })();
  ;
  return Component;
})();
var stdin_default = MDXContent;
export {
  stdin_default as default
};
