"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/direction";
exports.ids = ["vendor-chunks/direction"];
exports.modules = {

/***/ "(ssr)/./node_modules/direction/index.js":
/*!*****************************************!*\
  !*** ./node_modules/direction/index.js ***!
  \*****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   direction: () => (/* binding */ direction)\n/* harmony export */ });\nconst rtlRange = '\\u0591-\\u07FF\\uFB1D-\\uFDFD\\uFE70-\\uFEFC'\nconst ltrRange =\n  'A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6' +\n  '\\u00F8-\\u02B8\\u0300-\\u0590\\u0800-\\u1FFF\\u200E\\u2C00-\\uFB1C' +\n  '\\uFE00-\\uFE6F\\uFEFD-\\uFFFF'\n\n/* eslint-disable no-misleading-character-class */\nconst rtl = new RegExp('^[^' + ltrRange + ']*[' + rtlRange + ']')\nconst ltr = new RegExp('^[^' + rtlRange + ']*[' + ltrRange + ']')\n/* eslint-enable no-misleading-character-class */\n\n/**\n * Detect the direction of text: left-to-right, right-to-left, or neutral\n *\n * @param {string} value\n * @returns {'rtl'|'ltr'|'neutral'}\n */\nfunction direction(value) {\n  const source = String(value || '')\n  return rtl.test(source) ? 'rtl' : ltr.test(source) ? 'ltr' : 'neutral'\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvZGlyZWN0aW9uL2luZGV4LmpzIiwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQixhQUFhO0FBQ2I7QUFDTztBQUNQO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL3VudGl0bGVkMi8uL25vZGVfbW9kdWxlcy9kaXJlY3Rpb24vaW5kZXguanM/NGRkZiJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBydGxSYW5nZSA9ICdcXHUwNTkxLVxcdTA3RkZcXHVGQjFELVxcdUZERkRcXHVGRTcwLVxcdUZFRkMnXG5jb25zdCBsdHJSYW5nZSA9XG4gICdBLVphLXpcXHUwMEMwLVxcdTAwRDZcXHUwMEQ4LVxcdTAwRjYnICtcbiAgJ1xcdTAwRjgtXFx1MDJCOFxcdTAzMDAtXFx1MDU5MFxcdTA4MDAtXFx1MUZGRlxcdTIwMEVcXHUyQzAwLVxcdUZCMUMnICtcbiAgJ1xcdUZFMDAtXFx1RkU2RlxcdUZFRkQtXFx1RkZGRidcblxuLyogZXNsaW50LWRpc2FibGUgbm8tbWlzbGVhZGluZy1jaGFyYWN0ZXItY2xhc3MgKi9cbmNvbnN0IHJ0bCA9IG5ldyBSZWdFeHAoJ15bXicgKyBsdHJSYW5nZSArICddKlsnICsgcnRsUmFuZ2UgKyAnXScpXG5jb25zdCBsdHIgPSBuZXcgUmVnRXhwKCdeW14nICsgcnRsUmFuZ2UgKyAnXSpbJyArIGx0clJhbmdlICsgJ10nKVxuLyogZXNsaW50LWVuYWJsZSBuby1taXNsZWFkaW5nLWNoYXJhY3Rlci1jbGFzcyAqL1xuXG4vKipcbiAqIERldGVjdCB0aGUgZGlyZWN0aW9uIG9mIHRleHQ6IGxlZnQtdG8tcmlnaHQsIHJpZ2h0LXRvLWxlZnQsIG9yIG5ldXRyYWxcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWVcbiAqIEByZXR1cm5zIHsncnRsJ3wnbHRyJ3wnbmV1dHJhbCd9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXJlY3Rpb24odmFsdWUpIHtcbiAgY29uc3Qgc291cmNlID0gU3RyaW5nKHZhbHVlIHx8ICcnKVxuICByZXR1cm4gcnRsLnRlc3Qoc291cmNlKSA/ICdydGwnIDogbHRyLnRlc3Qoc291cmNlKSA/ICdsdHInIDogJ25ldXRyYWwnXG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/direction/index.js\n");

/***/ })

};
;