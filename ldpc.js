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
}(this, function (math) {
    // this is where I defined my module implementation

    function LDPC(options) {
      options = options || { }
      
      // The coded message has "n" symbols
      if (typeof options.n !== "number") {
        options.n = 0; 
      }
      // The input message has "k" symbols
      if (typeof options.k !== "number") {
        options.k = 0; 
      }
      // The probability that the channel will error some bits.
      if (typeof options.error !== "number") {
        options.error = 0.01; 
      }
      // The parity matrix used to actually encode/decode.
      if (typeof options.parity === "undefined") {
        options.parity = LDPC.generateParity(options.n, options.k);
      }

      this.n = options.n;
      this.k = options.k;
      this.j = this.n - this.k;
      this.error = options.error;
      this.parity = math.sparse(options.parity).resize([ this.j, this.n ]);
      this.generator = this.calcGenerator();
    }

    function normalizedProduct(values) {
      var prod1 = 1, prod2 = 1;
      for (var i = 0, l = values.length; i < l; i++) {
        prod1 *= values[i], prod2 *= 1.0 - values[i];
      }
      return prod1 / (prod1 + prod2);
    }

    // Computes the generator matrix from the parity matrix.
    // Assumes the parity matrix can be mapped to a G = [ I|K ].
    LDPC.prototype.calcGenerator = function() {
      var rows = math.range(0, this.j);
      var dcols = math.range(0, this.k);
      var ecols = math.range(this.k, this.n);

      var dMatrix = this.parity.subset(math.index(rows, dcols));
      var eMatrix = this.parity.subset(math.index(rows, ecols));

      var fMatrix = math.multiply(math.inv(eMatrix), dMatrix)
        .map(function(elem) { return Math.abs(elem) % 2 });

      return math.concat(math.eye(this.k), math.transpose(fMatrix));
    }

    // Encodes the given symbols. It's G * symbols, where G is generator.
    LDPC.prototype.encode = function(symbols) {
      var product = math.multiply(symbols, this.generator);
      var coded = [].concat.apply([], product.toArray());
      return coded.map(function(v) { return Math.abs(v) % 2 })
    }

    LDPC.prototype.firstPass = function(symbols) {
      var error = this.error;

      return this.parity.map(function (value, index) {
        var check = index[0], digit = index[1];
        return symbols[digit] === 0 ? error : (1 - error);
      }, true);
    }

    LDPC.prototype.passMessageToParity = function(matrix, initial) {
      var buffer = this.parity.clone();
      var rows = math.range(0, this.j);

      matrix.forEach(function (value, index) {
        var check = index[0], digit = index[1];
        var column = matrix.subset(math.index(rows, digit));
        var product = [ initial.get(index) ];

        column.forEach(function (valuep, indexp) {
          var checkp = indexp[0], digitp = indexp[1];
          if (checkp !== check) product.push(valuep);
        }, true)

        buffer.set(index, normalizedProduct(product));
      }, true)

      return buffer;
    }

    LDPC.prototype.passMessageToVariable = function(matrix) {
      var buffer = this.parity.clone();
      var cols = math.range(0, this.n);

      matrix.forEach(function (value, index) {
        var check = index[0], digit = index[1];
        var row = matrix.subset(math.index(check, cols))
        var product = 1;

        row.forEach(function (valuep, indexp) {
          var checkp = indexp[0], digitp = indexp[1];
          if (digitp !== digit) product *= 1 - 2 * valuep;
        }, true)

        buffer.set(index, 0.5 - 0.5 * product);
      }, true)

      return buffer;
    }

    LDPC.prototype.finalPass = function(matrix, initial) {
      var finals = new Array(this.n);
      for (var i = 0; i < finals.length; i++) {
        finals[i] = new Array();
      }

      matrix.forEach(function (value, index) {
        var check = index[0], digit = index[1];
        if (finals[digit].length === 0) {
          finals[digit].push(initial.get(index));
        }
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

      for (var i = 0; i < 100; i ++) {
        current = this.passMessageToParity(current, initial);
        current = this.passMessageToVariable(current);
      }

      return this.finalPass(current, initial);
    }

    function randomPermutation(size) {
      var array = math.range(0, size).toArray();

      for (var currIdx = size - 1; currIdx > 0; currIdx--) {
        var randIdx = Math.floor(Math.random() * (currIdx + 1));
        var tempVal = array[currIdx];
        array[currIdx] = array[randIdx];
        array[randIdx] = tempVal;
      }

      return array
    }

    function applyPermutation(array, perm) {
      var buffer = new Array(array.length);
      for (var i = 0; i < array.length; i ++) {
        buffer[perm[i]] = array[i];
      }
      return buffer
    }

    LDPC.generateParity = function(n, k) {
      var matrix = [ ];
      var rows = n - k, cols = n;
      var chunk = Math.floor(n / k);

      for (var i = 0; i < chunk; i ++) {
        var padding = i * k, j = 0;
        var row = new Array(cols);
        for (j = 0; j < padding; j ++) {
          row[j] = 0
        }
        for (j = padding; j < padding + k; j ++) {
          row[j] = 1;
        }
        for (j = padding + k; j < cols; j ++) {
          row[j] = 0;
        }
        matrix.push(row)
      }

      for (var i = chunk; i < rows; i += 0) {
        var perm = randomPermutation(cols);
        for (var j = 0; j < chunk && i < rows; j ++, i++) {
          matrix.push(applyPermutation(matrix[j], perm));
        }
      }

      return matrix;
    }

    return LDPC;
  }));