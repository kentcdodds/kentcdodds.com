// <stdin>
import * as React from "react";
import * as _jsx_runtime from "react/jsx-runtime";
var MDXContent = (() => {
  var Component = (() => {
    var p = Object.create;
    var s = Object.defineProperty;
    var b = Object.getOwnPropertyDescriptor;
    var m = Object.getOwnPropertyNames;
    var u = Object.getPrototypeOf, y = Object.prototype.hasOwnProperty;
    var v = (n, e) => () => (e || n((e = { exports: {} }).exports, e), e.exports), k = (n, e) => {
      for (var l in e) s(n, l, { get: e[l], enumerable: true });
    }, o = (n, e, l, c) => {
      if (e && typeof e == "object" || typeof e == "function") for (let r of m(e)) !y.call(n, r) && r !== l && s(n, r, { get: () => e[r], enumerable: !(c = b(e, r)) || c.enumerable });
      return n;
    };
    var g = (n, e, l) => (l = n != null ? p(u(n)) : {}, o(e || !n || !n.__esModule ? s(l, "default", { value: n, enumerable: true }) : l, n)), N = (n) => o(s({}, "__esModule", { value: true }), n);
    var i = v((w, t) => {
      t.exports = _jsx_runtime;
    });
    var x = {};
    k(x, { default: () => h, frontmatter: () => B });
    var a = g(i()), B = { title: "Super Simple Start to Remix", date: "2021-05-03", description: "The simplest distraction-free version of a remix app", categories: ["react"], meta: { keywords: ["react", "remix", "framework", "remix.run", "full stack"] }, translations: [{ language: "\u65E5\u672C\u8A9E", link: "https://note.com/lada496/n/n7fb44b901364" }], bannerCloudinaryId: "unsplash/photo-1609667083964-f3dbecb7e7a5", bannerCredit: "Photo by [Jan Huber](https://unsplash.com/photos/oTCRizM-PUI)" };
    function d(n) {
      let e = { a: "a", code: "code", em: "em", h2: "h2", img: "img", li: "li", ol: "ol", p: "p", pre: "pre", span: "span", ul: "ul", ...n.components };
      return (0, a.jsxs)(a.Fragment, { children: [(0, a.jsxs)("callout-danger", { children: [(0, a.jsxs)(e.p, { children: [`Please keep in mind that this is a
`, (0, a.jsx)(e.a, { href: "/blog?q=super+simple+start", children: '"Super Simple Start"' }), ` article. That means that
target audience for this article is people who have experience with Remix and
are curious about how the bits and pieces work without all the nice things Remix
provides for you out of the box. Because of that, this article might make it
seem like Remix is harder to use than it really is. This is not a good article
to read if you're just getting started with Remix or want an introduction to it.`] }), (0, a.jsx)(e.p, { children: "I'll write a good beginner's guide article soon." })] }), `
`, (0, a.jsxs)(e.p, { children: [`Remix has me more excited about building better websites than anything else
since I started using React back in 2015. I have so much to say about it, but
for this blog post, we're going to remove as many distractions as possible and
give remix the "super simple start" treatment. So, even though Remix has a fancy
`, (0, a.jsx)(e.code, { children: "npx create-remix@latest" }), ` thing you can run (which is much easier than what I'm
going to show you), we're going to skip that and build a simple remix app from
absolutely nothing to running so we can inspect each bit required to get it
going.`] }), `
`, (0, a.jsx)(e.p, { children: `Before we get started, create a folder for our project. I'm going to be super
original and put mine on the desktop with the folder name
"super-simple-start-to-remix". Alright, now we're ready to go!` }), `
`, (0, a.jsx)(e.h2, { id: "1-installing-remix", children: (0, a.jsx)(e.a, { href: "#1-installing-remix", children: "1. Installing Remix" }) }), `
`, (0, a.jsx)(e.p, { children: `We can install Remix together with the other packages we need to get things
started like we always do:` }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "sh", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "npm" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "install" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "react" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "react-dom" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "2", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "npm" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "install" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "--save-dev" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "@remix-run/dev" }), `
`] })] }) }), `
`, (0, a.jsx)(e.h2, { id: "2-configuring-remix", children: (0, a.jsx)(e.a, { href: "#2-configuring-remix", children: "2. Configuring Remix" }) }), `
`, (0, a.jsxs)(e.p, { children: [`Cool, with those things installed, let's configure Remix. Create a
`, (0, a.jsx)(e.code, { children: "remix.config.js" }), ":"] }), `
`, (0, a.jsx)(e.pre, { "data-filename": "remix.config.js", "data-line-numbers": "true", "data-lang": "js", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsx)(e.code, { children: (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0C)" }, children: "module" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0C)" }, children: "exports" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), " {}", `
`] }) }) }), `
`, (0, a.jsx)(e.p, { children: `Yup, that's all you need. The defaults all work fine, but remix won't build
without the config file, so we'll create that.` }), `
`, (0, a.jsx)(e.h2, { id: "3-building-the-app-with-remix", children: (0, a.jsx)(e.a, { href: "#3-building-the-app-with-remix", children: "3. Building the app with Remix" }) }), `
`, (0, a.jsxs)(e.p, { children: ["Let's add a ", (0, a.jsx)(e.code, { children: "build" }), " script to our ", (0, a.jsx)(e.code, { children: "package.json" }), ":"] }), `
`, (0, a.jsx)(e.pre, { "data-filename": "package.json", "data-line-numbers": "true", "data-lang": "json", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: ["{", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "2", children: ["	", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "scripts" }), '"', ": {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "3", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "build" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "remix build" }), '"', `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "4", children: ["	},", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "5", children: ["	", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "dependencies" }), '"', ": {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "6", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "react" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^18.2.0" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "7", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "react-dom" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^18.2.0" }), '"', `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "8", children: ["	},", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "9", children: ["	", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "devDependencies" }), '"', ": {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "10", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "@remix-run/dev" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^1.6.5" }), '"', `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "11", children: ["	}", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "12", children: ["}", `
`] })] }) }), `
`, (0, a.jsx)(e.p, { children: "Sweet, let's run the build!" }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "sh", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "npm" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "run" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "build" }), `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "2", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "Building" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "Remix" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "app" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "in" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "production" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "mode..." }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "Missing" }), " ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "entry.client" }), '"', " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "file" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "in" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "~/Desktop/super-simple-start-to-remix/app" }), `
`] })] }) }), `
`, (0, a.jsx)(e.p, { children: "Ah, yeah, let's add that file:" }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "sh", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "mkdir" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "app" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "2", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "touch" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "app/entry.client.jsx" }), `
`] })] }) }), `
`, (0, a.jsx)(e.p, { children: "And run the build again:" }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "sh", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "npm" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "run" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "build" }), `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "2", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "Building" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "Remix" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "app" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "in" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "production" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "mode..." }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "Missing" }), " ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "entry.server" }), '"', " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "file" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "in" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "~/Desktop/super-simple-start-to-remix/app" }), `
`] })] }) }), `
`, (0, a.jsx)(e.p, { children: "Ok, let's add that one:" }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "sh", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsx)(e.code, { children: (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "touch" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "app/entry.server.jsx" }), `
`] }) }) }), `
`, (0, a.jsx)(e.p, { children: "And again:" }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "sh", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "npm" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "run" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "build" }), `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "2", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "Building" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "Remix" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "app" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "in" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "production" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "mode..." }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "Missing" }), " ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "root" }), '"', " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "file" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "in" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "~/Desktop/super-simple-start-to-remix/app" }), `
`] })] }) }), `
`, (0, a.jsx)(e.p, { children: "Maybe this is the last one?" }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "sh", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsx)(e.code, { children: (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "touch" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "app/root.jsx" }), `
`] }) }) }), `
`, (0, a.jsx)(e.p, { children: "Ok, let's run the build one more time:" }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "sh", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "npm" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "run" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "build" }), `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "2", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "Building" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "Remix" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "app" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "in" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "production" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "mode..." }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "Built" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "in" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "234ms" }), `
`] })] }) }), `
`, (0, a.jsxs)(e.p, { children: [`Success! Let's check out our file structure now. Here it is pre-build (ignoring
`, (0, a.jsx)(e.code, { children: "node_modules" }), "):"] }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "sh", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "." }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "2", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "app" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2502" }), "   ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "entry.client.jsx" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2502" }), "   ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "entry.server.jsx" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "5", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2502" }), "   ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u2514\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "root.jsx" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "6", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "package-lock.json" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "7", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "package.json" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "8", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2514\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "remix.config.js" }), `
`] })] }) }), `
`, (0, a.jsxs)(e.p, { children: ["And once we run ", (0, a.jsx)(e.code, { children: "npm run build" }), " remix creates a few files for us:"] }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "sh", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "." }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "2", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "app" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2502" }), "   ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "entry.client.jsx" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2502" }), "   ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "entry.server.jsx" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "5", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2502" }), "   ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u2514\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "root.jsx" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "6", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "build" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "7", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2502" }), "   ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "assets.json" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "8", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2502" }), "   ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u2514\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "index.js" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "9", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "package-lock.json" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "10", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "package.json" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "11", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "public" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "12", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2502" }), "   ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u2514\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "build" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "13", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2502" }), "       ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "_shared" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "14", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2502" }), "       ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u2502" }), "   ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u2514\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "chunk-DH6LPQ4Z.js" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "15", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2502" }), "       ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "entry.client-CY7AAJ4Q.js" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "16", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2502" }), "       ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u251C\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "manifest-12E650A9.js" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "17", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2502" }), "       ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u2514\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "root-JHXSOSD4.js" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "18", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2514\u2500\u2500" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "remix.config.js" }), `
`] })] }) }), `
`, (0, a.jsx)("callout-info", { children: (0, a.jsxs)(e.p, { children: [`Note: Remix supports TypeScript out of the box, but we're keeping this simple.
Also, because we plan to use JSX in these files, they need the `, (0, a.jsx)(e.code, { children: ".jsx" }), `
extension. Remix uses esbuild which requires a `, (0, a.jsx)(e.code, { children: ".jsx" }), " or ", (0, a.jsx)(e.code, { children: ".tsx" }), ` extension if
you want to use JSX.`] }) }), `
`, (0, a.jsx)(e.p, { children: "Sweet! We built it... Now what?" }), `
`, (0, a.jsx)(e.h2, { id: "4-coding-our-remix-app", children: (0, a.jsx)(e.a, { href: "#4-coding-our-remix-app", children: "4. Coding our Remix App" }) }), `
`, (0, a.jsx)(e.p, { children: `Remix is a server-side rendering React framework. So far we've just got it
compiling things for us. Let's actually get a server running and show something
on the screen.` }), `
`, (0, a.jsxs)(e.p, { children: ["Let's start by filling in the ", (0, a.jsx)(e.code, { children: "root.jsx" }), ` with something. This is the root
element Remix will render:`] }), `
`, (0, a.jsx)(e.pre, { "data-filename": "app/root.jsx", "data-line-numbers": "true", "data-lang": "tsx", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "import" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "*" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "as" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "React" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "from" }), " ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "react" }), "'", `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "2", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "export" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "default" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "function" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "App" }), "() {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "const" }), " [", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "count" }), ", ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "setCount" }), "] ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "React" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "useState" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "0" }), ")", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "5", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "return" }), " (", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "6", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "html" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "7", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "head" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "8", children: ["				<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "title" }), ">My First Remix App</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "title" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "9", children: ["			</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "head" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "10", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "body" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "11", children: ["				<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "p" }), ">This is a remix app. Hooray!</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "p" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "12", children: ["				<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "button" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "onClick" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), "() ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "=>" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "setCount" }), "((", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "c" }), ") ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "=>" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "c" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "+" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "1" }), ")", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), ">", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "count" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), "</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "button" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "13", children: ["			</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "body" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "14", children: ["		</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "html" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "15", children: ["	)", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "16", children: ["}", `
`] })] }) }), `
`, (0, a.jsxs)(e.p, { children: ["It's neat that we get to render the ", (0, a.jsx)(e.code, { children: "<html>" }), ` element right? Yeah, that's cooler
than you think it is I promise you.`] }), `
`, (0, a.jsxs)(e.p, { children: ["Ok, next, let's fill in the ", (0, a.jsx)(e.code, { children: "entry.client.jsx" }), ":"] }), `
`, (0, a.jsx)(e.pre, { "data-filename": "app/entry.client.jsx", "data-line-numbers": "true", "data-lang": "tsx", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "import" }), " { ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "RemixBrowser" }), " } ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "from" }), " ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "@remix-run/react" }), "'", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "2", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "import" }), " { ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "hydrateRoot" }), " } ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "from" }), " ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "react-dom/client" }), "'", `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "3", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "hydrateRoot" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "document" }), ", <", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "RemixBrowser" }), " />)", `
`] })] }) }), `
`, (0, a.jsxs)(e.p, { children: ["What's that? We're... HYDRATING the ", (0, a.jsx)(e.code, { children: "document" }), "?! How neat is that?!"] }), `
`, (0, a.jsxs)(e.p, { children: ["And finally, let's fill in the ", (0, a.jsx)(e.code, { children: "entry.server.jsx" }), ":"] }), `
`, (0, a.jsx)(e.pre, { "data-filename": "app/entry.server.jsx", "data-line-numbers": "true", "data-lang": "tsx", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "import" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "ReactDOMServer" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "from" }), " ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "react-dom/server" }), "'", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "2", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "import" }), " { ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "RemixServer" }), " } ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "from" }), " ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "@remix-run/react" }), "'", `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "3", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "export" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "default" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "function" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "handleRequest" }), "(", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "5", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "request" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "6", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "responseStatusCode" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "7", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "responseHeaders" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "8", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "remixContext" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "9", children: [") {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "10", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "const" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "markup" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "ReactDOMServer" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "renderToString" }), "(", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "11", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "RemixServer" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "context" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "remixContext" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "url" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "request" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "url" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " />,", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "12", children: ["	)", `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "13", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "14", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "responseHeaders" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "set" }), "(", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "Content-Type" }), "'", ", ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "text/html" }), "'", ")", `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "15", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "16", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "return" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "new" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "Response" }), "(", "`", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "<!DOCTYPE html>" }), "${", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "markup" }), "}`", ", {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "17", children: ["		status: ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "responseStatusCode" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "18", children: ["		headers: ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "responseHeaders" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "19", children: ["	})", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "20", children: ["}", `
`] })] }) }), `
`, (0, a.jsxs)(e.p, { children: [`This one's pretty cool too. So we export a default function that accepts
everything we need, and `, (0, a.jsx)(e.em, { children: "we" }), " get to return the response. That ", (0, a.jsx)(e.code, { children: "Response" }), ` object
is a `, (0, a.jsx)(e.em, { children: "real" }), " ", (0, a.jsx)(e.code, { children: "Response" }), ` object (or, at least the node-equivalent of one).
`, (0, a.jsx)(e.a, { href: "https://developer.mozilla.org/en-US/docs/Web/API/Response/Response", children: "Learn more on freaking MDN" }), `!
(Sorry, I just really love this part of Remix).`] }), `
`, (0, a.jsxs)(e.p, { children: ["I really love how much control we get here. ", (0, a.jsx)(e.em, { children: "We" }), ` are in charge of calling
`, (0, a.jsx)(e.code, { children: "renderToString" }), " and ", (0, a.jsx)(e.code, { children: "hydrate" }), `. That gives us a lot of power and it also means
we don't need to learn extra special APIs Remix made for us and they don't need
to make extra-special options to customize any of this, because the control is
in our hands. Very cool.`] }), `
`, (0, a.jsx)(e.p, { children: "Alright, let's try running the build again!" }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "sh", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "npm" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "run" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "build" }), `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "2", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "Building" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "Remix" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "app" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "in" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "production" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "mode..." }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "The" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "path" }), " ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "@remix-run/react" }), '"', " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "is" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "imported" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "in" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "app/entry.server.jsx" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "but" }), " ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "@remix-run/react" }), '"', " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "was" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "not" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "found" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "in" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "your" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "node_modules." }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "Did" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "you" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "forget" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "to" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "install" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "it?" }), `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "5", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "6", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2718" }), " [ERROR] Could not resolve ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "@remix-run/react" }), '"', `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "7", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "8", children: ["    ", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "app/entry.client.jsx:1:29:" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "9", children: ["      ", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "1" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "\u2502" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "import" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "{" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "RemixBrowser" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "}" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "from" }), " ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "@remix-run/react" }), '"', ";", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "10", children: ["        ", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "\u2575" }), "                              ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "~~~~~~~~~~~~~~~~~~" }), `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "11", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "12", children: ["  ", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "You" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "can" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "mark" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "the" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "path" }), " ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "@remix-run/react" }), '"', " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "as" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "external" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "to" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "exclude" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "it" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "from" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "the" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "bundle," }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "which" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "will" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "remove" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "this" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "error." }), `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "13", children: `
` }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "14", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "15", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "Build" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "failed" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "with" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "1" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "error:" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "16", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "app/entry.client.jsx:1:29:" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "ERROR:" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "Could" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "not" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "resolve" }), " ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "@remix-run/react" }), '"', `
`] })] }) }), `
`, (0, a.jsxs)(e.p, { children: ["Oh, right, we're using the ", (0, a.jsx)(e.code, { children: "@remix-run/react" }), " package for the ", (0, a.jsx)(e.code, { children: "RemixBrowser" }), ` and
`, (0, a.jsx)(e.code, { children: "RemixServer" }), " components. Let's install that:"] }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "sh", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsx)(e.code, { children: (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "npm" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "install" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "@remix-run/react" }), `
`] }) }) }), `
`, (0, a.jsx)(e.p, { children: "Now let's try the build again:" }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "sh", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "npm" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "run" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "build" }), `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "2", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "Building" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "Remix" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "app" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "in" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "production" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "mode..." }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "Built" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "in" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "121ms" }), `
`] })] }) }), `
`, (0, a.jsxs)(e.p, { children: ["Sweet! It worked \u{1F389} So now we actually have something ", (0, a.jsx)(e.em, { children: "real" }), ` that'll run and
build. Onto the next step!`] }), `
`, (0, a.jsx)(e.h2, { id: "5-running-our-remix-server", children: (0, a.jsx)(e.a, { href: "#5-running-our-remix-server", children: "5. Running our Remix server" }) }), `
`, (0, a.jsxs)(e.p, { children: ["There are ", (0, a.jsx)(e.code, { children: "@remix-run/{adapter}" }), ` packages that we can use for server-side
platform-specific stuff. Currently, here are all the adapters we can use
currently:`] }), `
`, (0, a.jsx)(e.p, { children: "Deploy anywhere you can ship node and/or a docker container:" }), `
`, (0, a.jsxs)(e.ul, { children: [`
`, (0, a.jsx)(e.li, { children: (0, a.jsx)(e.code, { children: "@remix-run/node" }) }), `
`, (0, a.jsx)(e.li, { children: (0, a.jsx)(e.code, { children: "@remix-run/express" }) }), `
`, (0, a.jsx)(e.li, { children: (0, a.jsx)(e.code, { children: "@remix-run/serve" }) }), `
`] }), `
`, (0, a.jsx)(e.p, { children: "Deploy to specific platforms (serverless etc.):" }), `
`, (0, a.jsxs)(e.ul, { children: [`
`, (0, a.jsx)(e.li, { children: (0, a.jsx)(e.code, { children: "@remix-run/deno" }) }), `
`, (0, a.jsx)(e.li, { children: (0, a.jsx)(e.code, { children: "@remix-run/architect" }) }), `
`, (0, a.jsx)(e.li, { children: (0, a.jsx)(e.code, { children: "@remix-run/vercel" }) }), `
`, (0, a.jsx)(e.li, { children: (0, a.jsx)(e.code, { children: "@remix-run/netlify" }) }), `
`, (0, a.jsx)(e.li, { children: (0, a.jsx)(e.code, { children: "@remix-run/cloudflare-workers" }) }), `
`] }), `
`, (0, a.jsx)(e.p, { children: `And you can even build your own adapter. Most adapters are just a couple hundred
lines of code (and some aren't even that much).` }), `
`, (0, a.jsx)(e.p, { children: `The primary thing these adapters do is convert the Request/Response from the
platform-specific objects to the Web-standard Request/Response (or a polyfilled
version of that).` }), `
`, (0, a.jsxs)(e.p, { children: ["For our simple app, we're going to use ", (0, a.jsx)(e.code, { children: "@remix-run/serve" }), ` which is built on top
of `, (0, a.jsx)(e.code, { children: "@remix-run/express" }), " which actually is built on top of ", (0, a.jsx)(e.code, { children: "@remix-run/node" }), `. So
this can deploy anywhere you can deploy a `, (0, a.jsx)(e.code, { children: "node" }), ` server. The cool thing is that
if you want to deploy anywhere else you totally can and you just need to swap
out the adapter you're using in the `, (0, a.jsx)(e.code, { children: "package.json" }), ` and so long as your own code
and other dependencies are supported by the platform, you should be good to go.`] }), `
`, (0, a.jsxs)(e.p, { children: ["Let's install ", (0, a.jsx)(e.code, { children: "@remix-run/serve" }), "."] }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "sh", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsx)(e.code, { children: (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "npm" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "install" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "@remix-run/serve" }), `
`] }) }) }), `
`, (0, a.jsxs)(e.p, { children: [`Alright, so we want to "develop" our app right? So let's add `, (0, a.jsx)(e.code, { children: "dev" }), ` script to our
`, (0, a.jsx)(e.code, { children: "package.json" }), ":"] }), `
`, (0, a.jsx)(e.pre, { "data-filename": "package.json", "data-line-numbers": "true", "data-lang": "json", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: ["{", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "2", children: ["	", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "scripts" }), '"', ": {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "build" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "remix build" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "4", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "dev" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "remix dev" }), '"', `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "5", children: ["	},", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "6", children: ["	", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "dependencies" }), '"', ": {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "7", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "@remix-run/react" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^1.6.5" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "8", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "@remix-run/serve" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^1.6.5" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "9", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "react" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^18.2.0" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "10", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "react-dom" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^18.2.0" }), '"', `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "11", children: ["	},", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "12", children: ["	", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "devDependencies" }), '"', ": {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "13", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "@remix-run/dev" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^1.6.5" }), '"', `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "14", children: ["	}", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "15", children: ["}", `
`] })] }) }), `
`, (0, a.jsxs)(e.p, { children: ["And now if we run ", (0, a.jsx)(e.code, { children: "npm run dev" }), " we'll get this output:"] }), `
`, (0, a.jsx)(e.pre, { children: (0, a.jsx)(e.code, { children: `Watching Remix app in development mode...
\u{1F4BF} Built in 156ms
Remix App Server started at http://localhost:3000 (http://192.168.115.103:3000)` }) }), `
`, (0, a.jsxs)(e.p, { children: ["That output shows that ", (0, a.jsx)(e.code, { children: "remix dev" }), " does two things:"] }), `
`, (0, a.jsxs)(e.ol, { children: [`
`, (0, a.jsxs)(e.li, { children: [(0, a.jsx)(e.code, { children: "Remix App Server started at http://localhost:3000" }), `: This comes from
`, (0, a.jsx)(e.code, { children: "remix-serve" }), ` which is running a simple express server based on what's in the
`, (0, a.jsx)(e.code, { children: "build" }), " directory."] }), `
`, (0, a.jsxs)(e.li, { children: [(0, a.jsx)(e.code, { children: "\u{1F4BF} Built in 156ms" }), ": This comes from ", (0, a.jsx)(e.code, { children: "remix build" }), ` which is running in watch
mode and development mode.`] }), `
`] }), `
`, (0, a.jsxs)(e.p, { children: ["Whenever we make a change, the output in ", (0, a.jsx)(e.code, { children: "build" }), ` is updated and the express
server picks up those changes.`] }), `
`, (0, a.jsxs)(e.p, { children: ["One other thing ", (0, a.jsx)(e.code, { children: "remix dev" }), ` does is start a websocket with the browser to
support live reload. Currently there's no support for "Hot Module Replacement"
(HMR) and I know that for a lot of people that's a ship stopper, but I encourage
you to stick around. Eventually HMR will be supported. Personally, I'm actually
totally cool with that. I never trusted HMR in apps anyway (though it's awesome
in tools like storybook) and always did a full-page refresh even with HMR setup.
Additionally, since a lot of the code you write with remix is server-side, you
typically want a full-page refresh anyway to get all the server-side code to run
again. Again, HMR will come in the future.`] }), `
`, (0, a.jsxs)(e.p, { children: [`Ok, great, let's get this opened up! Navigate to
`, (0, a.jsx)(e.a, { href: "http://localhost:3000", children: "localhost:3000" }), " and poof:"] }), `
`, (0, a.jsx)(e.p, { children: (0, a.jsx)(e.img, { src: "https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0,w_1600/v1620151304/kentcdodds.com/blog/super-simple-start-to-remix/app_ol57hw.png", alt: 'Browser window with the text "This is a remix app. Hooray!"" And a button with the number 0 in it' }) }), `
`, (0, a.jsx)(e.h2, { id: "6-hydrating-our-remix-app", children: (0, a.jsx)(e.a, { href: "#6-hydrating-our-remix-app", children: "6. Hydrating our Remix app" }) }), `
`, (0, a.jsx)(e.p, { children: `But oh no! If we click that button nothing happens. Weird... I thought this was
a react app. Let's take a look at the network tab:` }), `
`, (0, a.jsx)(e.p, { children: (0, a.jsx)(e.img, { src: "https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0,w_1600/v1620395539/kentcdodds.com/blog/super-simple-start-to-remix/network-tab_iyg7iy.png", alt: "Network tab showing two GET requests, one for the document and the other for a favicon" }) }), `
`, (0, a.jsxs)(e.p, { children: [`Notice anything missing? Oh yeah! No JavaScript! Yup, that's right, with Remix
you get to choose whether you load any JavaScript at all. And it's not a
configuration thing. Remember how we are in charge of the entire document
starting from `, (0, a.jsx)(e.code, { children: "<html>" }), "? Cool right? So let's update our ", (0, a.jsx)(e.code, { children: "app/root.jsx" }), ` to
include the script tag. Remix conveniently gives us a component we can render to
render that script tag:`] }), `
`, (0, a.jsx)(e.pre, { "data-filename": "app/root.jsx", "data-line-numbers": "true", "data-lang": "tsx", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "import" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "*" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "as" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "React" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "from" }), " ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "react" }), "'", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "2", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "import" }), " { ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "Scripts" }), " } ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "from" }), " ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "@remix-run/react" }), "'", `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "3", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "export" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "default" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "function" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "App" }), "() {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "5", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "const" }), " [", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "count" }), ", ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "setCount" }), "] ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "React" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "useState" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "0" }), ")", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "6", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "return" }), " (", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "7", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "html" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "8", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "head" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "9", children: ["				<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "title" }), ">My First Remix App</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "title" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "10", children: ["			</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "head" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "11", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "body" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "12", children: ["				<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "p" }), ">This is a remix app. Hooray!</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "p" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "13", children: ["				<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "button" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "onClick" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), "() ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "=>" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "setCount" }), "((", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "c" }), ") ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "=>" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "c" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "+" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "1" }), ")", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), ">", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "count" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), "</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "button" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "14", children: ["				<", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "Scripts" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "15", children: ["			</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "body" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "16", children: ["		</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "html" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "17", children: ["	)", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "18", children: ["}", `
`] })] }) }), `
`, (0, a.jsx)(e.p, { children: `Also that missing favicon thing is annoying so I'll add this cool CD as a
favicon:` }), `
`, (0, a.jsx)("img", { style: { width: 60, display: "block", marginLeft: "auto", marginRight: "auto" }, alt: "CD", src: "https://res.cloudinary.com/kentcdodds-com/image/upload/w_120,q_auto,dpr_2.0/v1620153603/kentcdodds.com/blog/super-simple-start-to-remix/favicon_vsvcsr.ico" }), `
`, (0, a.jsxs)(e.p, { children: ["Just put that ", (0, a.jsx)(e.code, { children: ".ico" }), " file in the ", (0, a.jsx)(e.code, { children: "public" }), " directory. ", (0, a.jsx)(e.code, { children: "@remix-run/serve" }), ` will
automatically serve files in that directory and the browser (which by looks for
that file by default) will be able to get it that way.`] }), `
`, (0, a.jsx)(e.p, { children: "Neato, let's try that now:" }), `
`, (0, a.jsx)(e.p, { children: (0, a.jsx)(e.img, { src: "https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0,w_1600/v1620153551/kentcdodds.com/blog/super-simple-start-to-remix/network-tab-with-scripts_tdibpc.png", alt: "Network tab with scripts getting loaded" }) }), `
`, (0, a.jsx)(e.p, { children: `And if we "view source" on the document here's what we get (formatted):` }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "html", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: ["<!", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "doctype" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "html" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "2", children: ["<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "html" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: ["	<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "head" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "title" }), ">My First Remix App</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "title" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "5", children: ["	</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "head" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "6", children: ["	<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "body" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "7", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "p" }), ">This is a remix app. Hooray!</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "p" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "8", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "button" }), ">0</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "button" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "9", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "link" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "rel" }), "=", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "modulepreload" }), '"', " ", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "href" }), "=", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "/build/_shared/chunk-PYN2BJX3.js" }), '"', " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "10", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "link" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "rel" }), "=", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "modulepreload" }), '"', " ", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "href" }), "=", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "/build/root-FYPD7R2X.js" }), '"', " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "11", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "script" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "12", children: ["			", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "window" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "__remixContext" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), " {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "13", children: ["				actionData: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "undefined" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "14", children: ["				appState: {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "15", children: ["					trackBoundaries: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "true" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "16", children: ["					trackCatchBoundaries: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "true" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "17", children: ["					catchBoundaryRouteId: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "null" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "18", children: ["					renderBoundaryRouteId: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "null" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "19", children: ["					loaderBoundaryRouteId: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "null" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "20", children: ["					error: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "undefined" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "21", children: ["					catch: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "undefined" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "22", children: ["				},", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "23", children: ["				matches: [", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "24", children: ["					{", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "25", children: ["						params: {},", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "26", children: ["						pathname: ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "/" }), "'", ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "27", children: ["						route: {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "28", children: ["							id: ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "root" }), "'", ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "29", children: ["							parentId: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "undefined" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "30", children: ["							path: ", "''", ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "31", children: ["							index: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "undefined" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "32", children: ["							caseSensitive: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "undefined" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "33", children: ["							module: ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "/build/root-FYPD7R2X.js" }), "'", ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "34", children: ["							imports: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "undefined" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "35", children: ["							hasAction: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "false" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "36", children: ["							hasLoader: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "false" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "37", children: ["							hasCatchBoundary: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "false" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "38", children: ["							hasErrorBoundary: ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "false" }), ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "39", children: ["						},", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "40", children: ["					},", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "41", children: ["				],", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "42", children: ["				routeData: {},", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "43", children: ["			}", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "44", children: ["		</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "script" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "45", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "script" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "src" }), "=", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "/build/manifest-142295AD.js" }), '"', "></", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "script" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "46", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "script" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "type" }), "=", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "module" }), '"', ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "47", children: ["			", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "import" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "*" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "as" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "route0" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "from" }), " ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "/build/root-FYPD7R2X.js" }), "'", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "48", children: ["			", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "window" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "__remixRouteModules" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), " { root: ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "route0" }), " }", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "49", children: ["		</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "script" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "50", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "script" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "src" }), "=", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "/build/entry.client-UK7WD5HF.js" }), '"', " ", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "type" }), "=", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "module" }), '"', "></", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "script" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "51", children: ["	</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "body" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "52", children: ["</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "html" }), ">", `
`] })] }) }), `
`, (0, a.jsx)(e.p, { children: `So that's neat. Not only does Remix add script tags, but it also preloads things
for us, so we don't have a waterfall (you'll notice the network tab has all
resources starting to load at the same time). This gets even more interesting
when we start routing, but we'll keep things simple.` }), `
`, (0, a.jsx)(e.h2, { id: "7-running-production-mode-locally", children: (0, a.jsx)(e.a, { href: "#7-running-production-mode-locally", children: "7. Running Production Mode locally" }) }), `
`, (0, a.jsx)(e.p, { children: `Alright, let's build and run this thing locally. So first we need to run the
production build to get everything minified and have React optimize itself for
production:` }), `
`, (0, a.jsx)(e.pre, { children: (0, a.jsx)(e.code, { children: `npm run build

Building Remix app in production mode...
Built in 281ms` }) }), `
`, (0, a.jsxs)(e.p, { children: ["Now, let's add a ", (0, a.jsx)(e.code, { children: "start" }), " script to run ", (0, a.jsx)(e.code, { children: "remix-serve" }), " for our ", (0, a.jsx)(e.code, { children: "build" }), " directory:"] }), `
`, (0, a.jsx)(e.pre, { "data-filename": "package.json", "data-line-numbers": "true", "data-lang": "json", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: ["{", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "2", children: ["	", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "scripts" }), '"', ": {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "build" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "remix build" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "dev" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "remix dev" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "5", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "start" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "remix-serve ./build" }), '"', `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "6", children: ["	},", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "7", children: ["	", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "dependencies" }), '"', ": {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "8", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "@remix-run/react" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^1.6.5" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "9", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "@remix-run/serve" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^1.6.5" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "10", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "react" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^18.2.0" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "11", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "react-dom" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^18.2.0" }), '"', `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "12", children: ["	},", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "13", children: ["	", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "devDependencies" }), '"', ": {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "14", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "@remix-run/dev" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^1.6.5" }), '"', `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "15", children: ["	}", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "16", children: ["}", `
`] })] }) }), `
`, (0, a.jsxs)(e.p, { children: ["One other thing we'll want to do is set the ", (0, a.jsx)(e.code, { children: "NODE_ENV" }), " to ", (0, a.jsx)(e.code, { children: "production" }), ` so any
dependencies we use that operate slightly differently in production mode will
work as expected, so let's add `, (0, a.jsx)(e.code, { children: "cross-env" }), " and set the ", (0, a.jsx)(e.code, { children: "NODE_ENV" }), " with that:"] }), `
`, (0, a.jsx)(e.pre, { "data-filename": "package.json", "data-line-numbers": "true", "data-lang": "json", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: ["{", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "2", children: ["	", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "scripts" }), '"', ": {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "build" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "remix build" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "dev" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "remix dev" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "5", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "start" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "cross-env NODE_ENV=production remix-serve ./build" }), '"', `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "6", children: ["	},", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "7", children: ["	", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "dependencies" }), '"', ": {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "8", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "@remix-run/react" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^1.6.5" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "9", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "@remix-run/serve" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^1.6.5" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "10", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "cross-env" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^7.0.3" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "11", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "react" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^18.2.0" }), '"', ",", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "12", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "react-dom" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^18.2.0" }), '"', `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "13", children: ["	},", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "14", children: ["	", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "devDependencies" }), '"', ": {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "15", children: ["		", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "@remix-run/dev" }), '"', ": ", '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "^1.6.5" }), '"', `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "16", children: ["	}", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "17", children: ["}", `
`] })] }) }), `
`, (0, a.jsx)(e.p, { children: "Cool, so let's get it started:" }), `
`, (0, a.jsx)(e.pre, { children: (0, a.jsx)(e.code, { children: `npm start

