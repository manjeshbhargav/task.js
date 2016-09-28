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
});