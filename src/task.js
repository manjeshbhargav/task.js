'use strict';

/**
 * Create a new {@link Task}
 * @class
 * @classdesc A {@link Task} represents a set of instructions
 *   that can be grouped based on application specific logic.
 * @example
 * var loginAttempt = new Task('login attempt', function(url, done, failed) {
 *    $.post({
 *      url: url,
 *      data: { uname: '123', password: 'xyz' },
 *      success: function(response) { done(JSON.parse(response)); },
 *      failure: function(error) { failed(error); }
 *    });
 * });
 *
 * loginAttempt.do('/login').then(function(response) {
 *    console.log('Success - ', response);
 * }.catch(function(error) {
 *    console.error('Failure - ', error);
 * });
 * @param {String} name - Human readable name for the task.
 * @param {Function} template - Function which has the instructions.
 * @constructor
 */
function Task(name, template) {
  Object.defineProperties(this, {
    _cancel: {
      value: null,
      writable: true
    },
    name: {
      value: name,
      enumerable: true
    },
    template: {
      value: template,
      enumerable: true
    }
  });
}

/**
 * Helper for creating a new {@link Task} with type checks for arguments.
 * @example
 * var getExecRecords = Task.create('get executive records', function(url, done, failed) {
 *    $.getJSON(url, function(employees) {
 *      var executives = employees.filter(function(employee) {
 *        return (employee.title === 'executive');
 *      });
 *      done(executives);
 *    }, failed);
 * });
 *
 * getExecRecords.do('/records/employees').then(function(executives) {
 *    console.log('Executive records - ', executives);
 * }).catch(function(error) {
 *    console.error('Error - ', error);
 * });
 * @memberof Task
 * @param {String} name - Human readable name for the task.
 * @param {Function} template - Function which has the instructions.
 * @returns {Task}
 */
Task.create = function create(name, template) {
  if (typeof name !== 'string') {
    throw new Error('name must be a string');
  }
  if (typeof template !== 'function') {
    throw new Error('template must be a function');
  }
  return new Task(name, template);
};

/**
 * Perform an anonymous {@link Task}.
 * @example
 * Task.do(function(url, data, done, failed) {
 *    $.post({
 *      url: url,
 *      data: data,
 *      success: done,
 *      failure: failed
 *    });
 * }, '/report/actiontaken', { type: 'clicked' }).then(function() {
 *    console.log('Report successfully sent.');
 * }).catch(functiom(error) {
 *    console.error('Attempt to send report failed - ', error);
 * });
 * @memberof Task
 * @param {Function} template - Function which has the instructions.
 * @param {...*} arguments - Arguments for running the template.
 * @returns {Promise}
 */
Task.do = function doTask(template) {
  if (typeof template !== 'function') {
    throw new Error('template must be a function');
  }

  var args = [].slice.call(arguments, 1);
  var task = new Task('anonymous', template);
  return task.do.apply(task, args);
};

/**
 * Perform a sequence of {@link Task}s.
 * @example
 * var task1 = Task.create('task 1', function(task1Arg, done, failed) {...});
 * var task2 = Task.create('task 2', function(task1Result, done, failed) {...});
 * var task3 = Task.create('task 3', function(task2Result, done, failed) {...});
 * var taskSequence = Task.sequence('sequence', [task1, task2, task3]);
 *
 * // The arguments of Task#do() are arguments for the first task in the sequence.
 * taskSequence.do(10).then(function(task3Result) {
 *    console.log('All done one after the other!');
 * }).catch(function(error) {
 *    console.error('One of the tasks failed - ', error);
 * });
 * @memberof Task
 * @param {string} name - Name of the task.
 * @param {Task|function[]} tasks - Tasks/templates to be performed in sequence.
 * @returns {Task}
 */
Task.sequence = function sequence(name, tasks) {
  if (typeof name !== 'string') {
    throw new Error('Task name must be a string.');
  }
  if (!Array.isArray(tasks)) {
    throw new Error('The second argument should be an array '
      + 'of Tasks/templates.');
  }

  tasks = tasks.map(function(task) {
    if (task instanceof Task) {
      return task;
    }
    else if (typeof task === 'function') {
      return new Task('anonymous', task);
    }
    else {
      throw new Error('tasks Array item must either be a Task or a template.');
    }
  });

  return new Task(name, function() {
    var args = [].slice.apply(arguments);
    var failed = args.pop();
    var done = args.pop();

    var next = function next() {
      if (tasks.length) {
        var task = tasks.shift();
        task.do.apply(task, arguments).then(next).catch(failed);
      }
      else {
        done.apply(null, arguments);
      }
    };
    next.apply(null, args);
  });
};

/**
 * Perform {@link Task}s in parallel.
 * @example
 * var task1 = Task.create('task1', function(arg1, done, failed) {...});
 * var task2 = Task.create('task2', function(arg21, arg22, done, failed) {...});
 * var task3 = Task.create('task3', function(arg31, done, failed) {...});
 * var taskParallel = Task.parallel('parallel', [task1, task2, task3]);
 *
 * // The arguments for Task#do() is (args1, args2, args3), where:
 * // * args1 => Array of arguments for task1's template
 * // * args2 => Array of arguments for task2's template
 * // * args3 => Array of arguments for task3's template
 * // NOTE: If there is only one argument for a task, then there is no
 * //       need to enclose it in an array.
 * taskParallel.do(1, ['2', true], {}).then(function(results) {
 *    console.log('Results of all completed tasks - ', results);
 * }).catch(function(error) {
 *    console.error('One of the tasks failed - ', error);
 * });
 * @memberof Task
 * @param {string} name - Name of the task.
 * @param {Task|function[]} tasks - Tasks/templates to be performed in parallel.
 * @returns {Task}
 */
