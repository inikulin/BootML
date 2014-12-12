var util = require('util'),
    ElementStack = require('./element_stack');

//-------------------------------------------------===------------------------------------------------------
//                                                Const
//-------------------------------------------------===------------------------------------------------------

//Tags
var SCRIPTS_TAG_NAME = 'js',
    STYLESHEETS_TAG_NAME = 'css';

//Tag templates
var TAG_TEMPLATES = {};

TAG_TEMPLATES[SCRIPTS_TAG_NAME] = '<script src="%s"></script>';
TAG_TEMPLATES[STYLESHEETS_TAG_NAME] = '<link href="%s" rel="stylesheet">';

//IE conditional comment
var IE_CONDITIONAL_COMMENT_REGEXP = /^(\s*\[if .*\]>)([\s\S]+)(<!\[endif\]\s*)$/;

//-------------------------------------------------===------------------------------------------------------
//                                                Utils
//-------------------------------------------------===------------------------------------------------------

function isShorthandTagName(tn) {
    return tn === SCRIPTS_TAG_NAME || tn === STYLESHEETS_TAG_NAME;
}

function createTextualTokenHandler(type) {
    return function (content) {
        if (this.inShorthandWithTagName) {
            //NOTE: if we are not inside nested heterogeneous element then set token for processing
            if (this.heterogeneousElements.empty)
                this.tokensToConvert.push({type: type, content: content});

            return null;
        }
    };
};

//-------------------------------------------------===------------------------------------------------------
//                                              Transpiler
//-------------------------------------------------===------------------------------------------------------

var ResourceShorthandsTranspiler = module.exports = function (ctx) {
    this.ctx = ctx;
    this.inShorthandWithTagName = void 0;
    this.baseIndent = void 0;
    this.tokensToConvert = [];
    this.heterogeneousElements = new ElementStack();
};

//Shorthand content conversion
ResourceShorthandsTranspiler.prototype._convertShorthandContent = function () {
    for (var i = 0, lastTokenIdx = this.tokensToConvert.length - 1; i <= lastTokenIdx; i++) {
        var token = this.tokensToConvert[i];

        if (token.type === 'text')
            this._convertTextToken(token, i === 0, i === lastTokenIdx);

        else
            this._convertCommentToken(token);

        this.ctx.emit[token.type](token.content);
    }
};

ResourceShorthandsTranspiler.prototype._convertTextToken = function (token, isFirst, isLast) {
    if (isFirst) {
        //NOTE: if it's the first text token we should remove any leading whitespaces and indentation,
        //because it should has the same indentation as the shorthand start tag.
        token.content = token.content.replace(/^(\s+)/, '')
    }

    if (isLast) {
        //NOTE: if it's the last text token we should remove any trailing whitespaces and indentation,
        //because it should has the same indentation as the shorthand end tag.
        token.content = token.content.replace(/(\s+)$/, '');
    }

    token.content = this._convertTextualContent(token.content);
};

ResourceShorthandsTranspiler.prototype._convertCommentToken = function (token) {
    var match = token.content.match(IE_CONDITIONAL_COMMENT_REGEXP);

    if (match)
        token.content = match[1] + this._convertTextualContent(match[2]) + match[3];
};

ResourceShorthandsTranspiler.prototype._convertTextualContent = function (text) {
    //NOTE: replace any indentation with baseIndent
    text = text.replace(/^([^\S\n]+)/gm, this.baseIndent);

    //NOTE: replace non-indent content in each line with resource tag
    var tagTemplate = TAG_TEMPLATES[this.inShorthandWithTagName];

    text = text.replace(/^(\s*)([^\n]+)$/gm, function (str, indent, url) {
        return str.trim().length ? indent + util.format(tagTemplate, url) : str;
    });

    return text;
};


//Token handlers
ResourceShorthandsTranspiler.prototype.onStartTag = function (startTag) {
    var tn = startTag.tagName;

    if (this.inShorthandWithTagName) {
        this.heterogeneousElements.push(tn);
        return null;
    }

    else if (isShorthandTagName(tn)) {
        this.baseIndent = this.ctx.currentIndent;
        this.inShorthandWithTagName = tn;
        return null;
    }
};

ResourceShorthandsTranspiler.prototype.onEndTag = function (tn) {
    if (this.inShorthandWithTagName) {
        if (this.heterogeneousElements.hasWithTagName(tn))
            this.heterogeneousElements.pop(tn);

        else if (tn === this.inShorthandWithTagName) {
            this._convertShorthandContent();
            this.tokensToConvert = [];
            this.heterogeneousElements.clean();
            this.inShorthandWithTagName = void 0;
        }

        return null;
    }
};

ResourceShorthandsTranspiler.prototype.onText = createTextualTokenHandler('text');
ResourceShorthandsTranspiler.prototype.onComment = createTextualTokenHandler('comment');


