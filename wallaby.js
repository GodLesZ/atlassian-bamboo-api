module.exports = function (wallaby) {
    return {
        files: [
            'lib/*.js'
        ],

        tests: [
            'test/*-spec.js'
        ],

        env: {
            type: 'node'
        },

        preprocessors: {
            '**/*.js': file => require('babel-core').transform(file.content, {sourceMap: true})
        }
    };
};