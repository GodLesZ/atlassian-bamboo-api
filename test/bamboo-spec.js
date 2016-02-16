"use strict";

import Bamboo from '../lib/bamboo';
import expect from 'expect.js';
import requestMock from 'nock';

let baseTestUrl = 'http://example.com',
    testUsername = 'user',
    testPassword = 'pass',
    authTestUrl = `http://${testUsername}:${testPassword}@example.com`,
    testPlanKey = 'myPrj-myPlan',
    testApiUrl = '/rest/api/latest/result',
    testApiLoginUrl = '/rest/api/latest/plan.json?os_authType=basic',
    testPlanResultUrl = testApiUrl + '/' + testPlanKey + '.json?os_authType=basic',
    testPlanLatest = '/rest/api/latest/plan.json?os_authType=basic',
    testBuildsLatest = '/rest/api/latest/result.json?os_authType=basic';

before(() => {
    requestMock.cleanAll();
});

describe('Bamboo', () => {

    describe('requests options matching', () => {

        let addRequestMock = () => {
            let result = JSON.stringify({
                version: '2.4',
                edition: '',
                buildDate: '2009-09-11T20:47:44.000+0200',
                buildNumber: '1503'
            });

            requestMock(baseTestUrl)
                .get(testApiLoginUrl)
                .reply(200, result);
        };

        it('should have a keepAlive setting', (done) => {

            addRequestMock();

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.doApiRequest({url: bamboo.host + '/rest/api/latest/plan.json?os_authType=basic'}, (error, response, body) => {
                let opts = bamboo.defaultRequestOptions;
                expect(response.request.keepAlive).to.be(opts.keepAlive);
                expect(response.request.keepAliveMsecs).to.be(opts.keepAliveMsecs);
                done();
            });
        });
    });

    describe('getLatestSuccessfulBuildNumber', () => {

        it('returns the latest successful build number', (done) => {
            requestMock(baseTestUrl)
                .get(testPlanResultUrl + '1')
                .reply(200, JSON.stringify({
                    results: {
                        result: [
                            {number: '23', state: 'Failed'},
                            {number: '22', state: 'Successful'}
                        ]
                    }
                }));

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getLatestSuccessfulBuildNumber(testPlanKey, '1', (error, result) => {
                expect(error).to.be(null);
                expect(result).to.eql('22');
                done();
            });
        });

        it('returns a msg when the plan doesn\'t contain any successful build', (done) => {
            requestMock(baseTestUrl)
                .get(testPlanResultUrl + '2')
                .reply(200, JSON.stringify({
                    results: {
                        result: [
                            {number: '23', state: 'Failed'},
                            {number: '22', state: 'Failed'}
                        ]
                    }
                }));

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getLatestSuccessfulBuildNumber(testPlanKey, '2', (error, result) => {
                expect(error.toString()).to.eql('Error: The plan doesn\'t contain any successful build');
                expect(result).to.be(null);
                done();
            });
        });

        it('returns a msg when the plan doesn\'t contain any successful build', (done) => {
            requestMock(baseTestUrl)
                .get(testPlanResultUrl + '3')
                .reply(200, JSON.stringify({
                    results: {
                        size: 3,
                        'max-result': 2,
                        'start-index': 0,
                        result: [
                            {number: '23', state: 'Failed'},
                            {number: '22', state: 'Failed'}
                        ]
                    }
                }));

            requestMock(baseTestUrl)
                .get(testPlanResultUrl + '3&start-index=2')
                .reply(200, JSON.stringify({
                    results: {
                        size: 3,
                        'max-result': 1,
                        'start-index': 2,
                        result: [
                            {number: '21', state: 'Failed'}
                        ]
                    }
                }));

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getLatestSuccessfulBuildNumber(testPlanKey, '3', (error, result) => {
                expect(error.toString()).to.eql('Error: The plan doesn\'t contain any successful build');
                expect(result).to.be(null);
                done();
            });
        });

        it('returns a msg when the plan doesn\'t contain any result', (done) => {
            requestMock(baseTestUrl)
                .get(testPlanResultUrl + '4')
                .reply(200, JSON.stringify({
                    results: {
                        result: []
                    }
                }));

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getLatestSuccessfulBuildNumber(testPlanKey, '4', (error, result) => {
                expect(error.toString()).to.eql('Error: The plan doesn\'t contain any result');
                expect(result).to.be(null);
                done();
            });
        });


        it('returns a msg when the plan doesn\'t exist', (done) => {
            requestMock(baseTestUrl)
                .get(testPlanResultUrl + '5')
                .reply(404);

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getLatestSuccessfulBuildNumber(testPlanKey, '5', (error, result) => {
                expect(error.toString()).to.eql('Error: Unreachable endpoint');
                expect(result).to.be(null);
                done();
            });
        });

        it('returns the latest successful build number in multiple \'requests\'', (done) => {
            requestMock(baseTestUrl)
                .get(testPlanResultUrl + '6')
                .reply(200, JSON.stringify({
                    results: {
                        size: 3,
                        'max-result': 2,
                        'start-index': 0,
                        result: [
                            {number: '23', state: 'Failed'},
                            {number: '22', state: 'Failed'}
                        ]
                    }
                }));

            requestMock(baseTestUrl)
                .get(testPlanResultUrl + '6&start-index=2')
                .reply(200, JSON.stringify({
                    results: {
                        size: 3,
                        'max-result': 1,
                        'start-index': 2,
                        result: [
                            {number: '21', state: 'Successful'}
                        ]
                    }
                }));

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getLatestSuccessfulBuildNumber(testPlanKey, '6', (error, result) => {
                expect(error).to.be(null);
                expect(result).to.eql('21');
                done();
            });
        })
    });

    describe('getBuild', () => {

        it('returns the build', (done) => {
            let responseBuild = {
                state: "Successful",
                buildState: "Successful",
                number: 1337,
                buildNumber: 1337
            };
            requestMock(baseTestUrl)
                .get(testApiUrl + '/' + testPlanKey + '-416.json?os_authType=basic&')
                .reply(200, JSON.stringify(responseBuild));

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getBuild(testPlanKey + '-416', '', (error, result) => {
                expect(error).to.be(null);
                expect(result).to.eql(responseBuild);
                done();
            });
        });
    });

    describe('getLatestBuildStatus', () => {

        it('returns the latest build Status', (done) => {

            requestMock(baseTestUrl)
                .get(testPlanResultUrl)
                .reply(200, JSON.stringify({
                    results: {
                        result: [
                            {number: '23', state: 'Failed'},
                            {number: '22', state: 'Failed'},
                            {number: '21', state: 'Successful'}
                        ]
                    }
                }));

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getLatestBuildStatus(testPlanKey, (error, state, number) => {
                expect(error).to.be(null);
                expect(state).to.eql('Failed');
                expect(number).to.eql('23');
                done();
            });
        });

        it('returns the latest build Status', (done) => {

            requestMock(baseTestUrl)
                .get(testPlanResultUrl)
                .reply(200, JSON.stringify({
                    results: {
                        size: 3,
                        'max-result': 1,
                        'start-index': 0,
                        result: []
                    }
                }));

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getLatestBuildStatus(testPlanKey, (error, state, number) => {
                expect(error.toString()).to.eql('Error: The plan doesn\'t contain any result');
                expect(state).to.be(null);
                expect(number).to.be(null);
                done();
            });
        });
    });

    describe('getAllPlans', () => {

        let addRequestMock = (numStart, numResults, data = [], size = 0, params = '') => {
            requestMock(baseTestUrl)
                .get(testPlanLatest + '' + params + (numStart > 0 ? '&start-index=' + numStart : ''))
                .reply(200, JSON.stringify({
                    plans: {
                        size: size,
                        'max-result': numResults,
                        'start-index': numStart,
                        plan: data
                    }
                }));
        };

        it('returns a list of all plans available', (done) => {

            let allPlans = [
                {key: 'AA-BB', name: 'Full name1'},
                {key: 'CC-DD', name: 'Full name2'},
                {key: 'EE-FF', name: 'Full name3'},
                {key: 'GG-HH', name: 'Full name4'},
                {key: 'II-LL', name: 'Full name5'}
            ];

            addRequestMock(0, 2, allPlans.slice(0, 2), allPlans.length);
            addRequestMock(2, 2, allPlans.slice(2, 4), allPlans.length);
            addRequestMock(4, 1, allPlans.slice(4, 5), allPlans.length);

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getAllPlans(null, (error, result) => {
                expect(error).to.be(null);
                expect(result).to.eql(allPlans);
                done();
            });
        });

        it('returns a string saying that there are no plans', (done) => {

            addRequestMock(0, 1);

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getAllPlans(null, (error, result) => {
                expect(error.toString()).to.eql('Error: No plans available');
                expect(result).to.be(null);
                done();
            });
        });

        it('works over pages with params', (done) => {

            let allPlans = [
                {key: 'AA-BB', name: 'Full name1'},
                {key: 'CC-DD', name: 'Full name2'},
                {key: 'EE-FF', name: 'Full name3'},
                {key: 'GG-HH', name: 'Full name4'},
                {key: 'II-LL', name: 'Full name5'}
            ];

            addRequestMock(0, 2, allPlans.slice(0, 2), allPlans.length, 'expand=unit.test');
            addRequestMock(2, 2, allPlans.slice(2, 4), allPlans.length, 'expand=unit.test');
            addRequestMock(4, 1, allPlans.slice(4, 5), allPlans.length, 'expand=unit.test');

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getAllPlans('expand=unit.test', (error, result) => {
                expect(error).to.be(null);
                expect(result).to.eql(allPlans);
                done();
            });
        });

    });

    describe('getAllBuilds', () => {

        let addRequestMock = (numStart, numResults, data = [], size = 0, params = '') => {
            requestMock(baseTestUrl)
                .get(testBuildsLatest + '' + params + (numStart > 0 ? '&start-index=' + numStart : ''))
                .reply(200, JSON.stringify({
                    results: {
                        size: size,
                        'max-result': numResults,
                        'start-index': numStart,
                        result: data
                    }
                }));
        };

        it('returns a list of all builds available', (done) => {

            let allBuilds = [
                {key: 'AA-BB', name: 'Full name1'},
                {key: 'CC-DD', name: 'Full name2'},
                {key: 'EE-FF', name: 'Full name3'},
                {key: 'GG-HH', name: 'Full name4'},
                {key: 'II-LL', name: 'Full name5'}
            ];

            addRequestMock(0, 2, allBuilds.slice(0, 2), allBuilds.length);
            addRequestMock(2, 2, allBuilds.slice(2, 4), allBuilds.length);
            addRequestMock(4, 1, allBuilds.slice(4, 5), allBuilds.length);

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getAllBuilds(null, (error, result) => {
                expect(error).to.be(null);
                expect(result).to.eql(allBuilds);
                done();
            });
        });

        it('returns a string saying that there are no builds', (done) => {

            addRequestMock(0, 1);

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getAllBuilds(null, (error, result) => {
                expect(error.toString()).to.eql('Error: No builds available');
                expect(result).to.be(null);
                done();
            });
        });

        it('works over pages with params', (done) => {

            let allBuilds = [
                {key: 'AA-BB', name: 'Full name1'},
                {key: 'CC-DD', name: 'Full name2'},
                {key: 'EE-FF', name: 'Full name3'},
                {key: 'GG-HH', name: 'Full name4'},
                {key: 'II-LL', name: 'Full name5'}
            ];

            addRequestMock(0, 2, allBuilds.slice(0, 2), allBuilds.length, 'expand=unit.test');
            addRequestMock(2, 2, allBuilds.slice(2, 4), allBuilds.length, 'expand=unit.test');
            addRequestMock(4, 1, allBuilds.slice(4, 5), allBuilds.length, 'expand=unit.test');

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getAllBuilds('expand=unit.test', (error, result) => {
                expect(error).to.be(null);
                expect(result).to.eql(allBuilds);
                done();
            });
        });

    });

    describe('getArtifactContent', () => {

        it('returns the latest successful build number', (done) => {

            requestMock(baseTestUrl)
                .get('/browse/myPrj-myPlan-234/artifact/shared/name1/name1?os_authType=basic')
                .reply(200, 'AAA');

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getArtifactContent('myPrj-myPlan-234', 'name1', (error, result) => {
                expect(error).to.be(null);
                expect(result).to.eql('AAA');
                done();
            });
        });
    });


    describe('getJiraIssuesFromBuild', () => {

        it('returns the list of JIRA task from a build - no dependent plan', (done) => {

            requestMock(baseTestUrl)
                .get(testApiUrl + '/plan1-234.json?os_authType=basic&expand=jiraIssues')
                .reply(200, JSON.stringify({
                    buildReason: '',
                    jiraIssues: {
                        issue: [
                            {key: 'AAA'},
                            {key: 'AAA'},
                            {key: 'BBB'}
                        ]
                    }
                }));

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getJiraIssuesFromBuild('plan1-234', (error, result) => {
                expect(error).to.be(null);
                expect(result).to.eql(['AAA', 'BBB']);
                done();
            });
        });

        it('returns the list of JIRA task from a build - dependent on planB', (done) => {

            requestMock(baseTestUrl)
                .get(testApiUrl + '/plan1-234.json?os_authType=basic&expand=jiraIssues')
                .reply(200, JSON.stringify({
                    buildReason: 'Child of <a>plan2-99</a>',
                    jiraIssues: {
                        issue: [
                            {key: 'AAA'},
                            {key: 'AAA'},
                            {key: 'BBB'}
                        ]
                    }
                }));

            requestMock(baseTestUrl)
                .get(testApiUrl + '/plan2-99.json?os_authType=basic&expand=jiraIssues')
                .reply(200, JSON.stringify({
                    buildReason: 'Child of <a>plan3-11</a>',
                    jiraIssues: {
                        issue: [
                            {key: 'CCC'},
                            {key: 'BBB'}
                        ]
                    }
                }));

            requestMock(baseTestUrl)
                .get(testApiUrl + '/plan3-11.json?os_authType=basic&expand=jiraIssues')
                .reply(200, JSON.stringify({
                    buildReason: 'Changes by <a>XX</a>',
                    jiraIssues: {
                        issue: [
                            {key: 'DDD'},
                            {key: 'EEE'}
                        ]
                    }
                }));

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getJiraIssuesFromBuild('plan1-234', (error, result) => {
                expect(error).to.be(null);
                expect(result).to.eql(['AAA', 'BBB', 'CCC', 'DDD', 'EEE']);
                done();
            });
        });
    });

    describe('getChangesFromBuild', () => {

        it('returns the list of changes from a build - no dependent plan', (done) => {

            requestMock(baseTestUrl)
                .get(testPlanResultUrl + '&expand=changes')
                .reply(200, JSON.stringify({
                    changes: {
                        change: [
                            {fullName: 'a b'},
                            {fullName: 'a b'},
                            {fullName: 'c d'}
                        ]
                    }
                }));

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getChangesFromBuild(testPlanKey, (error, result) => {
                expect(error).to.be(null);
                expect(result).to.eql(['a b', 'c d']);
                done();
            });
        });

        it('returns the list of JIRA task from a build - dependent on planB', (done) => {

            requestMock(baseTestUrl)
                .get(testApiUrl + '/plan1-234.json?os_authType=basic&expand=changes')
                .reply(200, JSON.stringify({
                    buildReason: 'Child of <a>plan2-99</a>',
                    changes: {
                        change: [
                            {fullName: 'a b'},
                            {fullName: 'a b'},
                            {fullName: 'c d'}
                        ]
                    }
                }));

            requestMock(baseTestUrl)
                .get(testApiUrl + '/plan2-99.json?os_authType=basic&expand=changes')
                .reply(200, JSON.stringify({
                    buildReason: 'Child of <a>plan3-11</a>',
                    changes: {
                        change: [
                            {fullName: 'e f'},
                            {fullName: 'g h'}
                        ]
                    }
                }));

            requestMock(baseTestUrl)
                .get(testApiUrl + '/plan3-11.json?os_authType=basic&expand=changes')
                .reply(200, JSON.stringify({
                    buildReason: 'Changes by <a>XX</a>',
                    changes: {
                        change: [
                            {fullName: 'i j'},
                            {fullName: 'i j'},
                            {fullName: 'k l'}
                        ]
                    }
                }));

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.getChangesFromBuild('plan1-234', (error, result) => {
                expect(error).to.be(null);
                expect(result).to.eql(['a b', 'c d', 'e f', 'g h', 'i j', 'k l']);
                done();
            });
        });
    });

    describe('testLogin', () => {

        let addRequestMock = () => {
            let authString = testUsername + ':' + testPassword,
                encrypted = (new Buffer(authString)).toString('base64'),
                result = JSON.stringify({
                    expand: 'plans',
                    link: {
                        href: 'http://example.com',
                        rel: 'self'
                    },
                    plans: {}
                }),
                headerMatch = (val) => {
                    return val === 'Basic ' + encrypted;
                };

            requestMock(baseTestUrl)
                .get(testApiLoginUrl)
                .matchHeader('Authorization', headerMatch)
                .reply(200, result);
        };

        it('should fail, since require authentication', (done) => {

            addRequestMock();

            let bamboo = new Bamboo(baseTestUrl);
            bamboo.testLogin((error, result) => {
                expect(result).to.be(false);
                done();
            });
        });

        it('returns true', (done) => {

            addRequestMock();

            let bamboo = new Bamboo(baseTestUrl, testUsername, testPassword);
            bamboo.testLogin((error, result) => {
                expect(error).to.be(null);
                expect(result).to.be(true);
                done();
            });
        });
    });

});