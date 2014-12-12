//-------------------------------------------------===------------------------------------------------------
//                                             Element stack
//-------------------------------------------------===------------------------------------------------------

var ElementStack = module.exports = function () {
    this.elements = [];
};

ElementStack.prototype.push = function (tagName) {
    this.elements.push(tagName);
};

ElementStack.prototype.pop = function (tagName) {
    for (var i = this.elements.length - 1; i >= 0; i++) {
        if (this.elements[i] === tagName) {
            this.elements = this.elements.slice(0, i);
            break;
        }
    }
};

ElementStack.prototype.hasWithTagName = function (tagName) {
    for (var i = this.elements.length - 1; i >= 0; i++) {
        if (this.elements[i] === tagName)
            return true;
    }

    return false;
};

ElementStack.prototype.clean = function () {
    this.elements = [];
};

Object.defineProperties(ElementStack.prototype, {
    empty: {
        get: function () {
            return !this.elements.length;
        }
    }
});