Remix App Server started at http://localhost:3000 (http://192.168.115.103:3000)` }) }), `
`, (0, a.jsx)(e.p, { children: "And if we open that up, we'll see it's working perfectly:" }), `
`, (0, a.jsx)(e.p, { children: (0, a.jsx)(e.img, { src: "https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0,w_1600/v1620155777/kentcdodds.com/blog/super-simple-start-to-remix/app-running-in-production_hnbdvy.png", alt: "The working app" }) }), `
`, (0, a.jsx)(e.p, { children: "Hooray!" }), `
`, (0, a.jsx)(e.h2, { id: "conclusion", children: (0, a.jsx)(e.a, { href: "#conclusion", children: "Conclusion" }) }), `
`, (0, a.jsxs)(e.p, { children: [`You have a lot of options for actually deploying your Remix app to production
and when you set up Remix the easy way (via `, (0, a.jsx)(e.code, { children: "npx create-remix@latest" }), `) it'll let
you choose which supported service you'd like to use and it'll spit out all the
config and instructions to get started that you need, so I'm not going to cover
that here.`] }), `
`, (0, a.jsxs)(e.p, { children: ["There is ", (0, a.jsx)(e.em, { children: "so" }), ` much more to Remix, but this is a "super simple start" so I wanted
to do as little as possible to show you where all the moving pieces are to get
something up and running with Remix. Like I said, `, (0, a.jsx)(e.code, { children: "npx create-remix@latest" }), `
makes all this a snap, but hopefully this walkthrough helped you get an idea of
what parts of remix does what.`] }), `
`, (0, a.jsxs)(e.p, { children: [`You can find the code for this walkthrough here:
`, (0, a.jsx)(e.a, { href: "https://github.com/kentcdodds/super-simple-start-to-remix", children: "kentcdodds/super-simple-start-to-remix" })] }), `
`, (0, a.jsx)(e.p, { children: "Enjoy!" })] });
    }
    function h(n = {}) {
      let { wrapper: e } = n.components || {};
      return e ? (0, a.jsx)(e, { ...n, children: (0, a.jsx)(d, { ...n }) }) : d(n);
    }
    return N(x);
  })();
  ;
  return Component;
})();
var stdin_default = MDXContent;
export {
  stdin_default as default
};
