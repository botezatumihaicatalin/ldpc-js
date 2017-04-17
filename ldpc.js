(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([ "mathjs "], factory);
  } 
  else if (typeof exports === "object") {
    module.exports = factory(require("mathjs"));
  } 
  else {
    root.LDPC = factory(root.math);
  }
}(window, function (math) {
    // this is where I defined my module implementation

    function LDPC(options) {
      options = options || { }
      if (typeof options.n !== "number") {
        options.n = 0
      }
      if (typeof options.k !== "number") {
        options.k = 0
      }
      if (typeof options.error !== "number") {
        options.error = 0.1
      }
      if (typeof options.parity === "undefined") {
        options.parity = new Array()
      }

      this.n = options.n
      this.k = options.k
      this.j = this.n - this.k
      this.error = options.error
      this.parity = math.sparse(options.parity).resize([ this.j, this.n ])
    }

    function normalizedProduct(values) {
      var prod1 = 1, prod2 = 1;
      for (var i = 0, l = values.length; i < l; i++) {
        prod1 *= values[i], prod2 *= 1.0 - values[i];
      }
      return prod1 / (prod1 + prod2);
    }

    LDPC.prototype.firstPass = function(symbols) {
      var error = this.error

      return this.parity.map(function (value, index) {
        var check = index[0], digit = index[1];
        return symbols[digit] === 1 ? error : (1 - error)
      }, true)
    }

    LDPC.prototype.passMessageToParity = function(matrix, initial) {
      var buffer = this.parity.clone()
      var rows = math.range(0, this.j)

      matrix.forEach(function (value, index) {
        var check = index[0], digit = index[1];
        var column = matrix.subset(math.index(rows, digit))
        var product = [ initial.get(index) ]

        column.forEach(function (valuep, indexp) {
          var checkp = indexp[0], digitp = indexp[1];
          if (checkp !== check) product.push(valuep)
        }, true)

        buffer.set(index, normalizedProduct(product));
      }, true)

      return buffer
    }

    LDPC.prototype.passMessageToVariable = function(matrix) {
      var buffer = this.parity.clone()
      var cols = math.range(0, this.n)

      matrix.forEach(function (value, index) {
        var check = index[0], digit = index[1];
        var row = matrix.subset(math.index(check, cols))
        var product = 1;

        row.forEach(function (valuep, indexp) {
          var checkp = indexp[0], digitp = indexp[1];
          if (digitp !== digit) product *= 1 - 2 * valuep
        }, true)

        buffer.set(index, 0.5 - 0.5 * product);
      }, true)

      return buffer
    }

    LDPC.prototype.finalPass = function(matrix) {
      var finals = new Array(this.n);
      for (var i = 0; i < finals.length; i++) {
        finals[i] = new Array();
      }

      matrix.forEach(function (value, index) {
        var check = index[0], digit = index[1];
        finals[digit].push(value);
      }, true)

      for (var i = 0; i < finals.length; i++) {
        finals[i] = normalizedProduct(finals[i]);
      }

      return finals;
    }

    LDPC.prototype.tryCorrect = function(symbols) {
      var initial = this.firstPass(symbols);
      var current = this.passMessageToVariable(initial);
      console.log(0, current.toString())

      for (var i = 0; i < 100; i ++) {
        current = this.passMessageToParity(current, initial);
        current = this.passMessageToVariable(current);
        console.log(0, current.toString())
      }

      return this.finalPass(current);
    }

    return LDPC;
  }));