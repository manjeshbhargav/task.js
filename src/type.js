'use strict';

function Type(variant) {
  Object.defineProperties(this, {
    variant: {
      value: variant
    }
  });
}

Type.prototype.is = function is(type) {
  return (typeof this.variant === type);
};

Type.prototype.isNull = function isNull() {
  return (this.variant === null);
};

Type.prototype.isArray = function isArray() {
  return (this.is('object') && this.variant.hasOwnProperty('length'));
};

Type.prototype.isInstanceOf = function isInstanceOf(Type) {
  return (this.variant instanceof Type);
};

Type.prototype.isArrayOf = function isArrayOf(Type) {
  return (this.isArray() && this.variant.every(function(item) {
    return type(item).isInstanceOf(Type);
  }));
};

function type(variant) {
  return new Type(variant);
}

module.exports = type;