'use strict';

var assert = require('assert');
var type = require('../../src/type');
var Task = require('../../src/task');

describe('Task', () => {
  describe('#constructor', () => {
    it('should return a Task', () => {
      var task = new Task('name', () => {});
      assert(type(task).isInstanceOf(Task));
    });

    it('should set the name and template', () => {
      var template = () => {};
      var name = 'task';
      var task = new Task(name, template);
      assert.equal(task.name, name);
      assert.equal(task.template, template);
    });
  });

  describe('#do', () => {
    it('should return a promise', () => {
      var task = new Task('name', () => {});
      assert(type(task.do()).isInstanceOf(Promise));
    });

    it('should reject the promise if the template throws', () => {
      return new Promise((resolve, reject) => {
        var task = new Task('name', () => {
          throw(new Error('error'));
        });
        task.do().then(reject).catch(resolve);
      });
    });

    it('should resolve the promise if done() is called', () => {
      var task = new Task('name', done => done());
      return task.do();
    });

    it('should reject the promise if failed() is called', () => {
      return new Promise((resolve, reject) => {
        var task = new Task('name', (done, failed) => failed());
        task.do().then(reject).catch(resolve);
      });
    });

    context('when template returns a value instead of calling done() or failed()', () => {
      context('when return value is a promise', () => {
        it('should resolve its promise if the returned promise is resolved', () => {
          var task = new Task('name', () => {
            return new Promise(resolve => resolve());
          });
          return task.do();
        });

        it('should reject its promise if the returned promise is rejected', () => {
          return new Promise((resolve, reject) => {
            var task = new Task('name', () => {
              return new Promise((resolve, reject) => reject());
            });
            task.do().then(reject).catch(resolve);
          });
        });
      });

      context('when return value is not a promise', () => {
        it('should resolve its promise with the return value', () => {
          var task = new Task('name', () => { return 1; });
          return task.do().then(result => assert.equal(result, 1));
        });
      });
    });
  });

  describe('.create', () => {
    it('should throw if name is not a string', () => {
      assert.throws(Task.create.bind(Task, {}, () => {}));
    });

    it('should throw if template is not a function', () => {
      assert.throws(Task.create.bind(Task, 'name', {}));
    });

    it('should return a Task', () => {
      assert(type(Task.create('name', () => {})).isInstanceOf(Task));
    });
  });

  describe('.do', () => {
    it('should throw if template is not a function', () => {
      assert.throws(Task.do.bind(Task, {}));
    });

    it('should return a promise', () => {
      assert(type(Task.do(() => {})).isInstanceOf(Promise));
    });

    it('should resolve the promise if done() is called', () => {
      return Task.do(done => done());
    });

    it('should reject the promise if failed() is called', () => {
      return new Promise((resolve, reject) => {
        Task.do((done, failed) => failed()).then(reject).catch(resolve);
      });
    });
  });

  describe('.sequence', () => {
    it('should throw if argument is not an array of Tasks', () => {
      assert.throws(Task.sequence.bind(Task));
      assert.throws(Task.sequence.bind(Task, [{}, 1, 2]));
      assert.throws(Task.sequence.bind(Task, [
        Task.create('task1', () => {}),
        Task.create('task2', () => {}),
        { name: 'task3' }
      ]));
    });

    it('should return a promise', () => {
      assert(Task.sequence([ Task.create('task', () => {}) ]) instanceof Promise);
    });

    it ('should resolve the promise once all tasks are completed', () => {
      return Task.sequence([
        Task.create('task 1', done => done(1)),
        Task.create('task 2', (res, done) => done(res + 1)),
        Task.create('task 3', (res, done) => done(res + 2))
      ]).then(res => assert.equal(res, 4));
    });

    it('should reject the promise if any task calls failed()', () => {
      return Task.do((done, failed) => {
        Task.sequence([
          Task.create('task 1', done => done()),
          Task.create('task 2', (done, failed) => failed()),
          Task.create('task 3', done => done())
        ]).then(failed).catch(done);
      });
    });
  });

  describe('.parallel', () => {
    it('should return a promise', () => {
      assert(Task.parallel([ Task.create('task', done => done()).do() ]) instanceof Promise);
    });

    it('should throw if argument is not an array of task promises', () => {
      assert.throws(Task.parallel.bind(Task));
      assert.throws(Task.parallel.bind(Task, [{}, 1, 2]));
      assert.throws(Task.parallel.bind(Task, [Task.create('name', () => {})]));
    });

    it('should not throw if argument is an array of promises', () => {
      assert.doesNotThrow(Task.parallel.bind(Task, [
        Task.create('task1', () => {}).do(),
        Task.create('task2', () => {}).do(),
      ]));
    });

    it('should resolve the promise with the results when all tasks are done', () => {
      return Task.parallel([
        Task.create('task1', done => done(1)).do(),
        Task.create('task2', done => done(2)).do(),
        Task.create('task3', done => done(3)).do()
      ]).then(results => assert.deepEqual(results, [1, 2, 3]));
    });

    it('should reject the promise if any one of the tasks fail', () => {
      return new Promise((resolve, reject) => {
        return Task.parallel([
          Task.create('task1', done => done(1)).do(),
          Task.create('task2', (done, failed) => failed()).do(),
          Task.create('task3', done => done(3)).do()
        ]).then(reject).catch(resolve);
      });
    });
  });

  describe('.try', () => {
    it('should return a promise', () => {
      assert(Task.try(Task.create('task', () => {}), 10) instanceof Promise);
    });

    it('should throw if the first argument is not a task', () => {
      assert.throws(Task.try.bind(Task, {}, 10));
    });

    it('should throw if the second argument is not a number', () => {
      assert.throws(Task.try.bind(Task, Task.create('task', () => {}), '10'));
    });

    it('should resolve the promise if the task is done before max retries', () => {
      var maxRetries = 10;
      var task = Task.create('task', (done, failed) => {
        maxRetries--;
        (maxRetries === 5 ? done : failed)();
      });
      return Task.try(task, maxRetries).then(() => {
        assert.equal(maxRetries, 5);
      });
    });

    it('should reject the promise if the task fails even after max retries', () => {
      return new Promise((resolve, reject) => {
        var task = Task.create('task', (done, failed) => failed());
        Task.try(task, 10).then(reject).catch(resolve);
      });
    });
  });
});