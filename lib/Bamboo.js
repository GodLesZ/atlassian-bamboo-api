"use strict";

import request from 'request';
import _ from 'underscore';
import stream from 'stream';

//noinspection JSUnusedGlobalSymbols
export default class Bamboo {

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
     * @param {String|null} result - if no error will return build number
     */

    /**
     * @param {String} host - hostname. By default 'http://hostname.com:8085'
     * @param {String|null} username - optional param for base HTTP authentication. Username
     * @param {String|null} password - optional param for base HTTP authentication. Password
     * @constructor
     */
    constructor(host = 'http://localhost:8085', username = null, password = null) {

        if (username && password) {
            let protocol = host.match(/(^|\s)(https?:\/\/)/i);

            if (_.isArray(protocol)) {
                protocol = _.first(protocol);

                let url = host.substr(protocol.length);

                host = protocol + username + ':' + password + '@' + url;
            }
        }

        this.host = host;
    }

    /**
     * Returns the latest successful build number
     *
     * @param {String} planKey - Bamboo plan key, like 'PROJECT_KEY-PLAN_KEY'
     * @param {String|Boolean} params - Query string. E.g. '?start-index=25'. Could be false
     * @param {getLatestSuccessfulBuildNumberCallback} callback
     */
    getLatestSuccessfulBuildNumber(planKey, params, callback) {
        let self    = this,
            planUri = self.host + '/rest/api/latest/result/' + planKey + '.json' + (params || '');

        request({uri: planUri}, function (error, response, body) {
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
                self.getLatestSuccessfulBuildNumber(planKey, '?start-index=' + newIndex, function (error, result) {
                    callback(error, result);
                });
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
        let planUri = this.host + '/rest/api/latest/result/' + planKey + '.json';

        request({uri: planUri}, function (error, response, body) {
            let errors = Bamboo.checkErrorsWithResult(error, response);
            if (errors) {
                callback(errors, null, null);
                return;
            }

            let bodyJson   = JSON.parse(body),
                results    = bodyJson.results,
                lastResult = _.first(results.result);

            callback(null, lastResult.state, lastResult.number);
        });
    }

    /**
     * Returns the status of the build
     *
     * @param {String} buildDetails - Bamboo plan key + build number, like 'PROJECT_KEY-PLAN_KEY/BUILD_NUMBER'
     * @param {getBuildStatusCallback} callback
     */
    getBuildStatus(buildDetails, callback) {
        let planUri = this.host + '/rest/api/latest/result/' + buildDetails + '.json';

        request({uri: planUri}, function (error, response, body) {
            let errors = Bamboo.checkErrors(error, response);
            if (errors) {
                callback(errors, null);
                return;
            }

            let bodyJson = JSON.parse(body);

            callback(null, bodyJson.lifeCycleState);
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
            planUri = self.host + '/rest/api/latest/result/' + buildDetails + '.json?expand=changes';

        request({uri: planUri}, function (error, response, body) {
            let errors = Bamboo.checkErrors(error, response);
            if (errors) {
                callback(errors, null);
                return;
            }

            let bodyJson    = JSON.parse(body),
                changes     = bodyJson.changes.change,
                buildReason = bodyJson.buildReason,
                changeNames = [];

            _.each(changes, function (change) {
                this.push(change.fullName);
            }, changeNames);

            _.uniq(changeNames);

            if (!(buildReason && buildReason.includes('Child of'))) {
                callback(null, changeNames);
                return;
            }

            let dependentPlan = buildReason.substring(buildReason.indexOf('>') + 1).replace('</a>', '');

            // Search for JIRA issues coming from the dependent plan
            self.getChangesFromBuild(dependentPlan, function (error, result) {
                let errors = Bamboo.checkErrors(error, response);
                if (errors) {
                    callback(errors, null);
                    return;
                }

                callback(null, _.union(changeNames, result));
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
            planUri = self.host + '/rest/api/latest/result/' + buildDetails + '.json?expand=jiraIssues';

        request({uri: planUri}, function (error, response, body) {
            let errors = Bamboo.checkErrors(error, response);
            if (errors) {
                callback(errors, null);
                return;
            }

            let bodyJson    = JSON.parse(body),
                jiraIssues  = bodyJson.jiraIssues.issue,
                buildReason = bodyJson.buildReason,
                jiraNumbers = [];

            _.each(jiraIssues, function (issue) {
                this.push(issue.key);
            }, jiraNumbers);

            _.uniq(jiraNumbers);

            if (buildReason.includes('Child of')) {
                let dependentPlan = buildReason.substring(buildReason.indexOf('>') + 1).replace('</a>', '');

                // Search for JIRA issues coming from the dependent plan
                self.getJiraIssuesFromBuild(dependentPlan, function (error, result) {
                    let errors = Bamboo.checkErrors(error, response);
                    if (errors) {
                        callback(errors, null);
                        return;
                    }

                    callback(null, _.union(jiraNumbers, result));
                });
            }
            else {
                callback(null, jiraNumbers);
            }
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
        let artifactUri = this.host + '/browse/' + buildDetails + '/artifact/shared/' + artifactName + '/' + artifactName;

        request({uri: artifactUri}, function (error, response, body) {
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
     * @param {String|Boolean} params - Query string. E.g. '?start-index=25'. Could be false
     * @param {getAllPlansCallback} callback
     * @param {Array=} currentPlans - List of plans available (each plan has a 'key' and a 'name' value)
     */
    getAllPlans(params, callback, currentPlans) {
        let self    = this,
            planUri = self.host + '/rest/api/latest/plan.json' + (params || '');

        currentPlans = currentPlans || [];

        request({uri: planUri}, function (error, response, body) {
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

            _.each(plans.plan, function (plan) {
                this.push({
                    key:  plan.key,
                    name: plan.name
                });
            }, currentPlans);

            // Loop through the next series of builds
            let newIndex = plans['max-result'] + plans['start-index'];
            if (newIndex < plans.size) {
                self.getAllPlans('?start-index=' + newIndex, function (error, result) {
                    let errors = Bamboo.checkErrors(error, response);

                    if (errors) {
                        callback(errors, null);
                        return;
                    }

                    callback(null, result);
                }, currentPlans);
                return;
            }

            callback(null, currentPlans);
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
