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
    COL_SIZE_MODIFIER_CLASS_PATTERN = 'col-%s-%s',
    IMPLIED_COL_CLASS = 'col-md-12';

//Size modifiers
var SIZE_MODIFIER_REGEXP = /^(xs|sm|md|lg)([1-9]|1[0-2])$/;

//Column attributes
var COMPOUND_SIZE_ATTR = 'size';

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
//                                     Column attributes converters
//-------------------------------------------------===------------------------------------------------------

var ColumnAttrConverters = [
    //Size attributes
    {
        condition: function (attr) {
            return SIZE_MODIFIER_REGEXP.test(attr.name);
        },

        toClassNames: function (attr) {
            var match = attr.name.match(SIZE_MODIFIER_REGEXP);
            return util.format(COL_SIZE_MODIFIER_CLASS_PATTERN, match[1], match[2]);
        }
    }
];

//-------------------------------------------------===------------------------------------------------------
//                                              Transpiler
//-------------------------------------------------===------------------------------------------------------

var GridTranspiler = function (ctx) {
    this.ctx = ctx;
    this.pendingRowTokens = [];
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
        //NOTE: mark topmost <r> on the stack with implied column flag
        var stackTop = this.rowImpliedColFlagsStack.length - 1;
        this.rowImpliedColFlagsStack[stackTop] = true;
        this.expectingColStartTag = false;

        //NOTE: emit implied column and insert pending row tokens after it
        this.ctx.emit.startTag(IMPLIED_COL_START_TAG_TOKEN);
        this._flushPendingRowTokens();

        return true;
    }

    return false;
};

GridTranspiler.prototype._flushPendingRowTokens = function () {
    if (this.pendingRowTokens.length) {
        for (var i = 0; i < this.pendingRowTokens.length; i++) {
            var tokenEntry = this.pendingRowTokens[i];
            this.ctx.emit[tokenEntry.type](tokenEntry.token);
        }

        this.pendingRowTokens = [];
        return true;
    }

    return false;
};

//Columns
GridTranspiler.prototype._isColTagName = function (tn) {
    return tn === COL_TAG || NUMBERED_COL_TAG_REGEXP.test(tn);
};

GridTranspiler.prototype._convertColTagToSizeClassName = function (tn) {
    if (tn === COL_TAG)
        return DEFAULT_COL_CLASS;

    var size = tn.match(NUMBERED_COL_TAG_REGEXP)[1];
    return util.format(NUMBERED_COL_CLASS_PATTERN, size);
};

GridTranspiler.prototype._convertColAttrsToClassNames = function (attrs) {
    var classNames = [];

    for (var i = attrs.length - 1; i >= 0; i--) {
        for (var j = 0; j < ColumnAttrConverters.length; j++) {
            if (ColumnAttrConverters[j].condition(attrs[i])) {
                var attrClassNames = ColumnAttrConverters[j].toClassNames(attrs[i]);

                classNames = classNames.concat(attrClassNames);
                attrs.splice(i, 1);

                break;
            }
        }
    }

    return classNames;
};

GridTranspiler.prototype._processColStartTag = function (startTag) {
    this.expectingColStartTag = false;

    //NOTE: if we have pending row tokens, insert them before column
    if (this._flushPendingRowTokens()) {
        this.ctx.emit.startTag(startTag);
        return null;
    }

    var classNames = [
        //TODO emit default size class only if we don't have size attributes
        this._convertColTagToSizeClassName(startTag.tagName)
    ].concat(
        this._convertColAttrsToClassNames(startTag.attrs)
    );

    return convertToDiv(startTag, classNames);
};

//Token handlers
GridTranspiler.prototype.onStartTag = function (startTag) {
    var tn = startTag.tagName,
        isCol = this._isColTagName(tn);

    if (isCol)
        return this._processColStartTag(startTag);

    if (this._ensureImpliedColStartTag()) {
        //NOTE: if we have additional tokens emitted we need to move current token after them
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
        //NOTE: if we have additional tokens emitted we need to move current token after them
        this.ctx.emit.endTag(tn);
        return null;
    }

    if (tn === ROW_TAG)
        return this._processRowEndTag();

    if (CONTAINER_TAG_CLASSES_MAP[tn] || tn === CLEARFIX_TAG ||
        tn === COL_TAG || NUMBERED_COL_TAG_REGEXP.test(tn)) {
        //NOTE: end tag is always transpiled to <div>
        return 'div';
    }
};

GridTranspiler.prototype.onText = function (text) {
    //NOTE: new lines and spaces do not trigger implied column generation.
    //Therefore we don't know how it will be adopted, let's store it for now.
    if (this.expectingColStartTag && !text.trim()) {
        this.pendingRowTokens.push({type: 'text', token: text});
        return null;
    }

    if (this._ensureImpliedColStartTag()) {
        //NOTE: if we have additional tokens emitted we need to move current token after them
        this.ctx.emit.text(text);
        return null;
    }
};

GridTranspiler.prototype.onComment = function (comment) {
    //NOTE: like with whitespace text in row we need to decide
    //later who will adopt comment. So we just store it for now.
    if (this.expectingColStartTag) {
        this.pendingRowTokens.push({type: 'comment', token: comment});
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

        ['onStartTag', 'onEndTag', 'onText', 'onComment'].forEach(function (handler) {
            plugin[handler] = function (token) {
                return transpiler[handler](token);
            };
        });
    }
};
