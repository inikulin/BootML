var fs = require('fs'),
    path = require('path'),
    Mocha = require('mocha');

var mocha = new Mocha()
        .ui('tdd')
        .reporter('spec');

mocha.addFile(path.join(__dirname, './suite'));

mocha.run(function (failed) {
    process.on('exit', function () {
        process.exit(failed);
    });
});