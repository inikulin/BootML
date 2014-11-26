var util = require('util');

//-------------------------------------------------===------------------------------------------------------
//                                                Const
//-------------------------------------------------===------------------------------------------------------

//Containers
var CONTAINER_TAG_CLASSES_MAP = {
    'container': 'container',
    'container-fluid': 'container-fluid'
};

//Clearfix
var CLEARFIX_TAG = 'clearfix',
    CLEARFIX_CLASS = 'clearfix';

//Columns
var COL_TAG = 'c',
    DEFAULT_COL_CLASS = 'col-md-1',
    NUMBERED_COL_TAG_REGEXP = /^c([1-9]|1[0-2])$/,
    NUMBERED_COL_CLASS_PATTERN = 'col-md-%s',
    IMPLIED_COL_CLASS = 'col-md-12';

//Row
var ROW_TAG = 'r',
    ROW_CLASS = 'row',
    IMPLIED_COL_START_TAG_TOKEN = {
        tagName: 'div',
        selfClosing: false,
        attrs: [
            {
                name: 'class',
                value: IMPLIED_COL_CLASS
            }
        ]
    };


//-------------------------------------------------===------------------------------------------------------
//                                        Tag conversion utils
//-------------------------------------------------===------------------------------------------------------

function getClassAttr(startTag) {
    var attrs = startTag.attrs;

    for (var i = 0; i < attrs.length; i++) {
        if (attrs[i].name === 'class')
            return attrs[i];
    }

    return null;
}

function convertToDiv(startTag, classNamesToAdd) {
    var classAttr = getClassAttr(startTag);

    if (typeof classNamesToAdd === 'string')
        classNamesToAdd = [classNamesToAdd];

    if (!classAttr) {
        classAttr = {name: 'class', value: ''};
        startTag.attrs.push(classAttr);
    }

    var classNames = classAttr.value.length ? classAttr.value.trim().split(/s+/) : [];

    classAttr.value = classNamesToAdd.concat(classNames).join(' ');
    startTag.tagName = 'div';

    return startTag;
}

//-------------------------------------------------===------------------------------------------------------
//                                              Transpiler
//-------------------------------------------------===------------------------------------------------------

var GridTranspiler = function (ctx) {
    this.ctx = ctx;
    this.expectingColStartTag = false;
    this.rowImpliedColFlagsStack = [];
};

//Clearfix processing
GridTranspiler.prototype._processClearfix = function (startTag) {
    //NOTE: if <clearfix> is self-closing then emit implied end tag
    if (startTag.selfClosing) {
        startTag.selfClosing = false;
        this.ctx.emit.endTag('div');
    }

    return convertToDiv(startTag, CLEARFIX_CLASS)
};

//Row processing
GridTranspiler.prototype._processRowStartTag = function (startTag) {
    this.expectingColStartTag = true;
    this.rowImpliedColFlagsStack.push(false);

    return convertToDiv(startTag, ROW_CLASS);
};

GridTranspiler.prototype._processRowEndTag = function () {
    var impliedColFlag = this.rowImpliedColFlagsStack.pop();

    if (impliedColFlag) {
        //NOTE: both column and row end tags transpiles to <div>
        //so we can just emit additional <div> here.
        this.ctx.emit.endTag('div');
    }

    return 'div';
};

GridTranspiler.prototype._ensureImpliedColStartTag = function () {
    if (this.expectingColStartTag) {
        this.ctx.emit.startTag(IMPLIED_COL_START_TAG_TOKEN);
        this.expectingColStartTag = false;

        //NOTE: mark topmost <row> on the stack with implied column flag
        var stackTop = this.rowImpliedColFlagsStack.length - 1;
        this.rowImpliedColFlagsStack[stackTop] = true;

        return true;
    }

    return false;
};

//Token handlers
GridTranspiler.prototype.onStartTag = function (startTag) {
    var tn = startTag.tagName,
        numberedColMatch = tn.match(NUMBERED_COL_TAG_REGEXP);

    if (tn === COL_TAG || numberedColMatch) {
        this.expectingColStartTag = false;
        //TODO
    }

    if (this._ensureImpliedColStartTag()) {
        //NOTE: if implied column start tag was generated we need to re-enqueue current token,
        //so it will appear after generated tag
        this.ctx.emit.startTag(startTag);
        return null;
    }

    var containerClass = CONTAINER_TAG_CLASSES_MAP[tn];

    if (containerClass)
        return convertToDiv(startTag, containerClass);

    if (tn === CLEARFIX_TAG)
        return this._processClearfix(startTag);

    if (tn === ROW_TAG)
        return this._processRowStartTag(startTag);
};

GridTranspiler.prototype.onEndTag = function (tn) {
    if (this._ensureImpliedColStartTag()) {
        //NOTE: if implied column start tag was generated we need to re-enqueue current token,
        //so it will appear after generated tag
        this.ctx.emit.endTag(tn);
        return null;
    }

    if (tn === ROW_TAG)
        return this._processRowEndTag();

    if (CONTAINER_TAG_CLASSES_MAP[tn] ||
        tn === CLEARFIX_TAG ||
        tn === COL_TAG ||
        NUMBERED_COL_TAG_REGEXP.test(tn)) {

        //NOTE: end tag is always transpiled to <div>
        return 'div';
    }
};

GridTranspiler.prototype.onText = function (text) {
    //TODO rebase empty text
    //NOTE: allow new lines and spaces after <row> tag
    if (text.trim() && this._ensureImpliedColStartTag()) {
        //NOTE: if implied column start tag was generated we need to re-enqueue current token,
        //so it will appear after generated tag
        this.ctx.emit.text(text);
        return null;
    }
};

//-------------------------------------------------===------------------------------------------------------
//                                             ineed plugin
//-------------------------------------------------===------------------------------------------------------

module.exports = {
    name: 'grid',
    extends: 'reprocess',

    init: function (ctx) {
        var plugin = this,
            transpiler = new GridTranspiler(ctx);

        ['onStartTag', 'onEndTag', 'onText'].forEach(function (handler) {
            plugin[handler] = function (token) {
                return transpiler[handler](token);
            };
        });
    }
};
