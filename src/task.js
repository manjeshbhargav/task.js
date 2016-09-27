'use strict';

var isArrayOf = function isArrayOf(array, ItemType) {
  return (
    typeof array === 'object' &&
    array.hasOwnProperty('length') &&
    array.every(function(item) { return (item instanceof ItemType); })
  );
};

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
  if (typeof name !== 'string') {
    throw(new Error('name must be a string'));
  }
  if (typeof template !== 'function') {
    throw(new Error('template must be a function'));
  }
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
Task.do = function doTask(template) {
  if (typeof template !== 'function') {
    throw(new Error('template must be a function'));
  }

  var args = [].slice.call(arguments, 1);
  var task = new Task('anonymous', template);
  return task.do.apply(task, args);
};

/**
 * Perform a sequence of {@link Task}s.
 * @example
 * var task1 = Task.create('task 1', function(done, failed) {...});
 * var task2 = Task.create('task 2', function(task1Result, done, failed) {...});
 * var task3 = Task.create('task 3', function(task2Result, done, failed) {...});
 *
 * Task.sequence([task1, task2, task3]).then(function(task3Result) {
 *    console.log('All done one after the other!');
 * }).catch(function(error) {
 *    console.log('One of the tasks failed');
 * });
 * @memberOf Task
 * @param {Array[Task]} tasks - Tasks to be performed in sequence.
 * @param {...*} arguments - Arguments for the first task.
 * @returns {Promise.<*>}
 */
Task.sequence = function sequence(tasks) {
  if (!isArrayOf(tasks, Task)) {
    throw(new Error('Argument should be an array of tasks.'));
  }

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
 * @memberOf Task
 * @param {Array[Promise.<*>]} taskPromises - Promises returned by each {@link Task}'s <code>do()</code> method.
 * @returns {Promise.<*>}
 */
Task.parallel = function parallel(taskPromises) {
  if (!isArrayOf(taskPromises, Promise)) {
    throw(new Error('Argument should be an array of task promises.'));
  }
  return Promise.all(taskPromises);
};

/**
 * Try to do a {@link Task} at most n times until done.
 * @example
 * var task = Task.create('try', function(done, failed) {...});
 * Task.try(task, 10).then(function() {
 *    console.log('Successful before 10 tries!');
 * }).catch(function() {
 *    console.log('Failed even after 10 tries!');
 * });
 * @memberOf Task
 * @param {Task} task - {@link Task} to be tried.
 * @param {Number} tries - Maximum number of tries.
 * @returns {Promise.<*>}
 */
Task.try = function tryTask(task, tries) {
  if (!(task instanceof Task)) {
    throw(new Error('First argument should be a task.'));
  }
  if (typeof tries !== 'number') {
    throw(new Error('Second argument should be the number of tries.'));
  }

  var taskArgs = [].slice.call(arguments, 2);
  return Task.do(function(done, failed) {
    var tryOnce = function tryOnce(error) {
      if (tries > 0) {
        tries--;
        task.do.apply(task, taskArgs).then(done).catch(tryOnce);
      }
      else {
        failed(error);
      }
    };
    tryOnce();
  });
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
    try {
      self.template.apply(null, args.concat([resolve, reject]));
    }
    catch(e) {
      reject(e);
    }
  });
};

module.exports = Task;
