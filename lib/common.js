//-------------------------------------------------===------------------------------------------------------
//                                                Const
//-------------------------------------------------===------------------------------------------------------
var INDENTATION_REGEXP = /[^\S\n]+$/;

//-------------------------------------------------===------------------------------------------------------
//                                          Indentation tracker
//-------------------------------------------------===------------------------------------------------------

var IndentTracker = exports.IndentTracker = function (ctx) {
    this.ctx = ctx;
    this.ctx.currentIndent = '';
};

IndentTracker.prototype.onText = function (text) {
    var indentationMatch = text.match(INDENTATION_REGEXP);

    if(indentationMatch)
        this.ctx.currentIndent = indentationMatch[0];
};
