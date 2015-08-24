"use strict";

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _stream = require('stream');

var _stream2 = _interopRequireDefault(_stream);

// @TODO: Use Sets instead of arrays

//noinspection JSUnusedGlobalSymbols

var Bamboo = (function () {

    /**
     * Callback for testLogin
     *
     * @typedef {Function} testLoginCallback
     * @param {Error|null} error - will return null if no error happen
     * @param {bool} result - true if no error
     */
    /**
     * Callback for getLatestSuccessfulBuildNumber
     *
     * @typedef {Function} getLatestSuccessfulBuildNumberCallback
     * @param {Error|null} error - will return null if no error happen
     * @param {String|null} result - if no error will return build number
     */
    /**
     * Callback for getLatestBuildStatus
     *
     * @typedef {Function} getLatestBuildStatusCallback
     * @param {Error|null} error - will return null if no error happen
     * @param {String|null} state - last result state if no error will return build number
     * @param {String|null} number - last result number if no error will return build number
     */
    /**
     * Callback for getBuildStatus
     *
     * @typedef {Function} getBuildStatusCallback
     * @param {Error|null} error - will return null if no error happen
     * @param {String|null} lifeCycleState - build life cycle, like 'InProgress'
     */
    /**
     * Callback for getChangesFromBuild
     *
     * @typedef {Function} getChangesFromBuildCallback
     * @param {Error|null} error - will return null if no error happen
     * @param {Array|null} result - List of changes
     */
    /**
     * Callback for getJiraIssuesFromBuild
     *
     * @typedef {Function} getJiraIssuesFromBuildCallback
     * @param {Error|null} error - will return null if no error happen
     * @param {Array|null} result - List of JIRA tasks
     */
    /**
     * Callback for getArtifactContent
     *
     * @typedef {Function} getArtifactContentCallback
     * @param {Error|null} error - will return null if no error happen
     * @param {String|null} result - content of an artifact
     */
    /**
     * Callback for getAllPlans
     *
     * @typedef {Function} getAllPlansCallback
     * @param {Error|null} error - will return null if no error happen
     * @param {Array|null} result - if no error will return list of plans
     */
    /**
     * Callback for getAllBuilds
     *
     * @typedef {Function} getAllBuildsCallback
     * @param {Error|null} error - will return null if no error happen
     * @param {String|null} result - if no error will return list of builds
     */

    /**
     * @param {String} host - hostname. By default 'http://localhost:8085'
     * @param {String|null} username - optional param for base HTTP authentication. Username
     * @param {String|null} password - optional param for base HTTP authentication. Password
     * @constructor
     */

    function Bamboo() {
        var host = arguments.length <= 0 || arguments[0] === undefined ? 'http://localhost:8085' : arguments[0];
        var username = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
        var password = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

        _classCallCheck(this, Bamboo);

        if (username && password) {
            var protocol = host.match(/(^|\s)(https?:\/\/)/i);

            if (Array.isArray(protocol)) {
                protocol = protocol[0];

                var url = host.substr(protocol.length);
                host = protocol + username + ':' + password + '@' + url;
            }
        }

        this.host = host;
    }

    /**
     * Requests a lightweight API resource to ensure its available
     *
     * @param {testLoginCallback} callback
     */

    _createClass(Bamboo, [{
        key: 'testLogin',
        value: function testLogin(callback) {
            var serverVersionUri = this.host + '/rest/api/latest/info.json';

            (0, _request2['default'])({ uri: serverVersionUri }, function (error, response, body) {
                var errors = Bamboo.checkErrors(error, response);
                if (errors) {
                    callback(errors, false);
                    return;
                }

                try {
                    var bodyJson = JSON.parse(body);
                    if (!bodyJson || !bodyJson.version) {
                        callback(new Error('Unexpected response: ' + body), false);
                    }
                } catch (err) {
                    callback(err, false);
                }

                callback(null, true);
            });
        }

        /**
         * Returns the latest successful build number
         *
         * @param {String} planKey - Bamboo plan key, like 'PROJECT_KEY-PLAN_KEY'
         * @param {String|Boolean} params - Query string. E.g. 'expand=something'. Could be false
         * @param {getLatestSuccessfulBuildNumberCallback} callback
         * @param {Number|null} startIndex - If given, request with start-index parameter
         */
    }, {
        key: 'getLatestSuccessfulBuildNumber',
        value: function getLatestSuccessfulBuildNumber(planKey, params, callback, startIndex) {
            params = params || '';
            startIndex = startIndex ? '&start-index=' + startIndex : '';

            var self = this,
                planUri = self.host + '/rest/api/latest/result/' + planKey + '.json?' + params + startIndex;

            (0, _request2['default'])({ uri: planUri }, function (error, response, body) {
                var errors = Bamboo.checkErrorsWithResult(error, response);
                if (errors) {
                    callback(errors, null);
                    return;
                }

                var bodyJson = JSON.parse(body),
                    results = bodyJson.results,
                    result = results.result;

                // Search for the latest 'Successful' build
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = result[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var entry = _step.value;

                        if (entry.state !== 'Successful') {
                            continue;
                        }

                        callback(null, entry.number);
                        return;
                    }

                    // Loop through the next series of builds
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator['return']) {
                            _iterator['return']();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }

                var newIndex = results['max-result'] + results['start-index'];
                if (newIndex < results.size) {
                    self.getLatestSuccessfulBuildNumber(planKey, params, function (error, result) {
                        callback(error, result);
                    }, newIndex);
                    return;
                }

                callback(new Error('The plan doesn\'t contain any successful build'), null);
            });
        }

        /**
         * Returns latest build status: state and number
         *
         * @param {String} planKey - Bamboo plan key, like 'PROJECT_KEY-PLAN_KEY'
         * @param {getLatestBuildStatusCallback} callback
         */
    }, {
        key: 'getLatestBuildStatus',
        value: function getLatestBuildStatus(planKey, callback) {
            var planUri = this.host + '/rest/api/latest/result/' + planKey + '.json';

            (0, _request2['default'])({ uri: planUri }, function (error, response, body) {
                var errors = Bamboo.checkErrorsWithResult(error, response);
                if (errors) {
                    callback(errors, null, null);
                    return;
                }

                var bodyJson = JSON.parse(body),
                    results = bodyJson.results,
                    lastResult = results.result[0];

                callback(null, lastResult.state, lastResult.number);
            });
        }

        /**
         * Returns the status of the build
         *
         * @param {String} buildDetails - Bamboo plan key + build number, like 'PROJECT_KEY-PLAN_KEY/BUILD_NUMBER'
         * @param {getBuildStatusCallback} callback
         */
    }, {
        key: 'getBuildStatus',
        value: function getBuildStatus(buildDetails, callback) {
            var planUri = this.host + '/rest/api/latest/result/' + buildDetails + '.json';

            (0, _request2['default'])({ uri: planUri }, function (error, response, body) {
                var errors = Bamboo.checkErrors(error, response);
                if (errors) {
                    callback(errors, null);
                    return;
                }

                var bodyJson = JSON.parse(body);

                callback(null, bodyJson.lifeCycleState);
            });
        }

        /**
         * Returns the changes associated to a specific build. It also considers a dependent plan recursively
         *
         * @param {String} buildDetails - Bamboo plan key + build number, like 'PROJECT_KEY-PLAN_KEY/BUILD_NUMBER'
         * @param {getChangesFromBuildCallback} callback
         */
    }, {
        key: 'getChangesFromBuild',
        value: function getChangesFromBuild(buildDetails, callback) {
            var self = this,
                planUri = self.host + '/rest/api/latest/result/' + buildDetails + '.json?expand=changes';

            (0, _request2['default'])({ uri: planUri }, function (error, response, body) {
                var errors = Bamboo.checkErrors(error, response);
                if (errors) {
                    callback(errors, null);
                    return;
                }

                var bodyJson = JSON.parse(body),
                    changes = bodyJson.changes.change,
                    buildReason = bodyJson.buildReason,
                    changeNames = [];

                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = changes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var change = _step2.value;

                        changeNames.push(change.fullName);
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                            _iterator2['return']();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }

                changeNames = [].concat(_toConsumableArray(new Set(changeNames)));

                if (!buildReason || buildReason.includes('Child of') === false) {
                    callback(null, changeNames);
                    return;
                }

                var dependentPlan = buildReason.substring(buildReason.indexOf('>') + 1).replace('</a>', '');

                // Search for JIRA issues coming from the dependent plan
                self.getChangesFromBuild(dependentPlan, function (error, result) {
                    var errors = Bamboo.checkErrors(error, response);
                    if (errors) {
                        callback(errors, null);
                        return;
                    }

                    callback(null, [].concat(_toConsumableArray(new Set(changeNames.concat(result)))));
                });
            });
        }

        /**
         * Returns the jira issues associated to a specific build. It also considers a dependent plan
         *
         * @param {String} buildDetails - Bamboo plan key + build number, like 'PROJECT_KEY-PLAN_KEY/BUILD_NUMBER'
         * @param {getJiraIssuesFromBuildCallback} callback
         */
    }, {
        key: 'getJiraIssuesFromBuild',
        value: function getJiraIssuesFromBuild(buildDetails, callback) {
            var self = this,
                planUri = self.host + '/rest/api/latest/result/' + buildDetails + '.json?expand=jiraIssues';

            (0, _request2['default'])({ uri: planUri }, function (error, response, body) {
                var errors = Bamboo.checkErrors(error, response);
                if (errors) {
                    callback(errors, null);
                    return;
                }

                var bodyJson = JSON.parse(body),
                    jiraIssues = bodyJson.jiraIssues.issue,
                    buildReason = bodyJson.buildReason,
                    jiraNumbers = [];

                var _iteratorNormalCompletion3 = true;
                var _didIteratorError3 = false;
                var _iteratorError3 = undefined;

                try {
                    for (var _iterator3 = jiraIssues[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                        var issue = _step3.value;

                        jiraNumbers.push(issue.key);
                    }
                } catch (err) {
                    _didIteratorError3 = true;
                    _iteratorError3 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion3 && _iterator3['return']) {
                            _iterator3['return']();
                        }
                    } finally {
                        if (_didIteratorError3) {
                            throw _iteratorError3;
                        }
                    }
                }

                jiraNumbers = [].concat(_toConsumableArray(new Set(jiraNumbers)));

                if (buildReason.includes('Child of')) {
                    var dependentPlan = buildReason.substring(buildReason.indexOf('>') + 1).replace('</a>', '');

                    // Search for JIRA issues coming from the dependent plan
                    self.getJiraIssuesFromBuild(dependentPlan, function (error, result) {
                        var errors = Bamboo.checkErrors(error, response);
                        if (errors) {
                            callback(errors, null);
                            return;
                        }

                        callback(null, [].concat(_toConsumableArray(new Set(jiraNumbers.concat(result)))));
                    });
                    return;
                }

                callback(null, jiraNumbers);
            });
        }

        /**
         * Returns the content of an artifact associated to a build
         *
         * @param {String} buildDetails - Bamboo plan key + build number, like 'PROJECT_KEY-PLAN_KEY/BUILD_NUMBER'
         * @param {String} artifactName - Artifact name
         * @param {getArtifactContentCallback} callback
         */
    }, {
        key: 'getArtifactContent',
        value: function getArtifactContent(buildDetails, artifactName, callback) {
            var artifactUri = this.host + '/browse/' + buildDetails + '/artifact/shared/' + artifactName + '/' + artifactName;

            (0, _request2['default'])({ uri: artifactUri }, function (error, response, body) {
                var errors = Bamboo.checkErrors(error, response);
                if (errors) {
                    callback(errors, null);
                    return;
                }

                callback(null, body.toString('utf-8', 0));
            });
        }

        /**
         * Returns the list of plans, key and names available
         *
         * @param {String|Boolean} params - Query string. E.g. 'expand=something'. Could be false
         * @param {getAllPlansCallback} callback
         * @param {Array=} currentPlans - List of plans available (each plan has a 'key' and a 'name' value)
         * @param {Number|null} startIndex - If given, request with start-index parameter
         */
    }, {
        key: 'getAllPlans',
        value: function getAllPlans(params, callback, currentPlans) {
            var startIndex = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];

            params = params || '';
            startIndex = startIndex ? '&start-index=' + startIndex : '';

            var self = this,
                planUri = self.host + '/rest/api/latest/plan.json?' + params + startIndex;

            currentPlans = currentPlans || [];

            (0, _request2['default'])({ uri: planUri }, function (error, response, body) {
                var errors = Bamboo.checkErrors(error, response);
                if (errors) {
                    callback(errors, null);
                    return;
                }

                var bodyJson = JSON.parse(body),
                    plans = bodyJson.plans;

                if (plans.plan.length === 0) {
                    callback(new Error('No plans available'), null);
                    return;
                }

                var _iteratorNormalCompletion4 = true;
                var _didIteratorError4 = false;
                var _iteratorError4 = undefined;

                try {
                    for (var _iterator4 = plans.plan[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                        var plan = _step4.value;

                        currentPlans.push({
                            key: plan.key,
                            name: plan.name
                        });
                    }

                    // Loop through the next series of plans
                } catch (err) {
                    _didIteratorError4 = true;
                    _iteratorError4 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion4 && _iterator4['return']) {
                            _iterator4['return']();
                        }
                    } finally {
                        if (_didIteratorError4) {
                            throw _iteratorError4;
                        }
                    }
                }

                var newIndex = plans['max-result'] + plans['start-index'];
                if (newIndex < plans.size) {
                    self.getAllPlans(params, function (error, result) {
                        var errors = Bamboo.checkErrors(error, response);

                        if (errors) {
                            callback(errors, null);
                            return;
                        }

                        callback(null, result);
                    }, currentPlans, newIndex);
                    return;
                }

                callback(null, currentPlans);
            });
        }

        /**
         * Returns the list of the last builds with full details
         *
         * @param {String|Boolean} params - Appending query string. E.g. 'expand=something'. Could be false
         * @param {getAllBuildsCallback} callback
         * @param {Array=} currentBuilds - List of build already fetched
         * @param {Number|null} startIndex - If given, request with start-index parameter
         */
    }, {
        key: 'getAllBuilds',
        value: function getAllBuilds(params, callback, currentBuilds) {
            var startIndex = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];

            params = params || '';
            startIndex = startIndex ? '&start-index=' + startIndex : '';

            var self = this,
                planUri = self.host + '/rest/api/latest/result.json?' + params + startIndex;

            currentBuilds = currentBuilds || [];

            (0, _request2['default'])({ uri: planUri }, function (error, response, body) {
                var errors = Bamboo.checkErrors(error, response);
                if (errors) {
                    callback(errors, null);
                    return;
                }

                var bodyJson = JSON.parse(body),
                    results = bodyJson.results;

                if (results.result.length === 0) {
                    callback(new Error('No builds available'), null);
                    return;
                }

                var _iteratorNormalCompletion5 = true;
                var _didIteratorError5 = false;
                var _iteratorError5 = undefined;

                try {
                    for (var _iterator5 = results.result[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                        var result = _step5.value;

                        currentBuilds.push(result);
                    }

                    // Loop through the next series of builds
                } catch (err) {
                    _didIteratorError5 = true;
                    _iteratorError5 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion5 && _iterator5['return']) {
                            _iterator5['return']();
                        }
                    } finally {
                        if (_didIteratorError5) {
                            throw _iteratorError5;
                        }
                    }
                }

                var newIndex = results['max-result'] + results['start-index'];
                if (newIndex < results.size) {
                    self.getAllBuilds(params, function (error, result) {
                        var errors = Bamboo.checkErrors(error, response);

                        if (errors) {
                            callback(errors, null);
                            return;
                        }

                        callback(null, result);
                    }, currentBuilds, newIndex);
                    return;
                }

                callback(null, currentBuilds);
            });
        }

        /**
         * Method checks for errors in error and server response
         * Additionally parsing response body and checking if it contain any results
         *
         * @param {Error|null} error
         * @param {Object} response
         * @returns {Error|Boolean} if error, will return Error otherwise false
         * @protected
         */
    }], [{
        key: 'checkErrorsWithResult',
        value: function checkErrorsWithResult(error, response) {
            var errors = Bamboo.checkErrors(error, response);
            if (errors !== false) {
                return errors;
            }

            var body = JSON.parse(response.body),
                results = body.results;

            if (typeof results === 'undefined' || results.result.length === 0) {
                return new Error('The plan doesn\'t contain any result');
            }

            return false;
        }

        /**
         * Method checks for errors in error and server response
         *
         * @param {Error|null} error
         * @param {Object} response
         * @returns {Error|Boolean} if error, will return Error otherwise false
         * @protected
         */
    }, {
        key: 'checkErrors',
        value: function checkErrors(error, response) {
            if (error) {
                return error instanceof Error ? error : new Error(error);
            }

            if (response.statusCode !== 200) {
                return new Error('Unreachable endpoint');
            }

            return false;
        }
    }]);

    return Bamboo;
})();

exports['default'] = Bamboo;
module.exports = exports['default'];
//# sourceMappingURL=Bamboo.js.map