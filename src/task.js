'use strict';

var type = require('./type');

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
  if (!type(name).is('string')) {
    throw(new Error('name must be a string'));
  }
  if (!type(template).is('function')) {
    throw(new Error('template must be a function'));
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
 * @returns {Promise.<*>}
 */
Task.do = function doTask(template) {
  if (!type(template).is('function')) {
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
 *    console.error('One of the tasks failed - ', error);
 * });
 * @memberof Task
 * @param {Task[]} tasks - Tasks to be performed in sequence.
 * @param {...*} arguments - Arguments for the first task.
 * @returns {Promise.<*>}
 */
Task.sequence = function sequence(tasks) {
  if (!type(tasks).isArrayOf(Task)) {
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
 * @example
 * var task1 = Task.create('task1', function(arg1, done, failed) {...});
 * var task2 = Task.create('task2', function(arg21, arg22, done, failed) {...});
 * var task3 = Task.create('task3',, function(done, failed) {...});
 *
 * Task.parallel([
 *    task1.do(1),
 *    task2.do(true, 'foo'),
 *    task3.do()
 * ]).then(function(results) {
 *    console.log('Results of all completed tasks - ', results);
 * }).catch(function(error) {
 *    console.error('One of the tasks failed - ', error);
 * });
 * @memberof Task
 * @param {Promise[]} taskPromises - Promises returned by each {@link Task}'s <code>do()</code> method.
 * @returns {Promise.<*>}
 */
Task.parallel = function parallel(taskPromises) {
  if (!type(taskPromises).isArrayOf(Promise)) {
    throw(new Error('Argument should be an array of task promises.'));
  }
  return Promise.all(taskPromises);
};

/**
 * Try to do a {@link Task} at most n times until done.
 * @example
 * <caption>Try with a {@link Task}</caption>
 * var task = Task.create('try', function(done, failed) {...});
 * Task.try(task, 10).then(function() {
 *    console.log('Successful before 10 tries!');
 * }).catch(function() {
 *    console.log('Failed even after 10 tries!');
 * });
 *
 * @example
 * <caption>Try with a template function</caption>
 * Task.try(function(done, failed) {...}, 10).then(function() {
 *    console.log('Successful before 10 tries!');
 * }).catch(function() {
 *    console.log('Failed even after 10 tries!');
 * });
 * @memberof Task
 * @param {Task|function} taskOrTemplate - {@link Task} or template function to be tried.
 * @param {Number} tries - Maximum number of tries.
 * @returns {Promise.<*>}
 */
Task.try = function tryTask(taskOrTemplate, tries) {
  var task = taskOrTemplate;

  if (type(taskOrTemplate).is('function')) {
    task = new Task('anonymous', taskOrTemplate);
  }
  else if (!type(taskOrTemplate).isInstanceOf(Task)) {
    throw(new Error('First argument should be a task or a template.'));
  }

  if (!type(tries).is('number')) {
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
 * Perform a task on an array of items.
 * @example
 * <caption>Map with a {@link Task}</caption>
 * var getContent = Task.create('get html content', function(url, done, failed) {
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
 * var domains = ['http://www.ex1.com', 'http://www.ex2.com'];
 * Task.map(domains, getContent).then(function(content) {
 *    content.forEach(function(html, i) {
 *      console.log('Content["' + domains[i] + '"]: ', html);
 *    });
 * }).catch(function(error) {
 *    console.log('Failed to get content - ', error);
 * });
 *
 * @example
 * <caption>Map with a template function</caption>
 * var domains = ['http://www.ex1.com', 'http://www.ex2.com'];
 * Task.map(domains, function(url, done, failed) {
 *    http.get(url, function(response) {
 *      var html = '';
 *      response.on('data', function(data) {
 *        html += data;
 *      });
 *      response.on('end', function() {
 *        done(html);
 *      });
 *    }).on('error', failed);
 * }).then(function(content) {
 *    content.forEach(function(html, i) {
 *      console.log('Content["' + domains[i] + '"]: ', html);
 *    });
 * }).catch(function(error) {
 *    console.log('Failed to get content - ', error);
 * });
 * @param {any[]} array - Array of items on which a task has to be performed.
 * @param {Task|function} taskOrTemplate - {@link Task} to be performed or template function representing the task.
 * @returns {Promise.<*>}
 */
Task.map = function map(array, taskOrTemplate) {
  if(!type(array).isArray()) {
    throw(new Error('First argument must be an array'));
  }

  var task = taskOrTemplate;
  if (type(taskOrTemplate).is('function')) {
    task = new Task('anonymous', taskOrTemplate);
  }
  else if(!type(taskOrTemplate).isInstanceOf(Task)) {
    throw(new Error('Second argument must be a template function or a Task'));
  }

  return Task.parallel(array.map(function(item) {
    return task.do(item);
  }));
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
 * @returns {Promise.<*>}
 */
Task.prototype.do = function doTask() {
  var args = [].slice.call(arguments);
  var self = this;
  return new Promise(function execute(resolve, reject) {
    try {
      var ret = self.template.apply(null, args.concat([resolve, reject]));
      if (type(ret).isInstanceOf(Promise)) {
        Promise.resolve(ret).then(resolve).catch(reject);
      }
      else if (!type(ret).is('undefined')) {
        resolve(ret);
      }
    }
    catch(e) {
      reject(e);
    }
  });
};

module.exports = Task;
