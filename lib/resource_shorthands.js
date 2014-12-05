//-------------------------------------------------===------------------------------------------------------
//                                                Const
//-------------------------------------------------===------------------------------------------------------

//Tags
var SCRIPTS_TAG_NAME = 'js',
    STYLESHEETS_TAG_NAME = 'css';

//IE conditional comment
var IE_CONDITIONAL_COMMENT_REGEXP = /^(\s*\[if .*\]>\s*)(.*)(\s*<!\[endif\]\s*)$/;

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
    this.pendingTokens = [];
};

//Open shorthands stack
ResourceShorthandsTranspiler.prototype._popOpenShorthandIfNecessary = function (endTagName) {
    if (isShorthandTagName(endTagName)) {
        for (var i = this.openShorthandsStack.length - 1; i >= 0; i++) {
            if (this.openShorthandsStack[i] === endTagName) {
                //NOTE: pop shorthand and all topmost shorthands
                this.openShorthandsStack = this.openShorthandsStack.slice(0, i);
                break;
            }
        }
    }
};

//Shorthand content conversion
ResourceShorthandsTranspiler.prototype._convertTextToken = function (shorthandTagName, tokenEntry) {
    //TODO
};

ResourceShorthandsTranspiler.prototype._convertCommentToken = function (shorthandTagName, tokenEntry) {
    //TODO
};

ResourceShorthandsTranspiler.prototype._reindentTextToken = function (tokenEntry) {
    //TODO
};

ResourceShorthandsTranspiler.prototype._convertShorthandContent = function (shorthandTagName) {
    var transpiler = this,
        bailouts = [];

    this.pendingTokens = [];

    this.shorthandContentTokens.forEach(function (tokenEntry) {
        var type = tokenEntry.type,
            isTopLevel = tokenEntry.depth === 1;

        if (type === 'text') {
            if (isTopLevel)
                transpiler._convertTextToken(shorthandTagName, tokenEntry);

            else
                bailouts.push(transpiler._reindentTextToken(tokenEntry));
        }

        else if (type === 'comment' && isTopLevel)
            transpiler._convertCommentToken(shorthandTagName, tokenEntry);

        else
            bailouts.push(tokenEntry);
    });

    //NOTE: flush pending tokens and then bailouts
    this.pendingTokens.concat(bailouts).forEach(function (tokenEntry) {
        this.ctx.emit[tokenEntry.type](tokenEntry.token);
    });
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

ResourceShorthandsTranspiler.prototype._onTextualToken = function (type, token) {
    var stackDepth = this.openShorthandsStack.length;

    //NOTE: hold token for now if we are inside shorthand content
    if (stackDepth) {
        this.shorthandContentTokens.push({type: type, token: token, depth: stackDepth});
        token = null;
    }

    return token;
};

ResourceShorthandsTranspiler.prototype.onText = function (text) {
    return this._onTextualToken('text', text);
};

ResourceShorthandsTranspiler.prototype.onComment = function (comment) {
    return this._onTextualToken('comment', comment);
};


