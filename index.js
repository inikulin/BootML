var ineed = require('ineed'),
    GridTranspiler = require('./lib/grid_transpiler');

var reprocess = ineed
    .using(GridTranspiler)
    .reprocess
    .grid();

exports.compile = function (html) {
    return reprocess.fromHtml(html);
};
