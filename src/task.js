'use strict';

function Task(name, template) {
  Object.defineProperties(this, {
    name: {
      value: name
    },
    template: {
      value: template
    }
  });
}

Task.create = function create(name, template) {
  return new Task(name, template);
};

Task.do = function doTask() {
  var args = [].slice.call(arguments);
  var template = args.shift();
  var task = new Task('anonymous', template);
  return task.do.apply(task, args);
};

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

Task.parallel = function parallel(taskPromises) {
  return Promise.all(taskPromises);
};

Task.prototype.do = function doTask() {
  var args = [].slice.call(arguments);
  var self = this;
  return new Promise(function executor(resolve, reject) {
    self.template.apply(null, args.concat([resolve, reject]));
  });
};

module.exports = Task;