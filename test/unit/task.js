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
    it('should return a Promise', () => {
      var task = new Task('name', () => {});
      assert(task.do() instanceof Promise);
    });

    it('should reject the Promise if the template throws', () => {
      return new Promise((resolve, reject) => {
        var task = new Task('name', () => {
          throw new Error('error');
        });
        task.do().then(reject).catch(resolve);
      });
    });

    it('should resolve the Promise if done() is called', () => {
      var task = new Task('name', done => done());
      return task.do();
    });

    it('should reject the Promise if failed() is called', () => {
      return new Promise((resolve, reject) => {
        var task = new Task('name', (done, failed) => failed());
        task.do().then(reject).catch(resolve);
      });
    });

    it('should resolve the Promise if done() is called before timeout', () => {
      var task = new Task('name', done => { setTimeout(done); });
      task.timeout(1000, 'timeout');
      return task.do();
    });

    it('should reject the Promise if failed() is called before timeout', () => {
      return new Promise((resolve, reject) => {
        var task = new Task('name', (done, failed) => { setTimeout(failed.bind(null, 'failed')); });
        task.timeout(1000, 'timeout');
        return task.do().then(reject).catch(reason => {
          assert.equal(reason, 'failed');
          resolve();
        });
      });
    });

    context('when template returns a value instead of calling done() or failed()', () => {
      context('when return value is a Promise', () => {
        it('should resolve its Promise if the returned Promise is resolved', () => {
          var task = new Task('name', () => {
            return new Promise(resolve => resolve());
          });
          return task.do();
        });

        it('should reject its Promise if the returned Promise is rejected', () => {
          return new Promise((resolve, reject) => {
            var task = new Task('name', () => {
              return new Promise((resolve, reject) => reject());
            });
            task.do().then(reject).catch(resolve);
          });
        });
      });

      context('when return value is not a Promise', () => {
        it('should resolve its Promise with the return value', () => {
          var task = new Task('name', () => { return 0; });
          return task.do().then(result => assert.equal(result, 0));
        });
      });
    });
  });

  describe('#cancel', () => {
    it('should return false when called before #do()', () => {
      var task = new Task('name', done => done());
      assert.equal(task.cancel(), false);
    });

    it('should return false when called after done()', () => {
      var task = new Task('name', done => done());
      return task.do().then(() => {
        assert.equal(task.cancel(), false);
      })
    });

    it('should return false when called after failed()', () => {
      return new Promise((resolve, reject) => {
        var task = new Task('name', (done, failed) => failed());
        task.do().then(reject).catch(() => {
          assert.equal(task.cancel(), false);
          resolve();
        });
      });
    });

    it('should return true when called after #do() but before completed', () => {
      var task = new Task('name', () => {});
      task.do();
      assert.equal(task.cancel(), true);
    });

    it('should reject the Promise returned by #do()', () => {
      return new Promise((resolve, reject) => {
        var task = new Task('name', (done, failed) => { setTimeout(done); });
        task.do().then(reject).catch(reason => {
          assert.equal(reason, 'canceled');
          assert.equal(task.cancel(), false);
          resolve();
        });
        task.cancel('canceled');
      });
    });
  });

  describe('#timeout', () => {
    it('should throw if timeout milliseconds is not a number', () => {
      var task = new Task('name', () => {});
      assert.throws(task.timeout.bind(task, '1'));
      assert.throws(task.timeout.bind(task, true));
      assert.throws(task.timeout.bind(task, []));
      assert.throws(task.timeout.bind(task, {}));
    });

    it('should return true if called before #do()', () => {
      var task = new Task('name', () => {});
      assert.equal(task.timeout(0), true);
    });

    it('should return false if called after #do() and before done()/failed()', () => {
      var task = new Task('name', () => {});
      task.do();
      assert.equal(task.timeout(0), false);
    });

    it('should time out the Promise before done()', () => {
      return new Promise((resolve, reject) => {
        var task = new Task('name', done => { setTimeout(done, 100); });
        task.timeout(0, 'timeout');
        task.do().then(reject).catch(reason => {
          assert.equal(reason, 'timeout');
          resolve();
        });
      });
    });

    it('should time out the Promise before failed()', () => {
      return new Promise((resolve, reject) => {
        var task = new Task('name', (done, failed) => { setTimeout(failed, 100); });
        task.timeout(0, 'timeout');
        task.do().then(reject).catch(reason => {
          assert.equal(reason, 'timeout');
          resolve();
        });
      });
    });

    it('should time out the promise after the set period', () => {
      return new Promise((resolve, reject) => {
        var to = 500;
        var task = new Task('name', (done, failed) => { setTimeout(failed, to << 1); });
        task.timeout(to, 'timeout');

        var start = new Date().getTime();
        task.do().then(reject).catch(() => {
          var end = new Date().getTime();
          assert(Math.abs(end - start - to) < Math.floor(to / 10));
          resolve();
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
      assert(Task.create('name', () => {}) instanceof Task);
    });
  });

  describe('.do', () => {
    it('should throw if template is not a function', () => {
      assert.throws(Task.do.bind(Task, {}));
    });

    it('should return a Promise', () => {
      assert(Task.do(() => {}) instanceof Promise);
    });

    it('should resolve the Promise if done() is called', () => {
      return Task.do(done => done());
    });

    it('should reject the Promise if failed() is called', () => {
      return new Promise((resolve, reject) => {
        Task.do((done, failed) => failed()).then(reject).catch(resolve);
      });
    });
  });

  describe('.sequence', () => {
    it('should throw if the first argument is not a string', () => {
      assert.throws(Task.sequence.bind(Task, {}, []));
      assert.throws(Task.sequence.bind(Task, null, []));
      assert.throws(Task.sequence.bind(Task, 1, []));
      assert.throws(Task.sequence.bind(Task, true, []));
      assert.throws(Task.sequence.bind(Task, [], []));
    });

    it('should throw if the second argument is not an array of Tasks', () => {
      assert.throws(Task.sequence.bind(Task, 'seq'));
      assert.throws(Task.sequence.bind(Task, 'seq', [{}, 1, 2]));
      assert.throws(Task.sequence.bind(Task, 'seq', [
        Task.create('task1', () => {}),
        Task.create('task2', () => {}),
        { name: 'task3' }
      ]));
    });

    it('should return a Task', () => {
      assert(Task.sequence('seq', [ Task.create('task', () => {}) ]) instanceof Task);
    });

    it ('should resolve the Promise once all tasks are completed', () => {
      return Task.sequence('seq', [
        Task.create('task 1', (arg, done) => done(arg + 2)),
        Task.create('task 2', (res, done) => done(res + 3)),
        (res, done) => done(res + 4)
      ]).do(1).then(res => assert.equal(res, 10));
    });

    it('should reject the Promise if any task calls failed()', () => {
      return Task.do((done, failed) => {
        Task.sequence('seq', [
          Task.create('task 1', done => done()),
          (done, failed) => failed(),
          Task.create('task 3', done => done())
        ]).do().then(failed).catch(done);
      });
    });
  });

  describe('.parallel', () => {
    it('should return a Task', () => {
      assert(Task.parallel('parallel', [ Task.create('task', done => done()) ]) instanceof Task);
    });

    it('should throw if the first argument is not a string', () => {
      assert.throws(Task.parallel.bind(Task));
      assert.throws(Task.parallel.bind(Task, 1, [() => {}]));
      assert.throws(Task.parallel.bind(Task, false, [() => {}]));
      assert.throws(Task.parallel.bind(Task, {}, [() => {}]));
      assert.throws(Task.parallel.bind(Task, [], [() => {}]));
    });

    it('should throw if the second argument is not an array of Tasks/templates', () => {
      assert.throws(Task.parallel.bind(Task));
      assert.throws(Task.parallel.bind(Task, 'parallel'));
      assert.throws(Task.parallel.bind(Task, 'parallel', [{}, 1, 2]));
      assert.throws(Task.parallel.bind(Task, 'parallel', [
        Task.create('task1', () => {}),
        Task.create('task2', () => {}),
        { name: 'task3' }
      ]));
    });

    it('should not throw if argument is an array of Tasks/templates', () => {
      assert.doesNotThrow(Task.parallel.bind(Task, 'parallel', [
        Task.create('task1', () => {}),
        Task.create('task2', () => {}),
        () => {}
      ]));
    });

    it('should resolve the Promise with the results when all tasks are done', () => {
      return Task.parallel('parallel', [
        Task.create('task1', (arg, done) => done(arg + 1)),
        Task.create('task2', (arg1, arg2, done) => done(arg1 + arg2 + 2)),
        Task.create('task3', done => done(3))
      ]).do(1, [2, 3]).then(results => assert.deepEqual(results, [2, 7, 3]));
    });

    it('should reject the Promise if any one of the tasks fail', () => {
      return new Promise((resolve, reject) => {
        return Task.parallel('parallel', [
          Task.create('task1', done => done(1)),
          Task.create('task2', (done, failed) => failed()),
          Task.create('task3', done => done(3))
        ]).do().then(reject).catch(resolve);
      });
    });
  });

  describe('.try', () => {
    it('should throw if the first argument is not string', () => {
      assert.throws(Task.try.bind(Task));
      assert.throws(Task.try.bind(Task, 2));
      assert.throws(Task.try.bind(Task, {}, () => {}));
    });

    it('should throw if the second argument is not a template', () => {
      assert.throws(Task.try.bind(Task, 'try'));
      assert.throws(Task.try.bind(Task, 'try', 1));
      assert.throws(Task.try.bind(Task, 'try', {}));
    });

    it('should return a Task', () => {
      assert(Task.try('try', () => {}) instanceof Task);
    });

    it('should resolve the Promise if the task is done before max retries', () => {
      var maxRetries = 10;
      return Task.try('try', (arg1, arg2, done, failed) => {
        maxRetries--;
        (maxRetries === 5 ? done([arg1, arg2]) : failed)();
      }, maxRetries).do(1, '2', maxRetries).then(result => {
        assert.equal(maxRetries, 5);
        assert.deepEqual(result, [1, '2']);
      });
    });

    it('should reject the Promise if the task fails even after max retries', () => {
      return new Promise((resolve, reject) => {
        Task.try('try', (done, failed) => failed()).do(10).then(reject).catch(resolve);
      });
    });

    it('should reject the Promise if max retries is not a number', () => {
      return new Promise((resolve, reject) => {
        Task.try('try', done => done()).do('10').then(reject).catch(resolve);
      });
    });
  });

  describe('.map', () => {
    it('should throw if the first argument is not a string', () => {
      assert.throws(Task.map.bind(Task));
      assert.throws(Task.map.bind(Task, 2));
      assert.throws(Task.map.bind(Task, {}, () => {}));
    });

    it('should throw if the second argument is not a template', () => {
      assert.throws(Task.map.bind(Task, 'map'));
      assert.throws(Task.map.bind(Task, 'map', 1));
      assert.throws(Task.map.bind(Task, 'map', {}));
    });

    it('should return a Task', () => {
      assert(Task.map('map', () => {}) instanceof Task);
    });

    it('should resolve the Promise when all tasks are done', () => {
      return Task.map('map', (num, done) => done(num + 1)).do([1, 2, 3]).then(result => {
        assert.equal(result.length, 3);
        assert.deepEqual(result, [2, 3, 4]);
      });
    });

    it('should reject the Promise if any one task fails', () => {
      return new Promise((resolve, reject) => {
        Task.map('map', (num, done, failed) => num === 2 ? failed() : done()).do([1, 2, 3]).then(reject).catch(resolve);
      });
    });

    it('should resolve the Promise if the array is empty', () => {
      return Task.map('map', () => {}).do([]);
    });

    it('should reject the Promise if anything other than an array is given', () => {
      return new Promise((resolve, reject) => {
        Task.map('map', (item, done) => done(item)).do(false).then(reject).catch(resolve);
      });
    });
  });

  describe('.delay', () => {
    it('should throw if the first argument is not a string', () => {
      assert.throws(Task.delay.bind(Task));
      assert.throws(Task.delay.bind(Task, 2));
      assert.throws(Task.delay.bind(Task, {}, () => {}));
    });

    it('should throw if the second argument is not a template', () => {
      assert.throws(Task.delay.bind(Task, 'delay'));
      assert.throws(Task.delay.bind(Task, 'delay', 1));
      assert.throws(Task.delay.bind(Task, 'delay', {}));
    });

    it('should return a Task', () => {
      assert(Task.delay('delay', () => {}) instanceof Task);
    });

    it('should reject the promise if delay period is not a number', () => {
      return new Promise((resolve, reject) => {
        var task = Task.delay('delay', done => done());
        return task.do('2').then(reject).catch(resolve);
      });
    });

    it('should start executing the task after a given time', () => {
      var start = new Date().getTime();
      var delay = 500;

      var task = Task.delay('delay', x => {
        var end = new Date().getTime();
        assert.equal(x, 5);
        assert(end - start - delay < Math.floor(0.1 * delay));
        return true;
      });

      return task.do(5, delay);
    });
  });
});
