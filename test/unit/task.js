'use strict';

var assert = require('assert');
var Task = require('../../src/task');

describe('Task', () => {
  describe('#constructor', () => {
    it('should return a Task', () => {
      var task = new Task('name', () => {});
      assert(task instanceof Task);
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
      assert(task.do() instanceof Promise);
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
      var task = new Task('name', done => {
        done();
      });
      return task.do();
    });

    it('should reject the promise if failed() is called', () => {
      return new Promise((resolve, reject) => {
        var task = new Task('name', (done, failed) => {
          failed();
        });
        task.do().then(reject).catch(resolve);
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
      assert(Task.create('name', () => {}) instanceof Task);
    });
  });

  describe('.do', () => {
    it('should throw if template is not a function', () => {
      assert.throws(Task.do.bind(Task, {}));
    });

    it('should return a promise', () => {
      assert(Task.do(() => {}) instanceof Promise);
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
});