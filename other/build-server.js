"use strict";
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
var path_1 = require("path");
var url_1 = require("url");
var esbuild_1 = require("esbuild");
var fs_extra_1 = require("fs-extra");
var glob_1 = require("glob");
var pkg = fs_extra_1.default.readJsonSync(path_1.default.join(process.cwd(), 'package.json'));
var __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
var globsafe = function (s) { return s.replace(/\\/g, '/'); };
var here = function () {
    var s = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        s[_i] = arguments[_i];
    }
    return globsafe(path_1.default.join.apply(path_1.default, __spreadArray([__dirname], s, false)));
};
var allFiles = (0, glob_1.globSync)(here('../server/**/*.*'), {
    ignore: [
        'server/dev-server.js', // for development only
        'server/content-watcher.ts', // for development only
        '**/tsconfig.json',
        '**/eslint*',
        '**/__tests__/**',
    ],
});
var entries = [];
var outdir = here('../server-build');
for (var _i = 0, allFiles_1 = allFiles; _i < allFiles_1.length; _i++) {
    var file = allFiles_1[_i];
    if (/\.(ts|js|tsx|jsx)$/.test(file)) {
        entries.push(file);
    }
    else {
        var filename = path_1.default.basename(file);
        var dest = path_1.default.join(outdir, filename);
        fs_extra_1.default.ensureDirSync(outdir);
        fs_extra_1.default.copySync(file, dest);
        console.log("copied: ".concat(filename));
    }
}
console.log();
console.log('building...');
esbuild_1.default
    .build({
    entryPoints: entries,
    outdir: outdir,
    target: ["node".concat(pkg.engines.node)],
    platform: 'node',
    sourcemap: true,
    format: 'esm',
    logLevel: 'info',
})
    .catch(function (error) {
    console.error(error);
    process.exit(1);
});
