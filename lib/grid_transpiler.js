//-------------------------------------------------===------------------------------------------------------
//                                                Const
//-------------------------------------------------===------------------------------------------------------

//Containers
var CONTAINER_TAG_CLASSES_MAP = {
    'container': 'container',
    'container-fluid': 'container-fluid'
};

//Clearfix
var CLEARFIX_TAG =
    CLEARFIX_CLASS = 'clearfix';

//Columns
var COL_TAG = 'c',
    SIZE_CLASS_REGEXP = /^col-(xs|sm|md|lg)-([1-9]|1[0-2])$/,
    NUMBERED_COL_TAG_REGEXP = /^c([1-9]|1[0-2])$/,
    NUMBERED_COL_CLASS_TEMPLATE = 'col-md-{size}',
    DEFAULT_COL_SIZE_CLASS = 'col-md-1',
    IMPLIED_COL_SIZE_CLASS = 'col-md-12';

//Row
var ROW_TAG = 'r',
    ROW_CLASS = 'row',
    IMPLIED_COL_START_TAG_TOKEN = {
        tagName: 'div',
        selfClosing: false,
        attrs: [
            {
                name: 'class',
                value: IMPLIED_COL_SIZE_CLASS
            }
        ]
    };

//-------------------------------------------------===------------------------------------------------------
//                                          Template rendering
//-------------------------------------------------===------------------------------------------------------

function renderTemplateWithRegExpMatch(template, reGroupNames, reMatch) {
    for (var i = 1; i < reMatch.length; i++)
        template = template.replace('{' + reGroupNames[i - 1] + '}', reMatch[i]);

    return template;
}

//-------------------------------------------------===------------------------------------------------------
//                                           Tag conversion
//-------------------------------------------------===------------------------------------------------------

function getClassAttr(startTag) {
    var attrs = startTag.attrs;

    for (var i = 0; i < attrs.length; i++) {
        if (attrs[i].name === 'class')
            return attrs[i];
    }

    return null;
}

function addClassNames(startTag, classNamesToAdd) {
    var classAttr = getClassAttr(startTag);

    if (!classAttr) {
        classAttr = {name: 'class', value: ''};
        startTag.attrs.push(classAttr);
    }

    var classNames = classAttr.value.length ? classAttr.value.trim().split(/s+/) : [];

    classAttr.value = classNames.concat(classNamesToAdd).join(' ');
}

function convertToDiv(startTag, classNamesToAdd) {
    startTag.tagName = 'div';
    addClassNames(startTag, classNamesToAdd);

    return startTag;
}

//-------------------------------------------------===------------------------------------------------------
//                                         Attribute conversion
//-------------------------------------------------===------------------------------------------------------

//Visibility attributes conversions
var VisibilityAttrConversions = [
    {
        name: 'Visible attribute (visible-block, visible-inline, visible-inline-block)',

        classNameTemplate: 'visible-md-{cssDisplay}',
        attr: {
            re: /^visible-(block|inline|inline-block)$/,
            reGroupNames: ['cssDisplay']
        }
    },

    {
        name: 'Compound visible attribute (visible:)',

        classNameTemplate: 'visible-{screenSize}-{cssDisplay}',
        attr: {
            re: /^visible-(block|inline|inline-block):(\S+)$/,
            reGroupNames: ['cssDisplay', 'compoundParts']
        },
        compoundParts: {
            re: /^(xs|sm|md|lg)$/,
            reGroupNames: ['screenSize']
        }
    },

    {
        name: 'Hidden attribute (hidden)',

        classNameTemplate: 'hidden-md',
        attr: {
            re: /^hidden$/,
            reGroupNames: []
        }
    },

    {
        name: 'Compound hidden attribute (hidden:)',

        classNameTemplate: 'hidden-{screenSize}',
        attr: {
            re: /^hidden:(\S+)$/,
            reGroupNames: ['compoundParts']
        },
        compoundParts: {
            re: /^(xs|sm|md|lg)$/,
            reGroupNames: ['screenSize']
        }
    }
];

