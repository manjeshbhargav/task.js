'use strict';

/**
 * Create a new {@link Task}
 * @class
 * @classdesc A {@link Task} represents a set of instructions
 *   that can be grouped based on application specific logic.
 * @example
 * var loginTask = new Task('login', function(url, done, failed) {
 *    $.put({
 *      url: url,
 *      data: { uname: '123', password: 'xyz' },
 *      success: function(response) { done(JSON.parse(response)); },
 *      failure: function(error) { failed(error); }
 *    });
 * });
 * loginTask.do('/login').then(function(response) {
 *    console.log('Success - ', response);
 * }.catch(function(error) {
 *    console.log('Failure - ', error);
 * });
 * @param {String} name - Human readable name for the task.
 * @param {Function} template - Function which has the instructions.
 * @constructor
 */
function Task(name, template) {
  Object.defineProperties(this, {
    name: {
      value: name,
      enumerable: true
    },
    template: {
      value: template
    }
  });
}

/**
 * Helper for creating a new {@link Task}.
 * @memberOf Task
 * @param {String} name - Human readable name for the task.
 * @param {Function} template - Function which has the instructions.
 * @returns {Task}
 */
Task.create = function create(name, template) {
  return new Task(name, template);
};

/**
 * Perform an anonymous {@link Task}.
 * @example
 * Task.do(function(done, failed) {
 *    // Task instructions here
 *    // Call done() or failed() when task completed or failed.
 * });
 * @memberOf Task
 * @param {Function} template - Function which has the instructions.
 * @param {...*} arguments - Arguments for running the template.
 * @returns {Promise.<*>}
 */
Task.do = function doTask() {
  var args = [].slice.call(arguments);
  var template = args.shift();
  var task = new Task('anonymous', template);
  return task.do.apply(task, args);
};

/**
 * Perform a sequence of {@link Task}s.
 * @example
 * var task1 = Task.create('task 1', function(done, failed) {...};
 * var task2 = Task.create('task 2', function(task1Result, done, failed) {...};
 * var task3 = Task.create('task 3', function(task2Result, done, failed) {...};
 *
 * Task.sequence([task1, task2, task3]).then(function(task3Result) {
 *    console.log('All done one after the other!');
 * }).catch(function(error) {
 *    console.log('One of the tasks failed');
 * });
 * @memberOf Task
 * @param {Array[Task]} tasks - Tasks to be performed in sequence.
 * @returns {Promise.<*>}
 */
Task.sequence = function sequence(tasks) {
  var firstTaskArgs = [].slice.call(arguments, 1);
  var next = function next() {
    if (tasks.length) {
      var task = tasks.shift();
      return task.do.apply(task, arguments).then(next);
    }
    return Promise.resolve.apply(Promise, arguments);
  };
  return next.apply(null, firstTaskArgs);
};

/**
 * Perform {@link Task}s in parallel.
 * @param {Array[Promise.<*>]} taskPromises - Promises returned by each {@link Task}'s <code>do()</code> method.
 * @returns {Promise.<*>}
 */
Task.parallel = function parallel(taskPromises) {
  return Promise.all(taskPromises);
};

/**
 * Perform a {@link Task}.
 * @param {...*} arguments - Arguments for the task template.
 * @returns {Promise.<*>}
 */
Task.prototype.do = function doTask() {
  var args = [].slice.call(arguments);
  var self = this;
  return new Promise(function executor(resolve, reject) {
    self.template.apply(null, args.concat([resolve, reject]));
  });
};

module.exports = Task;