var LDPC = require('./ldpc');

function printMatrix(mat) {
	var str = ""
	for (var i = 0; i < mat.length; i ++) {
		str += mat[i].join(' ') + "\n";
	}
	console.log(str);
}

var coder = new LDPC({ n: 10, k: 2 });
printMatrix(coder.parity.toArray());