//Column attributes conversions
var ColumnAttrConversions = VisibilityAttrConversions.concat([
    {
        name: 'Size attribute (xsN, smN, mdN, lgN)',

        classNameTemplate: 'col-{screenSize}-{size}',
        attr: {
            re: /^(xs|sm|md|lg)([1-9]|1[0-2])$/,
            reGroupNames: ['screenSize', 'size']
        }
    },

    {
        name: 'Compound size attribute (size:)',

        classNameTemplate: 'col-{screenSize}-{size}',
        attr: {
            re: /^size:(\S+)$/,
            reGroupNames: ['compoundParts']
        },
        compoundParts: {
            re: /^(xs|sm|md|lg)([1-9]|1[0-2])$/,
            reGroupNames: ['screenSize', 'size']
        }
    },

    {
        name: 'Numbered property attribute (offsetN, pullN, pushN)',

        classNameTemplate: 'col-md-{name}-{size}',
        attr: {
            re: /^(offset|push|pull)([0-9]|1[0-2])$/,
            reGroupNames: ['name', 'size']
        }
    },

    {
        name: 'Compound property attribute (offset:, pull:, push:)',

        classNameTemplate: 'col-{screenSize}-{name}-{size}',
        attr: {
            re: /^(offset|push|pull):(\S+)$/,
            reGroupNames: ['name', 'compoundParts']
        },
        compoundParts: {
            re: /^(xs|sm|md|lg)([0-9]|1[0-2])$/,
            reGroupNames: ['screenSize', 'size']
        }
    }
]);

//Convert attributes to CSS class names
function applyAttrConversion(attrMatch, conv) {
    var classNames = void 0;

    if (conv.compoundParts) {
        var partsGroupIdx = conv.attr.reGroupNames.indexOf('compoundParts'),
            parts = attrMatch[partsGroupIdx + 1];

        classNames = parts
            .trim()
            .split('-')
            .filter(function (part) {
                return conv.compoundParts.re.test(part);
            })
            .map(function (part) {
                return renderTemplateWithRegExpMatch(
                    conv.classNameTemplate,
                    conv.compoundParts.reGroupNames,
                    part.match(conv.compoundParts.re)
                );
            })
    }
    else
        classNames = [conv.classNameTemplate];

    return classNames.map(function (className) {
        return renderTemplateWithRegExpMatch(className, conv.attr.reGroupNames, attrMatch);
    });
}

function convertAttrsToClassNames(attrs, conversions) {
    var classNames = [];

    for (var i = attrs.length - 1; i >= 0; i--) {
        for (var j = 0; j < conversions.length; j++) {
            var attrName = attrs[i].name,
                attrMatch = attrName.match(conversions[j].attr.re);

            if (attrMatch) {
                var converted = applyAttrConversion(attrMatch, conversions[j]);

                //NOTE: since we traverse in reverse order we concatenate
                //existing class names to the newly converted
                classNames = converted.concat(classNames);
                attrs.splice(i, 1);

                break;
            }
        }
    }

    return classNames;
}

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
        return null;

    var match = tn.match(NUMBERED_COL_TAG_REGEXP);
    return renderTemplateWithRegExpMatch(NUMBERED_COL_CLASS_TEMPLATE, ['size'], match);
};

GridTranspiler.prototype._convertColAttrsToClassNames = function (attrs, sizeClassName) {
    var attrClassNames = convertAttrsToClassNames(attrs, ColumnAttrConversions);

    if (!sizeClassName) {
        var hasSizeAttrs = false;

        for (var i = 0; i < attrClassNames.length; i++) {
            if (SIZE_CLASS_REGEXP.test(attrClassNames[i])) {
                hasSizeAttrs = true;
                break;
            }
        }

        //NOTE: if it's not a numbered column and we don't have size class name
        //then fallback to the default column size
        if (!hasSizeAttrs)
            sizeClassName = DEFAULT_COL_SIZE_CLASS;
    }

    if (sizeClassName)
        attrClassNames.splice(0, 0, sizeClassName);

    return attrClassNames;
};

GridTranspiler.prototype._processColStartTag = function (startTag) {
    this.expectingColStartTag = false;

    //NOTE: if we have pending row tokens, insert them before column
    if (this._flushPendingRowTokens()) {
        this.ctx.emit.startTag(startTag);
        return null;
    }

    var sizeClassName = this._convertColTagToSizeClassName(startTag.tagName),
        classNames = this._convertColAttrsToClassNames(startTag.attrs, sizeClassName);

    return convertToDiv(startTag, classNames);
};

//Token handlers
GridTranspiler.prototype.onStartTag = function (startTag) {
    var tn = startTag.tagName;

    if (this._isColTagName(tn))
        startTag = this._processColStartTag(startTag);

    else {
        if (this._ensureImpliedColStartTag()) {
            //NOTE: if we have additional tokens emitted we need to move current token after them
            this.ctx.emit.startTag(startTag);
            return null;
        }

        var containerClass = CONTAINER_TAG_CLASSES_MAP[tn];

        if (containerClass)
            startTag = convertToDiv(startTag, containerClass);

        else if (tn === CLEARFIX_TAG)
            startTag = this._processClearfix(startTag);

        else if (tn === ROW_TAG)
            startTag = this._processRowStartTag(startTag);

        var visibilityClassNames = convertAttrsToClassNames(startTag.attrs, VisibilityAttrConversions);

        if (visibilityClassNames.length)
            addClassNames(startTag, visibilityClassNames);
    }

    return startTag;
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
