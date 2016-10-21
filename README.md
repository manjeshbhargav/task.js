# [task.js](https://github.com/manjeshbhargav/task.js.git)

[![npm version](https://badge.fury.io/js/lib-task.svg)](https://badge.fury.io/js/lib-task)
[![Travis CI](https://travis-ci.org/manjeshbhargav/task.js.svg)](https://travis-ci.org/manjeshbhargav/task.js.svg)
[![Lincense MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://img.shields.io/badge/License-MIT-blue.svg)

`task.js` is a JavaScript library for creating logical groups of instructions called `tasks`. These tasks leverage the `Promise`
pattern to allow application logic to specify when a task is `done(result)` or `failed(reason)`.

## Advantages over direct `Promise`s
* You don't have to promisify your async functions that use callbacks.
* However, you can safely use `Promise`s within tasks.
* Powerful APIs to execute a group of tasks, or the same task a number of times.
* You can give a human readable name to your tasks thereby improving code readability.
* These tasks can be easily testable with `Promise` based frameworks like `mocha.js`.

## Installation

* For `Node.js` or `browserify/webpack` projects
    ```
    npm install lib-task
    ```
    ```javascript
    var Task = require('lib-task');
    ```

* For standard web projects
    ```
    git clone https://github.com/manjeshbhargav/task.js.git
    ```
    ```
    cd task.js && npm run build
    ```
    Then, you can use `./dist/task.js` or `./dist/task.min.js` in your web project using `<script>`.

## Task `template`
A `template` is basically a `function` that defines the set of instructions that the task will be performing. It follows this format:
```javascript
/**
 * A task template.
 * @param {...*} taskArguments - Arguments for executing the task.
 * @param {function} done - Called (with results, if any) by the task when it's done.
 * @param {function} failed - Called (with errors, if any) by the task when it fails.
 * @returns {*}
 */
function template(...taskArguments, done, failed) {
  ...
  ...
  doSomeAsyncTask(args, done, failed);
}
```

## Creating a task
You can create a task like this:
```javascript
var loginAttempt = Task.create('attempting to log in', function(endpoint, credentials, done, failed) {
  var username = credentials.username;
  var password = credentials.password;
  // Using JQuery AJAX to contact the login endpoint
  $.post({
    url: endpoint,
    data: { u: username, p: password },
    success: function(response) { done(JSON.parse(response)); },
    failure: failed
  });
});
```

Here, `endpoint` and `credentials` are the arguments required for doing the task. In this example, `done()` is called when the login
`endpoint` responds with a success `JSON` message, and `failed()` is called when it responds with the reason for the failure.

There are other ways to specify when the task is `done/failed`:

* `return`ing a value: A task is considered `done` if the `template`
  `return`s any non-`Promise` value, and `failed` if it throws an exception.
  ```javascript
  var addTask = Task.create('add two numbers', function(a, b) {
    return (a + b);
  });
  ```

* `return`ing a `Promise`: A task is considered `done/failed` if the
  `Promise` returned by the `template` is `resolved/rejected`.
  ```javascript
  var promiseTask = Task.create('track a promise', function(a, b) {
    ...
    ...
    return someAsyncFunctionThatReturnsAPromise(a, b);
  });
  ```

## Executing a task
The `loginAttempt` task that was created in the previous section
can be executed like this:
```javascript
loginAttempt.do('/services/login', {
  usename: 'johndoe',
  password: 'xyz123'
}).then(function(success) {
  console.log('Login successful! - ', success);
}).catch(function(error) {
  console.error('Login failed! - ', error);
});
```
Here, the argument passed to `done()` is passed on to the `Promise`'s
`then()` callback, while the argument passed to `failed()` is passed
on to the `catch()` callback.

* `addTask` from the previous section can be executed like this:
  ```javascript
  addTask.do(2, 3).then(function(sum) {
    // sum is the return value of addTask's template.
    console.log('Sum is - ', sum);
  }).catch(function(e) {
    console.error('Exception thrown while executing template - ', e); 
  });
  ```

* `promiseTask` from the previous section can be executed like this:
  ```javascript
  promiseTask.do('a', 'b').then(function(result) {
    console.log('Promise returned by the template was resolved with - ', result);
  }).catch(function(error) {
    console.error('Promise returned by the template was rejected with - ', error);
  });
  ```

## Canceling a task

Sometimes we need to cancel a task after starting it. We can do it like this:
```javascript
var timeout = null;
var task = Task.create('cancelable task', function(ms, done, failed) {
  timeout = setTimeout(function() { failed('Timeout over!'); }, ms);
});

task.do(5000).then(function() {...}).catch(function(reason) {
  if (reason === 'canceled') {
    console.log('We are here because the task was actively canceled.');
  }
  else {
    console.log('We are here because the task failed().');
  }
  clearTimeout(timeout);
  timeout = null;
});

task.cancel('canceled');
```
`Task#cancel()` accepts an optional argument that is passed on to the `Promise#catch()` callback. This helps us determine
whether we are in `Promise#catch()` because of `failed()` or because of `Task#cancel()`.

## Executing tasks serially
Sometimes we need to perform a set of tasks serially, where the next task depends on the result from the previous task.
We can do it like this:
```javascript
var task1 = Task.create('task 1', function(task1Arg, done, failed) {...});
var task2 = Task.create('task 2', function(task1Result, done, failed) {...});
var task3 = Task.create('task 3', function(task2Result, done, failed) {...});
var taskSequence = Task.sequence('sequence', [task1, task2, task3]);

// The arguments of Task#do() are arguments for the first task in the sequence.
taskSequence.do(10).then(function(task3Result) {
  console.log('All done one after the other!');
}).catch(function(error) {
  console.error('One of the tasks failed - ', error);
});
```

## Executing tasks in parallel
Sometimes we need to wait for a set of independent tasks to be executed before we can proceed. We can do it like this:
```javascript
var task1 = Task.create('task1', function(arg1, done, failed) {...});
var task2 = Task.create('task2', function(arg21, arg22, done, failed) {...});
var task3 = Task.create('task3', function(arg31, done, failed) {...});
var taskParallel = Task.parallel('parallel', [task1, task2, task3]);

// The arguments for Task#do() is (args1, args2, args3), where:
// * args1 => Array of arguments for task1's template
// * args2 => Array of arguments for task2's template
// * args3 => Array of arguments for task3's template
// NOTE: If there is only one argument for a task, then there is no
//       need to enclose it in an array.
taskParallel.do(1, ['2', true], {}).then(function(results) {
  console.log('Results of all completed tasks - ', results);
}).catch(function(error) {
  console.error('One of the tasks failed - ', error);
});
```

## Executing an anonymous task
Sometimes we don't want to create and then do a task because it is one-off and we don't intend to re-do it at any point in the
future. We can do it like this:
```javascript
Task.do(function(a, b, done, failed) {
  startMyApplication(a, b, function(started, result) {
    var status = started ? done : failed;
    status(result);
  });
}, 1, '2').then(function(outcome) {
  console.log('Application successfully started! - ', outcome);
}).catch(function(error) {
  console.error('Problem starting application! - ', error);
});
```

## Re-trying a task
Sometimes we want to try a task a number of times until it succeeds, or we've tried a certain number of times.
Ex: If we lose our connection with the server, we would want to re-try connecting for a certain number of times.
We can do it like this:
```javascript
var numRetries = 10;
var retryConnection = Task.try('retry connecting to server', function(request, done, failed) {
  request.connect('/server/connect', function(response) {
    if (response.connection) { done(response.connection); }
    else { failed(response.error); }
  });
});

function retryConnect() {
  retryConnection.do(new Request(), numRetries).then(function(connection) {
    console.log('Connected! - ', connection);
    connection.on('lost', retryConnect);
  }).catch(function(error) {
    console.error('Failed to connect after ' + numRetries + ' tries! - ', error);
  });
}
```

# Running a task for each item in an array
Sometimes we want to run a task on each item of an array, and once we have gotten all the results,
act on them (like `Array.prototype.map()`, only async). We can do it like this:
```javascript
var getHtmlMap = Task.map('get html of a given url', function(url, done, failed) {
  http.get(url, function(response) {
    var html = '';
    response.on('data', function(data) {
      html += data;
    });
    response.on('end', function() {
      done(html);
    });
  }).on('error', failed);
});

// The argument for Task#do() is an array where the task has to be
// performed once for each item in parallel.
getHtmlMap.do(['http://www.ex1.com', 'http://www.ex2.com']).then(function(htmls) {
  htmls.forEach(function(html, i) {
    console.log('HTML["' + domains[i] + '"]: ', html);
  });
}).catch(function(error) {
  console.log('Failed to get htmls - ', error);
});
```
