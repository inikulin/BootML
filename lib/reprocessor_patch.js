//-------------------------------------------------===------------------------------------------------------
//                          Disable HTML entities processing for ineed reprocessor
//-------------------------------------------------===------------------------------------------------------

//NOTE: we need to be as close to the original source as possible. So we monkey patch ineed to disable
//HTML entities processing in parser and serializer
exports.apply = function (reprocessor) {
    var parser = reprocessor.parser,
        originalReset = parser._reset;

    parser._reset = function () {
        originalReset.apply(this, arguments);

        this.tokenizerProxy.tokenizer._consumeCharacterReference = function () {
            this._unconsume();
            return null;
        };
    };

    //NOTE: serializer is always the last plugin in the chain
    var serializer = reprocessor.plugins[reprocessor.plugins.length - 1];

    serializer.onText = function (text) {
        this.html += text;
    };

    return reprocessor;
};
