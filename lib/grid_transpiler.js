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
    NUMBERED_COL_TAG_REGEXP = /^c([1-9]|1[0-2])$/,
    NUMBERED_COL_CLASS_TEMPLATE = 'col-md-%s',
    COL_SIZE_CLASS_TEMPLATE = 'col-%s-%s',
    DEFAULT_COL_SIZE_CLASS = 'col-md-1',
    IMPLIED_COL_SIZE_CLASS = 'col-md-12',
    NUMBERED_PROPERTY_CLASS_TEMPLATE = 'col-md-%s-%s',
    PROPERTY_CLASS_TEMPLATE = 'col-%s-%s-%s';

//Column attributes
var SIZE_MODIFIER_REGEXP = /^(xs|sm|md|lg)([1-9]|1[0-2])$/,
    PROPERTY_MODIFIER_REGEXP = /^(xs|sm|md|lg)([0-9]|1[0-2])$/,
    NUMBERED_PROPERTY_ATTR_REGEXP = /^(offset|push|pull)([0-9]|1[0-2])$/,
    COMPOUND_ATTR_MODIFIER_SEPARATOR = '-',
    COMPOUND_SIZE_ATTR_PREFIX_REGEXP = /^(size):(\S+)$/,
    COMPOUND_PROPERTY_ATTR_PREFIX_REGEXP = /^(offset|push|pull):(\S+)$/;

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
//                                     Column attributes conversion
//-------------------------------------------------===------------------------------------------------------

//Method builders
function buildCompoundAttrConverterMethods(converter) {
    converter.condition = function (attrName) {
        return converter.prefixRegExp.test(attrName);
    };

    converter.toClassNames = function (attrName) {
        var prefixMatch = attrName.match(converter.prefixRegExp),
            propertyName = prefixMatch[1];

        return prefixMatch[2]
            .trim()
            .split(COMPOUND_ATTR_MODIFIER_SEPARATOR)
            .filter(function (item) {
                return converter.modifierRegExp.test(item);
            })
            .map(function (modifier) {
                var match = modifier.match(converter.modifierRegExp),
                    modifier = match[1],
                    size = match[2],
                    className = util.format(converter.classNameTemplate, modifier);

                if (!converter.isSizeAttr)
                    className = util.format(className, propertyName);

                return util.format(className, size);
            });
    };
}

function buildAttrConverterMethods(converter) {
    converter.condition = function (attrName) {
        return converter.attrRegExp.test(attrName);
    };

    converter.toClassNames = function (attrName) {
        var match = attrName.match(converter.attrRegExp),
            className = converter.classNameTemplate;

        for (var i = 1; i < match.length; i++)
            className = util.format(className, match[i]);

        return [className];
    };
}

//Converters
var ColumnAttrConverters = [
    {
        name: 'Size attribute',
        isSizeAttr: true,
        isCompound: false,
        attrRegExp: SIZE_MODIFIER_REGEXP,
        classNameTemplate: COL_SIZE_CLASS_TEMPLATE
    },

    {
        name: 'Compound size attribute',
        isSizeAttr: true,
        isCompound: true,
        prefixRegExp: COMPOUND_SIZE_ATTR_PREFIX_REGEXP,
        modifierRegExp: SIZE_MODIFIER_REGEXP,
        classNameTemplate: COL_SIZE_CLASS_TEMPLATE
    },

    {
        name: 'Numbered property attribute (offsetN, pullN, pushN)',
        isSizeAttr: false,
        isCompound: false,
        attrRegExp: NUMBERED_PROPERTY_ATTR_REGEXP,
        classNameTemplate: NUMBERED_PROPERTY_CLASS_TEMPLATE
    },

    {
        name: 'Compound property attribute (offset:, pull:, push:)',
        isSizeAttr: false,
        isCompound: true,
        prefixRegExp: COMPOUND_PROPERTY_ATTR_PREFIX_REGEXP,
        modifierRegExp: PROPERTY_MODIFIER_REGEXP,
        classNameTemplate: PROPERTY_CLASS_TEMPLATE
    }
];

//Build converter methods
ColumnAttrConverters = ColumnAttrConverters.map(function (converter) {
    var methodBuilder = converter.isCompound ?
                        buildCompoundAttrConverterMethods :
                        buildAttrConverterMethods;

    methodBuilder(converter);
    return converter;
});

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

    var size = tn.match(NUMBERED_COL_TAG_REGEXP)[1];
    return util.format(NUMBERED_COL_CLASS_TEMPLATE, size);
};

GridTranspiler.prototype._ensureColHasSize = function (hasSizeAttrs, sizeClassName, attrClassNames) {
    //NOTE: if it's not a numbered column and we don't have size class name
    //then fallback to the default column size
    if (!sizeClassName && !hasSizeAttrs)
        sizeClassName = DEFAULT_COL_SIZE_CLASS;

    if (sizeClassName)
        attrClassNames.splice(0, 0, sizeClassName);

    return attrClassNames;
};

GridTranspiler.prototype._convertColAttrsToClassNames = function (attrs, sizeClassName) {
    var attrClassNames = [],
        hasSizeAttrs = false;

    for (var i = attrs.length - 1; i >= 0; i--) {
        for (var j = 0; j < ColumnAttrConverters.length; j++) {
            var attrName = attrs[i].name;

            if (ColumnAttrConverters[j].condition(attrName)) {
                var converted = ColumnAttrConverters[j].toClassNames(attrName);

                hasSizeAttrs |= ColumnAttrConverters[j].isSizeAttr;

                //NOTE: since we traverse in reverse order we concat
                //existing class names to newly converted
                attrClassNames = converted.concat(attrClassNames);
                attrs.splice(i, 1);

                break;
            }
        }
    }

    return this._ensureColHasSize(hasSizeAttrs, sizeClassName, attrClassNames);
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
