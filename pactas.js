var Q = require("q");
var _ = require("underscore");
var request = require("request");
var util = require("util");

var PACTAS_BASE_URI = 'https://sandbox.pactas.com';
var API_BASE_URI = PACTAS_BASE_URI + '/api/v1';
var TOKEN_URI = PACTAS_BASE_URI + '/oauth/token';
var WEBHOOK_URI = API_BASE_URI + '/webhooks';

var httpPost = Q.denodeify(request.post);
var httpDelete = Q.denodeify(request.del);

function getAccessToken(emitter, cfg) {

    if (cfg.oauth) {
        return Q(cfg.oauth.access_token);
    }

    console.log("No access token for Pactas available. Gonna request a token");

    var auth = 'Basic ' + new Buffer(process.env.PACTAS_KEY + ':' + process.env.PACTAS_SECRET).toString('base64')

    var headers = {
        Authorization : auth
    };

    var opts = {
        uri : TOKEN_URI,
        headers : headers,
        form : {
            "username" : cfg.username,
            "password" : cfg.password,
            "grant_type" : "password"
        }
    };

    return httpPost(opts)
            .then(parseBodyIfResponseOk(200))
            .then(function(oauth){

                emitter.emit('updateAccessToken', {
                    accountId : cfg['_account'],
                    oauth : oauth
                });

                return oauth.access_token;
            });
}

function getResourceUri(resource) {
    return API_BASE_URI + resource;
}

function registerWebhook(taskId) {
    return function(accessToken) {
        console.log("Registering Pactas webhook for task: %s", taskId);

        var hookUri = util.format("%s/hook/%s", process.env.GATEWAY_URI, taskId);

        var body = {
            Url : hookUri,
            Events: ['CustomerChanged']
        };

        var opts = {
            uri : WEBHOOK_URI,
            headers : {
                Authorization : 'Bearer ' + accessToken,
                'Content-Type':'application/json'
            },
            body : JSON.stringify(body)
        };

        return httpPost(opts)
                .then(parseBodyIfResponseOk([200, 201]));
    };
}

function deleteWebhook(webhookId) {
    return function(accessToken) {
        console.log("Deleting Pactas webhook: %s", webhookId);

        var opts = {
            uri : WEBHOOK_URI + '/' + webhookId,
            headers : {
                Authorization : 'Bearer ' + accessToken,
                'Content-Type':'application/json'
            }
        };

        return httpDelete(opts)
            .then(parseBodyIfResponseOk(204));
    };
}


function parseBodyIfResponseOk(statusCodes) {
    return function (result) {

        var response = result[0];
        var body = result[1];

        if (typeof statusCodes === 'number') {
            statusCodes = [statusCodes];
        }

        var sc = response.statusCode;

        if(_.contains(statusCodes, response.statusCode)){
            return sc === 204 ? null : JSON.parse(body);
        }

        throw new Error(body);

    };
}

exports.getAccessToken = getAccessToken;
exports.getResourceUri = getResourceUri;
exports.registerWebhook = registerWebhook;
exports.deleteWebhook = deleteWebhook;
exports.parseBodyIfResponseOk = parseBodyIfResponseOk;