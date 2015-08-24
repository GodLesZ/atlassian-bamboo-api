"use strict";

import request from 'request';
import stream from 'stream';

// @TODO: Use Sets instead of arrays

//noinspection JSUnusedGlobalSymbols
export default class Bamboo {

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
     * Callback for getBuild
     *
     * @typedef {Function} getBuildCallback
     * @param {Error|null} error - will return null if no error happen
     * @param {Object|null} build - Build details
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
    constructor(host = 'http://localhost:8085', username = null, password = null) {

        if (username && password) {
            let protocol = host.match(/(^|\s)(https?:\/\/)/i);

            if (Array.isArray(protocol)) {
                protocol = protocol[0];

                let url = host.substr(protocol.length);
                host    = protocol + username + ':' + password + '@' + url;
            }
        }

        this.host = host;
    }

    /**
     * Requests a lightweight API resource to ensure its available
     *
     * @param {testLoginCallback} callback
     */
    testLogin(callback) {
        let serverVersionUri = this.host + '/rest/api/latest/info.json';

        request({uri: serverVersionUri}, (error, response, body) => {
            let errors = Bamboo.checkErrors(error, response);
            if (errors) {
                callback(errors, false);
                return;
            }

            try {
                let bodyJson = JSON.parse(body);
                if (!bodyJson || !bodyJson.version) {
                    callback(new Error(`Unexpected response: ${body}`), false);
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
    getLatestSuccessfulBuildNumber(planKey, params, callback, startIndex) {
        params = params || '';
        startIndex = (startIndex ? `&start-index=${startIndex}` : '');

        let self    = this,
            planUri = `${self.host}/rest/api/latest/result/${planKey}.json?${params}${startIndex}`;

        request({uri: planUri}, (error, response, body) => {
            let errors = Bamboo.checkErrorsWithResult(error, response);
            if (errors) {
                callback(errors, null);
                return;
            }

            let bodyJson = JSON.parse(body),
                results  = bodyJson.results,
                result   = results.result;

            // Search for the latest 'Successful' build
            for (let entry of result) {
                if (entry.state !== 'Successful') {
                    continue;
                }

                callback(null, entry.number);
                return;
            }

            // Loop through the next series of builds
            let newIndex = results['max-result'] + results['start-index'];
            if (newIndex < results.size) {
                self.getLatestSuccessfulBuildNumber(planKey, params, (error, result) => {
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
    getLatestBuildStatus(planKey, callback) {
        let planUri = `${this.host}/rest/api/latest/result/${planKey}.json`;

        request({uri: planUri}, (error, response, body) => {
            let errors = Bamboo.checkErrorsWithResult(error, response);
            if (errors) {
                callback(errors, null, null);
                return;
            }

            let bodyJson   = JSON.parse(body),
                results    = bodyJson.results,
                lastResult = results.result[0];

            callback(null, lastResult.state, lastResult.number);
        });
    }

    /**
     * Returns the build
     *
     * @param {String} buildKey - Bamboo plan key + build number, like 'PROJECT_KEY-PLAN_KEY-BUILD_NUMBER'
     * @param {String|Boolean} params - Appending query string. E.g. 'expand=something'. Could be false
     * @param {getBuildStatusCallback} callback
     */
    getBuild(buildKey, params, callback) {
        params = params || '';
        let planUri = `${this.host}/rest/api/latest/result/${buildKey}.json?${params}`;

        request({uri: planUri}, (error, response, body) => {
            let errors = Bamboo.checkErrors(error, response);
            if (errors) {
                callback(errors, null);
                return;
            }

            let bodyJson = JSON.parse(body);

            callback(null, bodyJson);
        });
    }

    /**
     * Returns the changes associated to a specific build. It also considers a dependent plan recursively
     *
     * @param {String} buildDetails - Bamboo plan key + build number, like 'PROJECT_KEY-PLAN_KEY/BUILD_NUMBER'
     * @param {getChangesFromBuildCallback} callback
     */
    getChangesFromBuild(buildDetails, callback) {
        let self    = this,
            planUri = `${self.host}/rest/api/latest/result/${buildDetails}.json?expand=changes`;

        request({uri: planUri}, (error, response, body) => {
            let errors = Bamboo.checkErrors(error, response);
            if (errors) {
                callback(errors, null);
                return;
            }

            let bodyJson    = JSON.parse(body),
                changes     = bodyJson.changes.change,
                buildReason = bodyJson.buildReason,
                changeNames = [];

            for (let change of changes) {
                changeNames.push(change.fullName);
            }

            changeNames = [...new Set(changeNames)];

            if (!buildReason || buildReason.includes('Child of') === false) {
                callback(null, changeNames);
                return;
            }

            let dependentPlan = buildReason.substring(buildReason.indexOf('>') + 1).replace('</a>', '');

            // Search for JIRA issues coming from the dependent plan
            self.getChangesFromBuild(dependentPlan, (error, result) => {
                let errors = Bamboo.checkErrors(error, response);
                if (errors) {
                    callback(errors, null);
                    return;
                }

                callback(null, [...new Set(changeNames.concat(result))]);
            });
        });
    }

    /**
     * Returns the jira issues associated to a specific build. It also considers a dependent plan
     *
     * @param {String} buildDetails - Bamboo plan key + build number, like 'PROJECT_KEY-PLAN_KEY/BUILD_NUMBER'
     * @param {getJiraIssuesFromBuildCallback} callback
     */
    getJiraIssuesFromBuild(buildDetails, callback) {
        let self    = this,
            planUri = `${self.host}/rest/api/latest/result/${buildDetails}.json?expand=jiraIssues`;

        request({uri: planUri}, (error, response, body) => {
            let errors = Bamboo.checkErrors(error, response);
            if (errors) {
                callback(errors, null);
                return;
            }

            let bodyJson    = JSON.parse(body),
                jiraIssues  = bodyJson.jiraIssues.issue,
                buildReason = bodyJson.buildReason,
                jiraNumbers = [];

            for (let issue of jiraIssues) {
                jiraNumbers.push(issue.key);
            }

            jiraNumbers = [...new Set(jiraNumbers)];

            if (buildReason.includes('Child of')) {
                let dependentPlan = buildReason.substring(buildReason.indexOf('>') + 1).replace('</a>', '');

                // Search for JIRA issues coming from the dependent plan
                self.getJiraIssuesFromBuild(dependentPlan, (error, result) => {
                    let errors = Bamboo.checkErrors(error, response);
                    if (errors) {
                        callback(errors, null);
                        return;
                    }

                    callback(null, [...new Set(jiraNumbers.concat(result))]);
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
    getArtifactContent(buildDetails, artifactName, callback) {
        let artifactUri = `${this.host}/browse/${buildDetails}/artifact/shared/${artifactName}/${artifactName}`;

        request({uri: artifactUri}, (error, response, body) => {
            let errors = Bamboo.checkErrors(error, response);
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
    getAllPlans(params, callback, currentPlans, startIndex = null) {
        params = params || '';
        startIndex = (startIndex ? `&start-index=${startIndex}` : '');

        let self    = this,
            planUri = `${self.host}/rest/api/latest/plan.json?${params}${startIndex}`;

        currentPlans = currentPlans || [];

        request({uri: planUri}, (error, response, body) => {
            let errors = Bamboo.checkErrors(error, response);
            if (errors) {
                callback(errors, null);
                return;
            }

            let bodyJson = JSON.parse(body),
                plans    = bodyJson.plans;

            if (plans.plan.length === 0) {
                callback(new Error('No plans available'), null);
                return;
            }

            for (let plan of plans.plan) {
                currentPlans.push({
                    key:  plan.key,
                    name: plan.name
                });
            }

            // Loop through the next series of plans
            let newIndex = plans['max-result'] + plans['start-index'];
            if (newIndex < plans.size) {
                self.getAllPlans(params, (error, result) => {
                    let errors = Bamboo.checkErrors(error, response);

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
    getAllBuilds(params, callback, currentBuilds, startIndex = null) {
        params = params || '';
        startIndex = (startIndex ? `&start-index=${startIndex}` : '');

        let self    = this,
            planUri = `${self.host}/rest/api/latest/result.json?${params}${startIndex}`;

        currentBuilds = currentBuilds || [];

        request({uri: planUri}, (error, response, body) => {
            let errors = Bamboo.checkErrors(error, response);
            if (errors) {
                callback(errors, null);
                return;
            }

            let bodyJson = JSON.parse(body),
                results    = bodyJson.results;

            if (results.result.length === 0) {
                callback(new Error('No builds available'), null);
                return;
            }

            for (let result of results.result) {
                currentBuilds.push(result);
            }

            // Loop through the next series of builds
            let newIndex = results['max-result'] + results['start-index'];
            if (newIndex < results.size) {
                self.getAllBuilds(params, (error, result) => {
                    let errors = Bamboo.checkErrors(error, response);

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
    static checkErrorsWithResult(error, response) {
        let errors = Bamboo.checkErrors(error, response);
        if (errors !== false) {
            return errors;
        }

        let body    = JSON.parse(response.body),
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
    static checkErrors(error, response) {
        if (error) {
            return error instanceof Error ? error : new Error(error);
        }

        if (response.statusCode !== 200) {
            return new Error('Unreachable endpoint');
        }

        return false;
    }
}
