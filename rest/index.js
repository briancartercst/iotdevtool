const fetch = require('node-fetch');

module.exports = function (context, req) {
    var authorization = req.headers.authorization;
    var body = req.body || null;
    var method = req.method;
    var _path = req.query.path;
    var apiVersion = req.query['api-version']
    if (!_path || _path.indexOf('/') === -1) {
        context.res = {
            status: 400
        };
        context.done();
        return;
    }

    var account = _path.match(/^(.*?)\//)[1];
    var path = _path.match(/^.*?\/(.*)/)[1];
    var url = 'https://' + account + '.azure-devices.net/' + path + '?api-version=' + apiVersion;

    delete req.headers['host'];
    delete req.headers['accept-encoding'];
    req.headers['user-agent'] = 'iotdevtool.azure/20170525/' + req.headers['x-user-guid'];
    if (body) {
        body = JSON.stringify(body);
    }
    var statusCode;
    fetch(url, { method: method, body: body, headers: req.headers })
        .then(function(res) {
            statusCode = res.status;
            if (statusCode === 201 || statusCode === 204) {
                context.res = {
                    status: statusCode,
                    body: null
                };
                context.done();
                return;
            }
            return res.json();
        }).then(function(json) {
            context.res = {
                status: statusCode,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: json
            };
            context.done();
        });
};