var util = require('util');

//Containers
var CONTAINER_TAG_CLASSES_MAP = {
    'container': 'container',
    'container-fluid': 'container-fluid'
};

//Clearfix
var CLEARFIX_TAG = 'clearfix',
    CLEARFIX_CLASS = 'clearfix';

//Row
var ROW_TAG = 'r',
    ROW_CLASS = 'row';

//Columns
var COLUMN_TAG = 'c',
    DEFAULT_COLUMN_CLASS = 'col-md-1',
    NUMBERED_COLUMN_TAG_REGEXP = /^c([1-9]|1[0-2])$/,
    NUMBERED_COLUMN_CLASS_PATTERN = 'col-md-%s';

//Tag convertion utils
function getClassAttr(startTag) {
    var attrs = startTag.attrs;

    for (var i = 0; i < attrs.length; i++) {
        if (attrs[i].name === 'class')
            return attrs[i];
    }

    return null;
}

function convertToDiv(startTag, additionalClassNames) {
    var classAttr = getClassAttr(startTag);

    if (!classAttr) {
        classAttr = {
            name: 'class',
            value: ''
        };

        startTag.attrs.push(classAttr);
    }

    var classNames = classAttr.value.length ?
                     classAttr.value.trim().split(/s+/) :
                     [];

    classAttr.value = additionalClassNames.concat(classNames).join(' ');
    startTag.tagName = 'div';

    return startTag;
}

//Transpiler
module.exports = {
    name: 'grid',
    extends: 'reprocess',

    init: function (ctx) {
        this.ctx = ctx;
    },

    onStartTag: function (startTag) {
        var tn = startTag.tagName,
            containerClass = CONTAINER_TAG_CLASSES_MAP[tn];

        if (containerClass)
            return convertToDiv(startTag, [containerClass]);

        if(tn === ROW_TAG)
            return convertToDiv(startTag, [ROW_CLASS])
    },

    onEndTag: function (tn) {
        if (CONTAINER_TAG_CLASSES_MAP[tn] ||
            tn === CLEARFIX_TAG ||
            tn === ROW_TAG ||
            tn === COLUMN_TAG ||
            NUMBERED_COLUMN_TAG_REGEXP.test(tn)) {

            //NOTE: end tag is always transpiled to <div>
            return 'div';
        }
    }
};
