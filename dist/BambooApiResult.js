"use strict";

/**
 * Generic Bamboo API result container
 */
Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BambooApiResult = (function () {

    /**
     * @param {String} content - Raw API result
     * @constructor
     */

    function BambooApiResult() {
        var content = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

        _classCallCheck(this, BambooApiResult);

        this.content = content;
        if (this.content) {
            _parseContent();
        }
    }

    /**
     * Expected to be overwritten
     */

    _createClass(BambooApiResult, [{
        key: "parseJson",
        value: function parseJson() {}

        /**
         * Try parses the content into a JSOn object
         *
         * @returns {boolean}
         * @private
         */
    }, {
        key: "_parseContent",
        value: function _parseContent() {
            try {
                this.json = JSON.parse(this.content);
                return true;
            } catch (err) {
                this.json = null;
                console.err(err);
                return false;
            }
        }

        /**
         * @returns {String}
         */
    }, {
        key: "rawContent",
        get: function get() {
            return this.content;
        },

        /**
         * @param {String} content
         */
        set: function set(content) {
            this.content = content;

            this._parseContent();
            this.parseJson();
        }
    }]);

    return BambooApiResult;
})();

exports["default"] = BambooApiResult;
module.exports = exports["default"];
//# sourceMappingURL=BambooApiResult.js.map