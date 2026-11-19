"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "instrumentation";
exports.ids = ["instrumentation"];
exports.modules = {

/***/ "(instrument)/./src/instrumentation.ts":
/*!********************************!*\
  !*** ./src/instrumentation.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   register: () => (/* binding */ register)\n/* harmony export */ });\n/**\n * Runs once when the Node server starts. Fails fast on insecure deployments (production secrets still at their\n * public development defaults) instead of discovering it on the first request.\n */ async function register() {\n    if (true) {\n        const { assertSecureDefaults } = await __webpack_require__.e(/*! import() */ \"_instrument_src_server_config_ts\").then(__webpack_require__.bind(__webpack_require__, /*! ./server/config */ \"(instrument)/./src/server/config.ts\"));\n        assertSecureDefaults();\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGluc3RydW1lbnQpLy4vc3JjL2luc3RydW1lbnRhdGlvbi50cyIsIm1hcHBpbmdzIjoiOzs7O0FBQUE7OztDQUdDLEdBQ00sZUFBZUE7SUFDcEIsSUFBSUMsSUFBcUMsRUFBRTtRQUN6QyxNQUFNLEVBQUVHLG9CQUFvQixFQUFFLEdBQUcsTUFBTSwyTEFBeUI7UUFDaEVBO0lBQ0Y7QUFDRiIsInNvdXJjZXMiOlsiL1VzZXJzL2FsZmVybWVyY2Fkby9Eb2N1bWVudHMvVVNDaGVkL3NyYy9pbnN0cnVtZW50YXRpb24udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBSdW5zIG9uY2Ugd2hlbiB0aGUgTm9kZSBzZXJ2ZXIgc3RhcnRzLiBGYWlscyBmYXN0IG9uIGluc2VjdXJlIGRlcGxveW1lbnRzIChwcm9kdWN0aW9uIHNlY3JldHMgc3RpbGwgYXQgdGhlaXJcbiAqIHB1YmxpYyBkZXZlbG9wbWVudCBkZWZhdWx0cykgaW5zdGVhZCBvZiBkaXNjb3ZlcmluZyBpdCBvbiB0aGUgZmlyc3QgcmVxdWVzdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVyKCkge1xuICBpZiAocHJvY2Vzcy5lbnYuTkVYVF9SVU5USU1FID09PSAnbm9kZWpzJykge1xuICAgIGNvbnN0IHsgYXNzZXJ0U2VjdXJlRGVmYXVsdHMgfSA9IGF3YWl0IGltcG9ydCgnLi9zZXJ2ZXIvY29uZmlnJylcbiAgICBhc3NlcnRTZWN1cmVEZWZhdWx0cygpXG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJyZWdpc3RlciIsInByb2Nlc3MiLCJlbnYiLCJORVhUX1JVTlRJTUUiLCJhc3NlcnRTZWN1cmVEZWZhdWx0cyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(instrument)/./src/instrumentation.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(instrument)/./src/instrumentation.ts"));
module.exports = __webpack_exports__;

})();