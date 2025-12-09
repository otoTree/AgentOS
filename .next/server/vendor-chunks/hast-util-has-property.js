"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/hast-util-has-property";
exports.ids = ["vendor-chunks/hast-util-has-property"];
exports.modules = {

/***/ "(ssr)/./node_modules/hast-util-has-property/lib/index.js":
/*!**********************************************************!*\
  !*** ./node_modules/hast-util-has-property/lib/index.js ***!
  \**********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   hasProperty: () => (/* binding */ hasProperty)\n/* harmony export */ });\n/**\n * @typedef {import('hast').Element} Element\n * @typedef {import('hast').Nodes} Nodes\n */\n\nconst own = {}.hasOwnProperty\n\n/**\n * Check if `node` is an element and has a `name` property.\n *\n * @template {string} Key\n *   Type of key.\n * @param {Nodes} node\n *   Node to check (typically `Element`).\n * @param {Key} name\n *   Property name to check.\n * @returns {node is Element & {properties: Record<Key, Array<number | string> | number | string | true>}}}\n *   Whether `node` is an element that has a `name` property.\n *\n *   Note: see <https://github.com/DefinitelyTyped/DefinitelyTyped/blob/27c9274/types/hast/index.d.ts#L37C29-L37C98>.\n */\nfunction hasProperty(node, name) {\n  const value =\n    node.type === 'element' &&\n    own.call(node.properties, name) &&\n    node.properties[name]\n\n  return value !== null && value !== undefined && value !== false\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvaGFzdC11dGlsLWhhcy1wcm9wZXJ0eS9saWIvaW5kZXguanMiLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0EsYUFBYSx3QkFBd0I7QUFDckMsYUFBYSxzQkFBc0I7QUFDbkM7O0FBRUEsY0FBYzs7QUFFZDtBQUNBO0FBQ0E7QUFDQSxjQUFjLFFBQVE7QUFDdEI7QUFDQSxXQUFXLE9BQU87QUFDbEI7QUFDQSxXQUFXLEtBQUs7QUFDaEI7QUFDQSxhQUFhLG1CQUFtQjtBQUNoQztBQUNBO0FBQ0E7QUFDQTtBQUNPO0FBQ1A7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL3VudGl0bGVkMi8uL25vZGVfbW9kdWxlcy9oYXN0LXV0aWwtaGFzLXByb3BlcnR5L2xpYi9pbmRleC5qcz8xMWYwIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQHR5cGVkZWYge2ltcG9ydCgnaGFzdCcpLkVsZW1lbnR9IEVsZW1lbnRcbiAqIEB0eXBlZGVmIHtpbXBvcnQoJ2hhc3QnKS5Ob2Rlc30gTm9kZXNcbiAqL1xuXG5jb25zdCBvd24gPSB7fS5oYXNPd25Qcm9wZXJ0eVxuXG4vKipcbiAqIENoZWNrIGlmIGBub2RlYCBpcyBhbiBlbGVtZW50IGFuZCBoYXMgYSBgbmFtZWAgcHJvcGVydHkuXG4gKlxuICogQHRlbXBsYXRlIHtzdHJpbmd9IEtleVxuICogICBUeXBlIG9mIGtleS5cbiAqIEBwYXJhbSB7Tm9kZXN9IG5vZGVcbiAqICAgTm9kZSB0byBjaGVjayAodHlwaWNhbGx5IGBFbGVtZW50YCkuXG4gKiBAcGFyYW0ge0tleX0gbmFtZVxuICogICBQcm9wZXJ0eSBuYW1lIHRvIGNoZWNrLlxuICogQHJldHVybnMge25vZGUgaXMgRWxlbWVudCAmIHtwcm9wZXJ0aWVzOiBSZWNvcmQ8S2V5LCBBcnJheTxudW1iZXIgfCBzdHJpbmc+IHwgbnVtYmVyIHwgc3RyaW5nIHwgdHJ1ZT59fX1cbiAqICAgV2hldGhlciBgbm9kZWAgaXMgYW4gZWxlbWVudCB0aGF0IGhhcyBhIGBuYW1lYCBwcm9wZXJ0eS5cbiAqXG4gKiAgIE5vdGU6IHNlZSA8aHR0cHM6Ly9naXRodWIuY29tL0RlZmluaXRlbHlUeXBlZC9EZWZpbml0ZWx5VHlwZWQvYmxvYi8yN2M5Mjc0L3R5cGVzL2hhc3QvaW5kZXguZC50cyNMMzdDMjktTDM3Qzk4Pi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc1Byb3BlcnR5KG5vZGUsIG5hbWUpIHtcbiAgY29uc3QgdmFsdWUgPVxuICAgIG5vZGUudHlwZSA9PT0gJ2VsZW1lbnQnICYmXG4gICAgb3duLmNhbGwobm9kZS5wcm9wZXJ0aWVzLCBuYW1lKSAmJlxuICAgIG5vZGUucHJvcGVydGllc1tuYW1lXVxuXG4gIHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBmYWxzZVxufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/hast-util-has-property/lib/index.js\n");

/***/ })

};
;