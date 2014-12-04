//-------------------------------------------------===------------------------------------------------------
//                                                Const
//-------------------------------------------------===------------------------------------------------------

var SCRIPTS_TAG_NAME = 'js',
    STYLESHEETS_TAG_NAME = 'css';

//-------------------------------------------------===------------------------------------------------------
//                                                Utils
//-------------------------------------------------===------------------------------------------------------
function isShorthandTagName(tn) {
    return tn === SCRIPTS_TAG_NAME || tn === STYLESHEETS_TAG_NAME;
}

//-------------------------------------------------===------------------------------------------------------
//                                              Transpiler
//-------------------------------------------------===------------------------------------------------------

var ResourceShorthandsTranspiler = module.exports = function (ctx) {
    this.ctx = ctx;
    this.openShorthandsStack = [];
    this.shorthandContentTokens = [];
};

//Open shorthands stack
ResourceShorthandsTranspiler.prototype._popOpenShorthandIfNecessary = function (tn) {
    if (isShorthandTagName(tn)) {
        for (var i = this.openShorthandsStack.length - 1; i >= 0; i++) {
            if (this.openShorthandsStack[i] === tn) {
                //NOTE: pop shorthand and all topmost shorthands
                this.openShorthandsStack = this.openShorthandsStack.slice(0, i);
                break;
            }
        }
    }
};

//Shorthand content conversion
ResourceShorthandsTranspiler.prototype._convertShorthandContent = function (tn) {

};

//Token handlers
ResourceShorthandsTranspiler.prototype.onStartTag = function (startTag) {
    var tn = startTag.tagName,
        isShorthandTag = isShorthandTagName(tn);

    //NOTE: hold token for now if we are inside shorthand content
    if (this.openShorthandsStack.length) {
        this.shorthandContentTokens.push({type: 'startTag', token: startTag});
        startTag = null;
    }

    //NOTE: we should remove bottommost shorthand tag from the output
    else if (isShorthandTag)
        startTag = null;


    if (isShorthandTag)
        this.openShorthandsStack.push(tn);

    return startTag;
};

ResourceShorthandsTranspiler.prototype.onEndTag = function (tn) {
    //NOTE: hold token for now if we are inside shorthand content
    if (this.openShorthandsStack.length) {
        this._popOpenShorthandIfNecessary(tn);

        if (!this.openShorthandsStack.length)
            this._convertShorthandContent(tn);

        else
            this.shorthandContentTokens.push({type: 'endTag', token: tn});

        tn = null;
    }

    return tn;
};

ResourceShorthandsTranspiler.prototype.onText = function (text) {
    //NOTE: hold token for now if we are inside shorthand content
    if (this.openShorthandsStack.length) {
        this.shorthandContentTokens.push({type: 'text', token: text});
        text = null;
    }

    return text;
};

ResourceShorthandsTranspiler.prototype.onComment = function (comment) {
    //NOTE: hold token for now if we are inside shorthand content
    if (this.openShorthandsStack.length) {
        this.shorthandContentTokens.push({type: 'comment', token: comment});
        comment = null;
    }

    return comment;
};


