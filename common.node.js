/**
 * @file vip_club /
 * Created: 03.09.14 / 22:59
 */
var
    _ = require('../vendor/bower/lodash/dist/lodash'),
    $ = _.chain;
    require('../vendor/bower/string-format-js/format.js');

module.exports.h = (function () {
    var buildOpenTag = function (attributes, tag) {
            return '<#{name} #{attr}>'.format({
                name: tag,
                attr: $(attributes).map(function (val, key) {
                    return "#{param}='#{val}'".format({param: key, val: val});
                }).join(' ')
            });
        },
        buildCloseTag = function (tag) {
            return '</#{name}>'.format({name: tag});
        };
    return {
        buildTag: function (tag, attributes, content) {
            return buildOpenTag(attributes, tag) + content + buildCloseTag(tag);
        }
    };
}());

/**
 * Read Asynchronously file via network
 */
module.exports.readFileNet = function (pathOrigin, callback, encoding, isVerbose) {
    var hostSplitPath, protocol, hostPath, path = pathOrigin;
    hostSplitPath = path.split('://');
    if (hostSplitPath.length === 2) {
        protocol = hostSplitPath[0];
        hostPath = hostSplitPath[1];
    }
    else {
        throw 'Path is not correct';
    }
    hostPath = hostPath.split('/');
    var host = hostPath.shift();
    path = '/' + hostPath.join('/');
    encoding = encoding || 'utf8';
    isVerbose && stdout({'parameters': {pathOrigin: pathOrigin, host: host, path: path, encoding: encoding}});
    http.get({
            host: host,
            // port: 80,
            path: path
        },
        function (res) {
            var apiResponse = '';
            res.setEncoding(encoding);

            res.on('data', function (chunk) {
                apiResponse += chunk;
            });

            res.on('end', function () {
                isVerbose && stdout({'response': apiResponse});
                callback(apiResponse);
            });
        });
};

/**
 * Read Asynchronously JSON file via network
 */
module.exports.readFileJsonNet = function (path, callback, isVerbose) {
    var callbackJson = function (resp) {
        isVerbose && stdout({'responseJson': JSON.parse(resp)});
        callback(JSON.parse(resp));
    };
    module.exports.readFileNet(path, callbackJson, null, isVerbose);
};