Task.parallel = function parallel(name, tasks) {
  if (typeof name !== 'string') {
    throw new Error('Task name must be a string.');
  }

  if (!Array.isArray(tasks)) {
    throw new Error('The second argument should be an array '
      + 'of Tasks/templates.');
  }

  tasks = tasks.map(function(task) {
    if (task instanceof Task) {
      return task;
    }
    else if (typeof task === 'function') {
      return new Task('anonymous', task);
    }
    else {
      throw new Error('tasks Array item must either be a Task or a template.');
    }
  });

  return new Task(name, function() {
    var args = [].slice.call(arguments);

    args.splice(-2);
    args = args.map(function(taskArgs) {
      return Array.isArray(taskArgs) ? taskArgs : [taskArgs];
    });

    return Promise.all(tasks.map(function(task, i) {
      return task.do.apply(task, args[i]);
    }));
  });
};

/**
 * Try to do a {@link Task} at most n times until done.
 * @example
 * var task = Task.try('try', function(arg1, arg2, done, failed) {...});
 *
 * // The last argument for Task#do() is the number of tries.
 * task.do(1, false, 10).then(function() {
 *    console.log('Successful before 10 tries!');
 * }).catch(function() {
 *    console.log('Failed even after 10 tries!');
 * });
 * @memberof Task
 * @param {string} name - Name of the {@link Task}.
 * @param {function} template - Task template.
 * @returns {Task}
 */
Task.try = function tryTask(name, template) {
  if (typeof name !== 'string') {
    throw new Error('Task name must be a string.');
  }
  if (typeof template !== 'function') {
    throw new Error('Task template must be a function.');
  }

  return new Task(name, function() {
    var args = [].slice.call(arguments);
    var failed = args.pop();
    var done = args.pop();
    var tries = args.pop();
    var task = new Task(name + ': trying once', template);

    if (typeof tries !== 'number') {
      throw new Error('Last argument for Task#do() must '
        + 'be a number (number of tries).');
    }

    (function tryOnce(error) {
      if (tries > 0) {
        tries--;
        task.do.apply(task, args).then(done).catch(tryOnce);
      }
      else {
        failed(error);
      }
    })();
  });
};

/**
 * Perform a task on an array of items.
 * @example
 * var task = Task.map('get html of a given url', function(url, done, failed) {
 *    http.get(url, function(response) {
 *      var html = '';
 *      response.on('data', function(data) {
 *        html += data;
 *      });
 *      response.on('end', function() {
 *        done(html);
 *      });
 *    }).on('error', failed);
 * });
 *
 * // The argument for Task#do() is an array where the task has to be
 * // performed once for each item in parallel.
 * task.do(['http://www.ex1.com', 'http://www.ex2.com']).then(function(htmls) {
 *    htmls.forEach(function(html, i) {
 *      console.log('HTML["' + domains[i] + '"]: ', html);
 *    });
 * }).catch(function(error) {
 *    console.log('Failed to get htmls - ', error);
 * });
 * @param {string} name - Name of the task.
 * @param {function} template - {@link Task} template.
 * @returns {Task}
 */
Task.map = function map(name, template) {
  if (typeof name !== 'string') {
    throw new Error('Task name must be a string.');
  }
  if (typeof template !== 'function') {
    throw new Error('Task template must be a function.');
  }

  return new Task(name, function(array) {
    if (!Array.isArray(array)) {
      throw new Error('Argument to Task#do() must be an array.');
    }

    var task = new Task(name + ': mapping once', template);
    return Promise.all(array.map(function(item) {
      return task.do.call(task, item);
    }));
  });
};

/**
 * Perform a {@link Task}.
 * @example
 * var task = Task.create('task name', function(a, b, done, failed) {...});
 *
 * task.do({ foo: 'bar' }, true).then(function(result) {
 *    console.log('Task done - ', result);
 * }).catch(function(error) {
 *    console.error('Task failed - ', error);
 * });
 * @param {...*} arguments - Arguments for the task template.
 * @returns {Promise}
 */
Task.prototype.do = function doTask() {
  var args = [].slice.call(arguments);
  var self = this;

  return new Promise(function(resolve, reject) {
    var _resolve = function _resolve() {
      self._cancel = null;
      resolve.apply(this, arguments);
    };
    var _reject = function _reject() {
      self._cancel = null;
      reject.apply(this, arguments);
    };
    self._cancel = _reject;

    var ret = self.template.apply(null, args.concat([_resolve, _reject]));
    if (typeof ret instanceof Promise) {
      ret.then(_resolve).catch(_reject);
    }
    else if (typeof ret !== 'undefined') {
      _resolve(ret);
    }
  });
};

/**
 * Cancel a {@link Task} if it hasn't completed.
 * @example
 * var timeout = null;
 * var task = Task.create('cancelable task', function(ms, done, failed) {
 *    timeout = setTimeout(function() { failed('Timeout over!'); }, ms);
 * });
 *
 * task.do(5000).then(function() {...}).catch(function(reason) {
 *    if (reason === 'canceled') {
 *      console.log('We are here because the task was actively canceled.');
 *    }
 *    else {
 *      console.log('We are here because the task failed().');
 *    }
 *    clearTimeout(timeout);
 *    timeout = null;
 * });
 *
 * task.cancel('canceled');
 * @param {*} [reason] - Reason for canceling task.
 * @returns {boolean} - true if called while task is running, false if not.
 */
Task.prototype.cancel = function cancel(reason) {
  if (typeof this._cancel === 'function') {
    this._cancel(reason);
    return true;
  }
  return false;
};

module.exports = Task;
