/* globals define */

'use strict';

var Task = require('./src/task');
var scope = typeof window !== 'undefined' ? window : (
  typeof global !== 'undefined' ? global : this
);

(function(scope) {
  if (typeof define === 'function' && define.amd) {
    define([], function() { return Task; });
  }
  else {
    scope['Task'] = Task;
  }
})(scope);