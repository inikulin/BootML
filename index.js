var ineed = require('ineed');

var reprocess = ineed.reprocess;

exports.compile = function (html) {
    return reprocess.fromHtml(html);
};