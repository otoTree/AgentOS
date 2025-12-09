/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/parse-numeric-range";
exports.ids = ["vendor-chunks/parse-numeric-range"];
exports.modules = {

/***/ "(ssr)/./node_modules/parse-numeric-range/index.js":
/*!***************************************************!*\
  !*** ./node_modules/parse-numeric-range/index.js ***!
  \***************************************************/
/***/ ((module, exports) => {

eval("/**\n * @param {string} string    The string to parse\n * @returns {Array<number>}  Returns an energetic array.\n */\nfunction parsePart(string) {\n  let res = [];\n  let m;\n\n  for (let str of string.split(\",\").map((str) => str.trim())) {\n    // just a number\n    if (/^-?\\d+$/.test(str)) {\n      res.push(parseInt(str, 10));\n    } else if (\n      (m = str.match(/^(-?\\d+)(-|\\.\\.\\.?|\\u2025|\\u2026|\\u22EF)(-?\\d+)$/))\n    ) {\n      // 1-5 or 1..5 (equivalent) or 1...5 (doesn't include 5)\n      let [_, lhs, sep, rhs] = m;\n\n      if (lhs && rhs) {\n        lhs = parseInt(lhs);\n        rhs = parseInt(rhs);\n        const incr = lhs < rhs ? 1 : -1;\n\n        // Make it inclusive by moving the right 'stop-point' away by one.\n        if (sep === \"-\" || sep === \"..\" || sep === \"\\u2025\") rhs += incr;\n\n        for (let i = lhs; i !== rhs; i += incr) res.push(i);\n      }\n    }\n  }\n\n  return res;\n}\n\nexports[\"default\"] = parsePart;\nmodule.exports = parsePart;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvcGFyc2UtbnVtZXJpYy1yYW5nZS9pbmRleC5qcyIsIm1hcHBpbmdzIjoiQUFBQTtBQUNBLFdBQVcsUUFBUTtBQUNuQixhQUFhLGdCQUFnQjtBQUM3QjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBLDBCQUEwQixXQUFXO0FBQ3JDO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBLGtCQUFlO0FBQ2YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly91bnRpdGxlZDIvLi9ub2RlX21vZHVsZXMvcGFyc2UtbnVtZXJpYy1yYW5nZS9pbmRleC5qcz81MzZmIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyAgICBUaGUgc3RyaW5nIHRvIHBhcnNlXG4gKiBAcmV0dXJucyB7QXJyYXk8bnVtYmVyPn0gIFJldHVybnMgYW4gZW5lcmdldGljIGFycmF5LlxuICovXG5mdW5jdGlvbiBwYXJzZVBhcnQoc3RyaW5nKSB7XG4gIGxldCByZXMgPSBbXTtcbiAgbGV0IG07XG5cbiAgZm9yIChsZXQgc3RyIG9mIHN0cmluZy5zcGxpdChcIixcIikubWFwKChzdHIpID0+IHN0ci50cmltKCkpKSB7XG4gICAgLy8ganVzdCBhIG51bWJlclxuICAgIGlmICgvXi0/XFxkKyQvLnRlc3Qoc3RyKSkge1xuICAgICAgcmVzLnB1c2gocGFyc2VJbnQoc3RyLCAxMCkpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAobSA9IHN0ci5tYXRjaCgvXigtP1xcZCspKC18XFwuXFwuXFwuP3xcXHUyMDI1fFxcdTIwMjZ8XFx1MjJFRikoLT9cXGQrKSQvKSlcbiAgICApIHtcbiAgICAgIC8vIDEtNSBvciAxLi41IChlcXVpdmFsZW50KSBvciAxLi4uNSAoZG9lc24ndCBpbmNsdWRlIDUpXG4gICAgICBsZXQgW18sIGxocywgc2VwLCByaHNdID0gbTtcblxuICAgICAgaWYgKGxocyAmJiByaHMpIHtcbiAgICAgICAgbGhzID0gcGFyc2VJbnQobGhzKTtcbiAgICAgICAgcmhzID0gcGFyc2VJbnQocmhzKTtcbiAgICAgICAgY29uc3QgaW5jciA9IGxocyA8IHJocyA/IDEgOiAtMTtcblxuICAgICAgICAvLyBNYWtlIGl0IGluY2x1c2l2ZSBieSBtb3ZpbmcgdGhlIHJpZ2h0ICdzdG9wLXBvaW50JyBhd2F5IGJ5IG9uZS5cbiAgICAgICAgaWYgKHNlcCA9PT0gXCItXCIgfHwgc2VwID09PSBcIi4uXCIgfHwgc2VwID09PSBcIlxcdTIwMjVcIikgcmhzICs9IGluY3I7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IGxoczsgaSAhPT0gcmhzOyBpICs9IGluY3IpIHJlcy5wdXNoKGkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydHMuZGVmYXVsdCA9IHBhcnNlUGFydDtcbm1vZHVsZS5leHBvcnRzID0gcGFyc2VQYXJ0O1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/parse-numeric-range/index.js\n");

/***/ })

};
;