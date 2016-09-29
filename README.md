# task.js

`task.js` is a JavaScript library for creating logical groups of instructions called `tasks`. These tasks leverage the `Promise`
pattern to allow application logic to specify when a task is `done(result)` or `failed(reason)`.

## Advantages over using `Promise`s directly:
* You don't have to promisify your async functions that use callbacks.
* However, you can safely use `Promise`s within tasks.
* You can leverage APIs to run a sequence of tasks, or try the same
  task multiple times etc.
* You can give a human readable name to your tasks thereby improving
  code readability.
* These tasks can be easily testable with `Promise` based frameworks
  like `mocha.js`.

## Task `template`:
A `template` is basically a `function` that defines the set of instructions that the task will be performing. It follows this format:
```javascript
/**
 * A task template.
 * @param {...*} taskArguments - Arguments for executing the task.
 * @param {function} done - Called (with results, if any) by the task when it's done.
 * @param {function} failed - Called (with errors, if any) by the task whe it fails.
 * @returns {*}
 */
function template(...taskArguments, done, failed) {
  ...
  ...
  doSomeAsyncTask(args, done, failed);
}
```

## Creating a task:
You can create a task like this:
```
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
  ```
  var addTask = Task.create('add two numbers', function(a, b) {
    return (a + b);
  });
  ```

* `return`ing a `Promise`: A task is considered `done/failed` if the
  `Promise` returned by the `template` is `resolved/rejected`.
  ```
  var promiseTask = Task.create('track a promise', function(a, b) {
    ...
    ...
    return someAsyncFunctionThatReturnsAPromise(a, b);
  });
  ```

## `do`ing a task:
The `loginAttempt` task that was created in the previous section
can be executed like this:
```
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
  ```
  addTask.do(2, 3).then(function(sum) {
    // sum is the return value of addTask's template.
    console.log('Sum is - ', sum);
  }).catch(function(e) {
    console.error('Exception thrown while executing template - ', e); 
  });
  ```

* `promiseTask` from the previous section can be executed like this:
  ```
  promiseTask.do('a', 'b').then(function(result) {
    console.log('Promise returned by the template was resolved with - ', result);
  }).catch(function(error) {
    console.error('Promise returned by the template was rejected with - ', error);
  });
  ```

## `do`ing tasks serially:
Sometimes we need to perform a set of tasks serially, where the next task depends on the result from the previous task.
We can do it like this:
```
var task1 = Task.create('task1', function(a, b, done, failed) {...});
var task2 = Task.create('task2', function(task1Result, done, failed) {...});
var task3 = Task.create('task3', function(task2Result, done, failed) {...});

Task.sequence([task1, task2, task3], ...argsForTask1).then(function(task3Result) {
  console.log('Result of task3 - ', task3Result);
}).catch(function(error) {
  console.error('One of the tasks failed - ', error);
});
```

## `do`ing tasks in parallel:
Sometimes we need to wait for a set of independent tasks to be executed before we can proceed. We can do it like this:
```
var task1 = Task.create('task1', function(a, b, done, failed) {...});
var task2 = Task.create('task2', function(d, e, f, done, failed) {...});
var task3 = Task.create('task3', function(done, failed) {...});

Task.parallel([
  task1.do(1, 2),
  task2.do('3', true, {}),
  task3.do()
]).then(function(taskResults) {
  console.log('Results of all tasks - ', taskResults);
}).catch(function(error) {
  console.error('One of the tasks failed - ', error);
});
```

## `do`ing an anonymous task:
Sometimes we don't want to create and then do a task because it is one-off and we don't intend to re-do it at any point in the
future. We can do it like this:
```
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