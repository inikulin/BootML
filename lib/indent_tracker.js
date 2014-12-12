//-------------------------------------------------===------------------------------------------------------
//                                                Const
//-------------------------------------------------===------------------------------------------------------

var INDENTATION_REGEXP = /[^\S\n]+$/;

//-------------------------------------------------===------------------------------------------------------
//                                          Indentation tracker
//-------------------------------------------------===------------------------------------------------------

var IndentTracker = module.exports = function (ctx) {
    this.ctx = ctx;
    this.ctx.currentIndent = '';
};

IndentTracker.prototype.onText = function (text) {
    var indentationMatch = text.match(INDENTATION_REGEXP);
    this.ctx.currentIndent = indentationMatch ? indentationMatch[0] : '';
};
