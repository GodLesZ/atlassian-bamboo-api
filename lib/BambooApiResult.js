"use strict";

/**
 * Generic Bamboo API result container
 */
export default class BambooApiResult {

    /**
     * @param {String} content - Raw API result
     * @constructor
     */
    constructor(content = '') {
        this.content = content;
        if (this.content) {
            _parseContent();
        }
    }


    /**
     * Expected to overwritten in sub-classes
     */
    parseJson() {

    }


    /**
     * Try parses the content into a JSOn object
     *
     * @returns {boolean}
     * @private
     */
    _parseContent() {
        try {
            this.json = JSON.parse(this.content);
            return true;
        }
        catch (err) {
            this.json = null;
            console.err(err);
            return false;
        }
    }


    /**
     * @returns {String}
     */
    get rawContent() {
        return this.content;
    }

    /**
     * @param {String} content
     */
    set rawContent(content) {
        this.content = content;

        this._parseContent();
        this.parseJson();
    }

}