var fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    compiler = require('../index');

//Utils
function relative() {
    var parts = [__dirname].concat(Array.prototype.slice.call(arguments));

    return path.join.apply(path, parts);
}

function normalizeSpaces(str) {
    return str.replace(/\r\n/g, '\n');
}

//Diff message
function addSlashes(str) {
    return str
        .replace(/\t/g, '\\t')
        .replace(/\n/g, '\\n')
        .replace(/\f/g, '\\f')
        .replace(/\r/g, '\\r');
}

function createDiffMarker(markerPosition) {
    var marker = '';

    for (var i = 0; i < markerPosition - 1; i++)
        marker += ' ';

    return marker + '^\n';
}

function createDiffMsg(actual, expected) {
    for (var i = 0; i < expected.length; i++) {
        if (actual[i] !== expected[i]) {
            var diffMsg = '\nString differ at index ' + i + '\n';

            var expectedStr = 'Expected: ' + addSlashes(expected.substring(i - 100, i + 1)),
                expectedDiffMarker = createDiffMarker(expectedStr.length);

            diffMsg += expectedStr + addSlashes(expected.substring(i + 1, i + 20)) + '\n' + expectedDiffMarker;

            var actualStr = 'Actual:   ' + addSlashes(actual.substring(i - 100, i + 1)),
                actualDiffMarker = createDiffMarker(actualStr.length);

            diffMsg += actualStr + addSlashes(actual.substring(i + 1, i + 20)) + '\n' + actualDiffMarker;

            return diffMsg;
        }
    }

    return '';
}

//Test factory
fs.readdirSync(relative('./data')).forEach(function (suiteName) {
    suite(suiteName, function () {
        fs.readdirSync(relative('./data', suiteName)).forEach(function (testFile) {
            if (/.boot.html$/.test(testFile)) {
                var testName = path.basename(testFile, '.boot.html'),
                    src = fs.readFileSync(relative('./data', suiteName, testFile)).toString(),
                    expected = fs.readFileSync(relative('./data', suiteName, testName + '.html')).toString();

                test(testName, function () {
                    var actual = normalizeSpaces(compiler.compile(src));
                    expected = normalizeSpaces(expected);

                    //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
                    assert.ok(actual === expected, createDiffMsg(actual, expected));
                });
            }
        });
    });
});