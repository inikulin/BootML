var ineed = require('ineed'),
    GridTranspiler = require('./lib/grid'),
    ResourceShorthandsTranspiler = require('./lib/resource_shorthands'),
    Common = require('./lib/common');

//-------------------------------------------------===------------------------------------------------------
//                                                Transpilers
//-------------------------------------------------===------------------------------------------------------

var TRANSPILERS = {
    'indentTracker': Common.IndentTracker,
    'resourceShorthands': ResourceShorthandsTranspiler,
    'grid': GridTranspiler
};

//-------------------------------------------------===------------------------------------------------------
//                                         Compiler initialization
//-------------------------------------------------===------------------------------------------------------

//Register transpilers as ineed plugins
Object.keys(TRANSPILERS).forEach(function (name) {
    ineed = ineed.using({
        name: name,
        extends: 'reprocess',

        init: function (ctx) {
            var plugin = this,
                transpiler = new TRANSPILERS[name](ctx);

            ['onStartTag', 'onEndTag', 'onText', 'onComment'].forEach(function (handler) {
                if (transpiler[handler]) {
                    plugin[handler] = function (token) {
                        return transpiler[handler](token);
                    };
                }
            });
        }
    });
});

//Enable reprocessors
var reprocess = ineed.reprocess;

Object.keys(TRANSPILERS).forEach(function (name) {
    reprocess = reprocess[name]();
});

//-------------------------------------------------===------------------------------------------------------
//                                        Compiler entry point
//-------------------------------------------------===------------------------------------------------------

exports.compile = function (html) {
    return reprocess.fromHtml(html);
};
