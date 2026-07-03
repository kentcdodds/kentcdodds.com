// <stdin>
import * as React from "react";
import * as _jsx_runtime from "react/jsx-runtime";
var MDXContent = (() => {
  var Component = (() => {
    var N = Object.create;
    var c = Object.defineProperty;
    var D = Object.getOwnPropertyDescriptor;
    var F = Object.getOwnPropertyNames;
    var x = Object.getPrototypeOf, E = Object.prototype.hasOwnProperty;
    var p = (n, e) => () => (e || n((e = { exports: {} }).exports, e), e.exports), R = (n, e) => {
      for (var s in e) c(n, s, { get: e[s], enumerable: true });
    }, b = (n, e, s, r) => {
      if (e && typeof e == "object" || typeof e == "function") for (let o of F(e)) !E.call(n, o) && o !== s && c(n, o, { get: () => e[o], enumerable: !(r = D(e, o)) || r.enumerable });
      return n;
    };
    var i = (n, e, s) => (s = n != null ? N(x(n)) : {}, b(e || !n || !n.__esModule ? c(s, "default", { value: n, enumerable: true }) : s, n)), C = (n) => b(c({}, "__esModule", { value: true }), n);
    var d = p((j, m) => {
      m.exports = _jsx_runtime;
    });
    var u = p((G, y) => {
      y.exports = React;
    });
    var T = {};
    R(T, { default: () => w, frontmatter: () => I });
    var a = i(d());
    var t = i(u()), l = i(d());
    function S(n) {
      let e = Date.now() + n;
      for (; e > Date.now(); ) ;
    }
    function v({ time: n, onChange: e }) {
      return S(n), (0, l.jsxs)("div", { children: ["Wow, that was", " ", (0, l.jsx)("input", { "aria-label": "time in milliseconds", value: n, type: "number", min: "0", max: "3000", onChange: (s) => e(Number(s.target.value)) }), "ms slow"] });
    }
    function A({ time: n, dog: e, onChange: s }) {
      return (0, l.jsxs)("div", { children: [(0, l.jsx)("label", { htmlFor: "dog", children: "Dog Name" }), (0, l.jsx)("br", {}), (0, l.jsx)("input", { id: "dog", value: e, onChange: (r) => s(r.target.value) }), (0, l.jsx)("p", { children: e ? `${e}'s favorite number is ${n}.` : "enter a dog name" })] });
    }
    function g() {
      let [n, e] = t.useState(""), [s, r] = t.useState(200);
      return (0, l.jsxs)("div", { children: [(0, l.jsx)(A, { time: s, dog: n, onChange: e }), (0, l.jsx)(v, { time: s, onChange: r })] });
    }
    function B({ time: n }) {
      let [e, s] = t.useState("");
      return (0, l.jsxs)("div", { children: [(0, l.jsx)("label", { htmlFor: "dog", children: "Dog Name" }), (0, l.jsx)("br", {}), (0, l.jsx)("input", { id: "dog", value: e, onChange: (r) => s(r.target.value) }), (0, l.jsx)("p", { children: e ? `${e}'s favorite number is ${n}.` : "enter a dog name" })] });
    }
    function f() {
      let [n, e] = t.useState(200);
      return (0, l.jsxs)("div", { children: [(0, l.jsx)(B, { time: n }), (0, l.jsx)(v, { time: n, onChange: e })] });
    }
    function h(n) {
      let { className: e, ...s } = n;
      return (0, l.jsx)("div", { className: ["demo", e].filter(Boolean).join(" "), ...s });
    }
    var I = { title: "State Colocation will make your React app faster", date: "2019-09-23", description: "How state colocation makes your app not only more maintainable but also faster.", categories: ["react", "state"], meta: { keywords: ["colocation", "react", "state", "Redux", "mobx"] }, translations: [{ language: "\uD55C\uAD6D\uC5B4", link: "https://ideveloper2.dev/blog/2019-10-12--state-colocation-will-make-your-react-app-faster/" }, { language: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", link: "https://habr.com/ru/post/485032/" }], bannerCloudinaryId: "kentcdodds.com/content/blog/state-colocation-will-make-your-react-app-faster/banner", bannerCredit: "Photo by [Samuel Zeller](https://unsplash.com/photos/j0g8taxHZa0)" };
    function k(n) {
      let e = { a: "a", code: "code", div: "div", em: "em", h2: "h2", iframe: "iframe", img: "img", li: "li", p: "p", pre: "pre", span: "span", strong: "strong", ul: "ul", ...n.components };
      return (0, a.jsxs)(a.Fragment, { children: [(0, a.jsxs)(e.p, { children: [(0, a.jsx)(e.strong, { children: (0, a.jsx)(e.a, { href: "https://egghead.io/lessons/react-lifting-and-colocating-react-state?af=5236ad", children: 'Watch "Lifting and colocating React State" on egghead.io' }) }), `
(part of `, (0, a.jsx)(e.a, { href: "https://kcd.im/beginner-react", children: "The Beginner's Guide to ReactJS" }), ")."] }), `
`, (0, a.jsxs)(e.div, { className: "embed", "data-embed-type": "egghead", children: [`
    `, (0, a.jsxs)(e.div, { style: { paddingBottom: "56.25%" }, children: [`
      `, (0, a.jsx)(e.iframe, { src: "https://egghead.io/lessons/react-lifting-and-colocating-react-state/embed?preload=false&af=5236ad", allowFullScreen: true }), `
    `] }), `
  `] }), `
`, `
`, (0, a.jsx)(e.p, { children: `One of the leading causes to slow React applications is global state, especially
the rapidly changing variety. Allow me to illustrate my point with a super
contrived example, then I'll give you a slightly more realistic example so you
can determine how it can be more practically applicable in your own app.` }), `
`, (0, a.jsx)(h, { children: (0, a.jsx)(g, {}) }), `
`, (0, a.jsx)(e.p, { children: "Here's the code for that" }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "tsx", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "function" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "sleep" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), ") {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "2", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "const" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "done" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "Date" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "now" }), "() ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "+" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "while" }), " (", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "done" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: ">" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "Date" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "now" }), "()) {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: ["		", (0, a.jsx)(e.span, { style: { color: "var(--base03)" }, children: "// sleep..." }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "5", children: ["	}", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "6", children: ["}", `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "7", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "8", children: [(0, a.jsx)(e.span, { style: { color: "var(--base03)" }, children: "// imagine that this slow component is actually slow because it's rendering a" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "9", children: [(0, a.jsx)(e.span, { style: { color: "var(--base03)" }, children: "// lot of data (for example)." }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "10", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "function" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "SlowComponent" }), "({ ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), ", ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "onChange" }), " }) {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "11", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "sleep" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), ")", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "12", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "return" }), " (", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "13", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "div" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "14", children: ["			Wow, that was", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: " " }), "'", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "15", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "input" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "16", children: ["				", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "value" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "17", children: ["				", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "type" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "number" }), '"', `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "18", children: ["				", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "onChange" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "e" }), ") ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "=>" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "onChange" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "Number" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "e" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "target" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "value" }), "))", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "19", children: ["			/>", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "20", children: ["			ms slow", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "21", children: ["		</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "div" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "22", children: ["	)", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "23", children: ["}", `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "24", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "25", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "function" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "DogName" }), "({ ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), ", ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), ", ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "onChange" }), " }) {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "26", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "return" }), " (", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "27", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "div" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "28", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "label" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "htmlFor" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "dog" }), '"', ">Dog Name</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "label" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "29", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "br" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "30", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "input" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "id" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "dog" }), '"', " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "value" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "onChange" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "e" }), ") ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "=>" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "onChange" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "e" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "target" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "value" }), ")", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "31", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "p" }), ">", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "?" }), " ", "`${", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), "}", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "'s favorite number is " }), "${", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), "}", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "." }), "`", " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: ":" }), " ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "enter a dog name" }), "'", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), "</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "p" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "32", children: ["		</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "div" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "33", children: ["	)", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "34", children: ["}", `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "35", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "36", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "function" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "App" }), "() {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "37", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base03)" }, children: '// this is "global state"' }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "38", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "const" }), " [", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), ", ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "setDog" }), "] ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "React" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "useState" }), "(", "''", ")", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "39", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "const" }), " [", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), ", ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "setTime" }), "] ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "React" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "useState" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "200" }), ")", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "40", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "return" }), " (", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "41", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "div" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "42", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "DogName" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "time" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "dog" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "onChange" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "setDog" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "43", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "SlowComponent" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "time" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "onChange" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "setTime" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "44", children: ["		</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "div" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "45", children: ["	)", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "46", children: ["}", `
`] })] }) }), `
`, (0, a.jsxs)(e.p, { children: [`Play around that for a second and you'll notice a significant performance
problem when you interact with either field. There are various things that we
can do to improve the performance of both the `, (0, a.jsx)(e.code, { children: "DogName" }), " and ", (0, a.jsx)(e.code, { children: "SlowComponent" }), `
components on their own. We could pull out the rendering bailout escape hatches
like `, (0, a.jsx)(e.code, { children: "React.memo" }), ` and apply that all over our codebase where we have slow
renders. But I'd like to propose an alternative solution.`] }), `
`, (0, a.jsxs)(e.p, { children: ["If you haven't already read ", (0, a.jsx)(e.a, { href: "/blog/colocation", children: "Colocation" }), `, then I suggest you
give that a read. Knowing that colocation can improve the maintenance of our
application, let's try colocating some state. Observe that the `, (0, a.jsx)(e.code, { children: "time" }), ` state is
used by every component in the App, which is why it was
`, (0, a.jsx)(e.a, { href: "https://reactjs.org/docs/lifting-state-up.html", children: "lifted" }), " to the ", (0, a.jsx)(e.code, { children: "App" }), `. However
the `, (0, a.jsx)(e.code, { children: "dog" }), ` state is only used by one component, so let's move that state to be
colocated (updated lines are highlighted):`] }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "tsx", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "function" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "DogName" }), "({ ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), " }) {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "2", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "const" }), " [", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), ", ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "setDog" }), "] ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "React" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "useState" }), "(", "''", ")", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "return" }), " (", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "div" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "5", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "label" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "htmlFor" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "dog" }), '"', ">Dog Name</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "label" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "6", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "br" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "7", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "input" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "id" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "dog" }), '"', " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "value" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "onChange" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "e" }), ") ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "=>" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "setDog" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "e" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "target" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "value" }), ")", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "8", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "p" }), ">", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "?" }), " ", "`${", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), "}", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "'s favorite number is " }), "${", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), "}", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "." }), "`", " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: ":" }), " ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "enter a dog name" }), "'", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), "</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "p" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "9", children: ["		</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "div" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "10", children: ["	)", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "11", children: ["}", `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "12", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "13", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "function" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "App" }), "() {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "14", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base03)" }, children: '// this is "global state"' }), `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "15", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "const" }), " [", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), ", ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "setTime" }), "] ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "React" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "useState" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base09)" }, children: "200" }), ")", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "16", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "return" }), " (", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "17", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "div" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-highlight": "true", "data-line-number": "18", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "DogName" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "time" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "19", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "SlowComponent" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "time" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "onChange" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "setTime" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "20", children: ["		</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "div" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "21", children: ["	)", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "22", children: ["}", `
`] })] }) }), `
`, (0, a.jsx)(e.p, { children: "And here's the result:" }), `
`, (0, a.jsx)(h, { children: (0, a.jsx)(f, {}) }), `
`, (0, a.jsxs)(e.p, { children: [`Wow! Typing in the dog name input is WAY better now. And what's more, the
component's easier to maintain thanks to `, (0, a.jsx)(e.a, { href: "/blog/colocation", children: "colocation" }), `. But how
did it get faster?`] }), `
`, (0, a.jsxs)(e.p, { children: [`I've heard it said that the best way to make something fast is to do less stuff.
That's exactly what's going on here. When we manage the state higher up in the
React component tree, every update to that state results in an invalidation of
the entire React tree. React doesn't know what's changed, so it has to go and
check all the components to determine whether they need DOM updates. That
process is not free (especially when you have arbitrarily slow components). But
if you move your state further down the React tree as we did with the `, (0, a.jsx)(e.code, { children: "dog" }), `
state and the `, (0, a.jsx)(e.code, { children: "DogName" }), ` component, then React has less to check. It doesn't even
bother calling our `, (0, a.jsx)(e.code, { children: "SlowComponent" }), ` because it knows that there's no way that
could have changed output because it can't reference the changed state anyway.`] }), `
`, (0, a.jsxs)(e.p, { children: [`In short, before, when we changed the dog name, every component had to be
checked for changes (re-rendered). After, only the `, (0, a.jsx)(e.code, { children: "DogName" }), ` component needed to
be checked. This resulted in a big performance win! Sweet!`] }), `
`, (0, a.jsx)(e.h2, { id: "real-world", children: (0, a.jsx)(e.a, { href: "#real-world", children: "Real World" }) }), `
`, (0, a.jsxs)(e.p, { children: [`Where I see this principle apply in real-world applications is when people put
things into a global Redux store or in a global context that don't really need
to be global. Inputs like the `, (0, a.jsx)(e.code, { children: "DogName" }), ` in the example above are often the
places where this perf issue manifests itself, but I've also seen it happen
plenty on mouse interactions as well (like showing a tooltip over a graph or
table of data).`] }), `
`, (0, a.jsxs)(e.p, { children: [`Often the solution that people try for this kind of problem is to "debounce" the
user interaction (ie wait for the user to stop typing before applying the state
update). This is sometimes the best we can do, but it definitely leads to a
sub-optimal user experience (React's upcoming concurrent mode should make this
less necessary in the future.
`, (0, a.jsx)(e.a, { href: "https://youtu.be/nLF0n9SACd4?t=181", children: "Watch this demo from Dan about it" }), ")."] }), `
`, (0, a.jsxs)(e.p, { children: [`Another solution people try is to apply one of React's rendering bailout escape
hatches like `, (0, a.jsx)(e.code, { children: "React.memo" }), `. This works pretty well in our contrived example
because it allows React to skip re-rendering our `, (0, a.jsx)(e.code, { children: "SlowComponent" }), `, but in a more
practical scenario, you often suffer from "death by a thousand cuts" which means
that there's not really a single place that's slow, so you wind up applying
`, (0, a.jsx)(e.code, { children: "React.memo" }), " everywhere. And when you do that, you have to start using ", (0, a.jsx)(e.code, { children: "useMemo" }), `
and `, (0, a.jsx)(e.code, { children: "useCallback" }), ` everywhere as well (otherwise you undo all the work you put
into `, (0, a.jsx)(e.code, { children: "React.memo" }), `). Each of these optimizations together may solve the problem,
but it drastically increases the complexity of your application's code and it
actually is less effective at solving the problem than colocating state because
React does still need to run through every component from the top to determine
whether it should re-render. You'll definitely be running more code with this
approach, there's no way around that.`] }), `
`, (0, a.jsxs)(e.p, { children: [`If you'd like to play around with a slightly less contrived example,
`, (0, a.jsx)(e.a, { href: "https://codesandbox.io/s/colocate-state-ts1x9", children: "give this codesandbox a look" }), "."] }), `
`, (0, a.jsx)(e.h2, { id: "what-is-colocated-state", children: (0, a.jsx)(e.a, { href: "#what-is-colocated-state", children: "What is colocated state?" }) }), `
`, (0, a.jsxs)(e.p, { children: [(0, a.jsx)(e.a, { href: "https://kentcdodds.com/blog/colocation", children: "The principle of colocation" }), " is:"] }), `
`, (0, a.jsx)("callout-success", { class: "important", children: (0, a.jsx)(e.p, { children: "Place code as close to where it's relevant as possible" }) }), `
`, (0, a.jsxs)(e.p, { children: ["So, to accomplish this, we had our ", (0, a.jsx)(e.code, { children: "dog" }), " state ", (0, a.jsx)(e.em, { children: "inside" }), " the ", (0, a.jsx)(e.code, { children: "DogName" }), " component:"] }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "tsx", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "function" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "DogName" }), "({ ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), " }) {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "2", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "const" }), " [", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), ", ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "setDog" }), "] ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "React" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "useState" }), "(", "''", ")", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "return" }), " (", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "div" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "5", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "label" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "htmlFor" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "dog" }), '"', ">Dog Name</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "label" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "6", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "br" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "7", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "input" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "id" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "dog" }), '"', " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "value" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "onChange" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "e" }), ") ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "=>" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "setDog" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "e" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "target" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "value" }), ")", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "8", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "p" }), ">", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "?" }), " ", "`${", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), "}", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "'s favorite number is " }), "${", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), "}", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "." }), "`", " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: ":" }), " ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "enter a dog name" }), "'", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), "</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "p" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "9", children: ["		</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "div" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "10", children: ["	)", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "11", children: ["}", `
`] })] }) }), `
`, (0, a.jsxs)(e.p, { children: [`But what happens when we break that up? Where does that state go? The answer is
the same: "as close to where it's relevant as possible." That would be the
`, (0, a.jsx)(e.strong, { children: "closest common parent." }), " As an example, let's break the ", (0, a.jsx)(e.code, { children: "DogName" }), ` component up
so the `, (0, a.jsx)(e.code, { children: "input" }), " and the ", (0, a.jsx)(e.code, { children: "p" }), " show up in different components:"] }), `
`, (0, a.jsx)(e.pre, { "data-line-numbers": "true", "data-lang": "tsx", style: { color: "var(--base05)", backgroundColor: "var(--base00)" }, children: (0, a.jsxs)(e.code, { children: [(0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "1", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "function" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "DogName" }), "({ ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), " }) {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "2", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "const" }), " [", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), ", ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "setDog" }), "] ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "React" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "useState" }), "(", "''", ")", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "3", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "return" }), " (", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "4", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "div" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "5", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "DogInput" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "dog" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "onChange" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "setDog" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "6", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base0A)" }, children: "DogFavoriteNumberDisplay" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "time" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "dog" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "7", children: ["		</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "div" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "8", children: ["	)", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "9", children: ["}", `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "10", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "11", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "function" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "DogInput" }), "({ ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), ", ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "onChange" }), " }) {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "12", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "return" }), " (", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "13", children: ["		<>", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "14", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "label" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "htmlFor" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "dog" }), '"', ">Dog Name</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "label" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "15", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "br" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "16", children: ["			<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "input" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "id" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), '"', (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "dog" }), '"', " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "value" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "onChange" }), (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "=" }), (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "e" }), ") ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "=>" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "onChange" }), "(", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "e" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "target" }), ".", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "value" }), ")", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), " />", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "17", children: ["		</>", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "18", children: ["	)", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "19", children: ["}", `
`] }), (0, a.jsx)(e.span, { className: "codeblock-line", "data-line-number": "20", children: `
` }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "21", children: [(0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "function" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0D)" }, children: "DogFavoriteNumberDisplay" }), "({ ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), ", ", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), " }) {", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "22", children: ["	", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "return" }), " (", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "23", children: ["		<", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "p" }), ">", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "{" }), (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: "?" }), " ", "`${", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "dog" }), "}", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "'s favorite number is " }), "${", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "time" }), "}", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "." }), "`", " ", (0, a.jsx)(e.span, { style: { color: "var(--base0E)" }, children: ":" }), " ", "'", (0, a.jsx)(e.span, { style: { color: "var(--base0B)" }, children: "enter a dog name" }), "'", (0, a.jsx)(e.span, { style: { color: "var(--base0F)" }, children: "}" }), "</", (0, a.jsx)(e.span, { style: { color: "var(--base08)" }, children: "p" }), ">", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "24", children: ["	)", `
`] }), (0, a.jsxs)(e.span, { className: "codeblock-line", "data-line-number": "25", children: ["}", `
`] })] }) }), `
`, (0, a.jsxs)(e.p, { children: ["In this case we can't move the state to the ", (0, a.jsx)(e.code, { children: "DogInput" }), ` component, because the
`, (0, a.jsx)(e.code, { children: "DogFavoriteNumberDisplay" }), ` needs access to that state, so we navigate up the
tree until we find the least common parent of these two components and that's
where the state is managed.`] }), `
`, (0, a.jsxs)(e.p, { children: [`And this applies just as well as if your state needs to be accessed in dozens of
components on a specific screen of your application. You can even put it into
context to avoid `, (0, a.jsx)(e.a, { href: "/blog/prop-drilling", children: "prop drilling" }), ` if you want. But keep that
context value provider as close to where it's relevant as possible and you'll
still benefit from the performance (and maintenance) characteristics of
colocation. By this I mean that while `, (0, a.jsx)(e.em, { children: "some" }), ` of your context providers could be
rendered at the top of your application's React tree, they don't `, (0, a.jsx)(e.em, { children: "all" }), ` have to
be there. You can put them wherever they make the most sense.`] }), `
`, (0, a.jsxs)(e.p, { children: [`This is the essence of what my
`, (0, a.jsx)(e.a, { href: "/blog/application-state-management-with-react", children: "Application State Management with React" }), `
blog post is all about. Keep your state as close to where it's used as possible,
and you'll benefit from a maintenance perspective and a performance perspective.
From there, the only performance concerns you should have is the occasional
especially complex UI interaction.`] }), `
`, (0, a.jsx)(e.h2, { id: "what-about-context-or-redux", children: (0, a.jsx)(e.a, { href: "#what-about-context-or-redux", children: "What about context or Redux?" }) }), `
`, (0, a.jsxs)(e.p, { children: [`If you read
"`, (0, a.jsx)(e.a, { href: "/blog/optimize-react-re-renders", children: "One simple trick to optimize React re-renders" }), `,"
then you know that you can make it so only components that actually use the
changing state will be updated. So that can side step this issue. While this is
true, people do still have performance problems with Redux. If it's not React
itself, what is it? The problem is that
`, (0, a.jsx)(e.a, { href: "https://react-redux.js.org/using-react-redux/connect-mapstate#mapstatetoprops-and-performance", children: "React-Redux expects you to follow guidelines to avoid unnecessary renders of connected components" }), `,
and it can be easy to accidentally set up components that render too often when
other global state changes. The impact of that becomes worse and worse as your
app grows larger, especially if you're putting too much state into Redux.`] }), `
`, (0, a.jsxs)(e.p, { children: [`Fortunately, there are things you can do to help reduce the impact of these
performance issues, like
`, (0, a.jsxs)(e.a, { href: "https://blog.isquaredsoftware.com/2017/12/idiomatic-redux-using-reselect-selectors/", children: ["using memoized Reselect selectors to optimize ", (0, a.jsx)(e.code, { children: "mapState" }), " functions"] }), `,
and the Redux docs have
`, (0, a.jsx)(e.a, { href: "https://redux.js.org/faq", children: "additional info on improving performance of Redux apps" }), "."] }), `
`, (0, a.jsxs)(e.p, { children: [`I also want to note that you can definitely apply colocation with Redux to get
these benefits as well. Just limit what you store in Redux to be actual global
state and colocate everything else and you're golden. The Redux FAQ has
`, (0, a.jsx)(e.a, { href: "https://redux.js.org/faq/organizing-state#do-i-have-to-put-all-my-state-into-redux-should-i-ever-use-reacts-setstate", children: "some rules of thumb to help decide whether state should go in Redux, or stay in a component" }), "."] }), `
`, (0, a.jsx)(e.p, { children: `In addition, if you separate your state by domain (by having multiple
domain-specific contexts), then the problem is less pronounced as well.` }), `
`, (0, a.jsx)(e.p, { children: `But the fact remains that if you colocate your state, you don't have these
problems and maintenance is improved.` }), `
`, (0, a.jsx)(e.h2, { id: "so-how-do-you-decide-where-to-put-state", children: (0, a.jsx)(e.a, { href: "#so-how-do-you-decide-where-to-put-state", children: "So how do you decide where to put state?" }) }), `
`, (0, a.jsx)(e.p, { children: "I made this decision tree chart to help:" }), `
`, (0, a.jsx)(e.p, { children: (0, a.jsx)(e.img, { src: "https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0,w_1600/v1625033349/kentcdodds.com/content/blog/state-colocation-will-make-your-react-app-faster/where-to-put-state.png", alt: "where to put react state" }) }), `
`, (0, a.jsx)("small", { children: (0, a.jsxs)(e.p, { children: ["Chart perfected by", " ", `
`, (0, a.jsx)("a", { href: "https://x.com/meijer_s/status/1176776537322020867", children: "Stephan Meijer" })] }) }), `
`, (0, a.jsx)("br", {}), `
`, (0, a.jsx)(e.p, { children: "Here's that written out (for screen readers and friends):" }), `
`, (0, a.jsxs)(e.ul, { children: [`
`, (0, a.jsx)(e.li, { children: "1 Start building an app. Go to 2" }), `
`, (0, a.jsx)(e.li, { children: "2 useState. Go to 3" }), `
`, (0, a.jsxs)(e.li, { children: ["3 used by only this component?", `
`, (0, a.jsxs)(e.ul, { children: [`
`, (0, a.jsx)(e.li, { children: "Yes: Go to 4" }), `
`, (0, a.jsxs)(e.li, { children: ["No: used by only one child?", `
`, (0, a.jsxs)(e.ul, { children: [`
`, (0, a.jsx)(e.li, { children: "Yes: Colocate state. Go to 3" }), `
`, (0, a.jsxs)(e.li, { children: ["No: used by a sibling/parent?", `
`, (0, a.jsxs)(e.ul, { children: [`
`, (0, a.jsx)(e.li, { children: "Yes: Lift state. Go to 3" }), `
`, (0, a.jsx)(e.li, { children: "No: Go to 4" }), `
`] }), `
`] }), `
`] }), `
`] }), `
`] }), `
`] }), `
`, (0, a.jsx)(e.li, { children: "4 Leave it. Go to 5" }), `
`, (0, a.jsxs)(e.li, { children: ['5 having a "prop drilling" problem?', `
`, (0, a.jsxs)(e.ul, { children: [`
`, (0, a.jsxs)(e.li, { children: ["Yes: Can child function outside of parent?", `
`, (0, a.jsxs)(e.ul, { children: [`
`, (0, a.jsx)(e.li, { children: "Yes: Move State to Context Provider. Go to 6" }), `
`, (0, a.jsx)(e.li, { children: "No: Use Component Composition. Go to 6" }), `
`] }), `
`] }), `
`, (0, a.jsx)(e.li, { children: "No: Go to 6" }), `
`] }), `
`] }), `
`, (0, a.jsx)(e.li, { children: "6 Ship the app. As requirements change, Go to 1" }), `
`] }), `
`, (0, a.jsxs)(e.p, { children: [`It's important that this is something you do as part of your regular
refactoring/app maintenance process. This is because lifting state up is a
requirement of getting this `, (0, a.jsx)(e.em, { children: "working" }), ` so it happens naturally, but your app will
"work" whether you colocate your state or not, so being intentional about
thinking through this is important to keep your app manageable and fast.`] }), `
`, (0, a.jsxs)(e.p, { children: [`If you want to learn a bit more about that component composition step, read
about that in
`, (0, a.jsx)(e.a, { href: "https://epicreact.dev/one-react-mistake-thats-slowing-you-down", children: "One React mistake that's slowing you down" }), "."] }), `
`, (0, a.jsx)(e.h2, { id: "conclusion", children: (0, a.jsx)(e.a, { href: "#conclusion", children: "Conclusion" }) }), `
`, (0, a.jsxs)(e.p, { children: [`In general, I think people are pretty good at "lifting state" as things change,
but we don't often think to "colocate" state as things change in our codebase.
So my challenge to you is to look through your codebase and look for
opportunities to colocate state. Ask yourself "do I really need the modal's
`, (0, a.jsx)(e.code, { children: "status" }), ` (open/closed) state to be in Redux?" (the answer is probably "no").
Colocate your state and you'll find yourself with a faster, simpler codebase.
Good luck!`] }), `
`, (0, a.jsxs)(e.p, { children: [`P.S. I wrote another article that covers this topic from the perspective of
forms and "perf death by a thousand cuts". Head on over to EpicReact.dev to
read:
`, (0, a.jsx)(e.a, { href: "https://epicreact.dev/improve-the-performance-of-your-react-forms", children: "Improve the Performance of your React Forms" })] })] });
    }
    function w(n = {}) {
      let { wrapper: e } = n.components || {};
      return e ? (0, a.jsx)(e, { ...n, children: (0, a.jsx)(k, { ...n }) }) : k(n);
    }
    return C(T);
  })();
  ;
  return Component;
})();
var stdin_default = MDXContent;
export {
  stdin_default as default
};
