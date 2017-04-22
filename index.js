var os = require('os');
var sleep = require('sleep');
var readlineSync = require('readline-sync');
var LDPC = require('./ldpc');

function matrixToString(matrix) {
	if (!matrix) {
		return
	}
	var array = matrix
	if (matrix.toArray) {
		array = matrix.toArray()
	}
	var lines = [ ]
	array.forEach(function (line) {
		lines.push(line.join(' '));
	})
	return lines.join(os.EOL);
}

function arrayToString(array) {
	var formatted = new Array(array.length)
	for (var i = 0; i < array.length; i ++) {
		var value = array[i];
		if (value % 1 == 0) {
			formatted[i] = value.toString();
		}
		else {
			formatted[i] = value.toFixed(2);
		}
	}
	return '[' + formatted.join(', ') + ']'
}

function logToConsole(message, newLines) {
	var suffix = '', newLines = newLines || 0
	for (var i = 0; i < newLines; i ++) {
		suffix += os.EOL
	}
	console.log(message + suffix);
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function chooseBits(title, size, buffer) {
	if (!buffer) {
		buffer = new Array(size);
		for (var i = 0; i < size; i ++) {
			buffer[i] = 0;
		}
	}
	else {
		buffer = buffer.slice()
		size = buffer.length
	}

	var value = 0;

	logToConsole(title);
	logToConsole('[Z] <- -> [X]  SWAP: [SPACE] FIX: [E]', 1);
	
	while (true) {
	  var bits = new Array(size);
	  for (var idx = 0; idx < size; idx ++) {
	  	var bit = buffer[idx].toString();
	  	if (idx == value) {
	  		bit = '[' + bit + ']';
	  	}
	  	bits[idx] = bit;
	  }
	  var bitsString = bits.join(', ')

	  logToConsole('\x1B[1A\x1B[K[' + bitsString + ']')
	  
	  key = readlineSync.keyIn('', {hideEchoBack: true, mask: '', limit: 'zxe01 '});
	  if (key === 'z') {
	  	value = clamp(value - 1, 0, size - 1);
	  }
	  else if (key === 'x') {
	  	value = clamp(value + 1, 0, size - 1);
	  }
	  else if (key === ' ') {
	  	buffer[value] = +!Boolean(buffer[value])
	  }
	  else if (key === '0' || key === '1') {
	  	buffer[value] = parseInt(key)
	  }
	  else {
	  	break;
	  }
	}

	logToConsole('You chose: [' + buffer.join(', ') + ']', 1);

	return buffer;
}

var n = readlineSync.questionInt('Enter the output code size: ', {defaultInput: 20});
var k = readlineSync.questionInt('Enter the input code size: ', {defaultInput: 10});
var e = readlineSync.questionFloat('Enter the error probability: ', {defaultInput: 0.1})
var code = new LDPC({ n: n, k: k, error: e });

logToConsole('Generated parity matrix is:');
logToConsole(matrixToString(code.parity), 1);
logToConsole('Generator matrix, derived from parity matrix is:');
logToConsole(matrixToString(code.generator), 1);

var message = chooseBits('Choose the message to be sent', k);
var encoded = code.encode(message);
logToConsole('The coded message is: ');
logToConsole(arrayToString(encoded), 1);

var received = chooseBits('Choose the errored code', n, encoded);
// var probabilities = code.tryCorrect(received);
// logToConsole('Decoded probabilities are:');
// logToConsole(arrayToString(probabilities), 1);

logToConsole('Correcting the received message: ');
var initial = code.firstPass(received);
var current = code.passMessageToVariable(initial);
var probabilites = code.finalPass(current, initial);
logToConsole('\x1B[1A\x1B[K[' + arrayToString(probabilites));

for (var it = 0; it < 10; it ++) {
	current = code.passMessageToParity(current, initial);
  current = code.passMessageToVariable(current);
  probabilites = code.finalPass(current, initial);
  logToConsole('\x1B[1A\x1B[K[' + arrayToString(probabilites));
  sleep.msleep(250);
}

var corrected = probabilites.map(function(p) { return +(p > 0.5) })

logToConsole('\u001b[2J\u001b[0;0H')
logToConsole('FINAL STATS', 1)

logToConsole('Message entered by you: ')
logToConsole(arrayToString(message), 1)

logToConsole('Sent coded message: ')
logToConsole(arrayToString(encoded), 1)

logToConsole('Received coded message: ')
logToConsole(arrayToString(received), 1)

logToConsole('Corrected code: ')
logToConsole(arrayToString(corrected), 1)