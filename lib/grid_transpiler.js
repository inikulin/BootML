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
    if (reGroupNames.length > 0) {
        for (var i = 1; i < reMatch.length; i++)
            template = template.replace('{' + reGroupNames[i - 1] + '}', reMatch[i]);

    }

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
//                                        Attributes conversion
//-------------------------------------------------===------------------------------------------------------

//Converters
var ColumnAttrConverters = [
    {
        name: 'Size attribute',
        isCompound: false,
        classNameTemplate: 'col-{screenSize}-{size}',
        attr: {
            re: /^(xs|sm|md|lg)([1-9]|1[0-2])$/,
            reGroupNames: ['screenSize', 'size']
        }
    },

    {
        name: 'Compound size attribute',
        isCompound: true,
        classNameTemplate: 'col-{screenSize}-{size}',
        attr: {
            re: /^(size):(\S+)$/,
            reGroupNames: []
        },
        modifier: {
            re: /^(xs|sm|md|lg)([1-9]|1[0-2])$/,
            reGroupNames: ['screenSize', 'size']
        }
    },

    {
        name: 'Numbered property attribute (offsetN, pullN, pushN)',
        isCompound: false,
        classNameTemplate: 'col-md-{name}-{size}',
        attr: {
            re: /^(offset|push|pull)([0-9]|1[0-2])$/,
            reGroupNames: ['name', 'size']
        }
    },

    {
        name: 'Compound property attribute (offset:, pull:, push:)',
        isCompound: true,
        classNameTemplate: 'col-{screenSize}-{name}-{size}',
        attr: {
            re: /^(offset|push|pull):(\S+)$/,
            reGroupNames: ['name']
        },
        modifier: {
            re: /^(xs|sm|md|lg)([0-9]|1[0-2])$/,
            reGroupNames: ['screenSize', 'size']
        }
    }
];

//Converter methods builder
function buildAttrConverterMethods(converter) {
    converter.condition = function (attrName) {
        return converter.attr.re.test(attrName);
    };

    converter.toClassNames = function (attrName) {
        var attrMatch = attrName.match(converter.attr.re),
            classNames = void 0;

        if (converter.isCompound) {
            var modifiers = attrMatch[2];

            classNames = modifiers
                .trim()
                .split('-')
                .filter(function (item) {
                    return converter.modifier.re.test(item);
                })
                .map(function (modifier) {
                    var match = modifier.match(converter.modifier.re);

                    return renderTemplateWithRegExpMatch(
                        converter.classNameTemplate,
                        converter.modifier.reGroupNames,
                        match
                    );
                })
        }
        else
            classNames = [converter.classNameTemplate];

        return classNames.map(function (className) {
            return renderTemplateWithRegExpMatch(className, converter.attr.reGroupNames, attrMatch);
        });
    };
}

//Build converter methods
ColumnAttrConverters.forEach(buildAttrConverterMethods);

//Convert attributes to CSS class names
function convertAttrsToClassNames(attrs, converters) {
    var attrClassNames = [];

    for (var i = attrs.length - 1; i >= 0; i--) {
        for (var j = 0; j < converters.length; j++) {
            var attrName = attrs[i].name;

            if (converters[j].condition(attrName)) {
                var converted = converters[j].toClassNames(attrName);

                //NOTE: since we traverse in reverse order we concatenate
                //existing class names to the newly converted
                attrClassNames = converted.concat(attrClassNames);
                attrs.splice(i, 1);

                break;
            }
        }
    }

    return attrClassNames;
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
    var attrClassNames = convertAttrsToClassNames(attrs, ColumnAttrConverters);

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
