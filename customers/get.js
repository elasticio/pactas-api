var pactas = require("../pactas.js");
var messages = require("../messages.js");
var request = require("request");
var _ = require("underscore");
var Q = require("q");

var httpGet = Q.denodeify(request.get);


function promiseCustomer(customerId) {
    return function getCustomers(accessToken) {

        var uri = pactas.getResourceUri('/Customers');

        if (customerId) {
            uri += '/' + customerId;
        }

        console.log("About to request Pactas customer: %s", customerId);

        var opts = {
            uri : uri,
            headers : {
                Authorization : 'Bearer ' + accessToken
            }
        };

        return httpGet(opts);
    }
}

exports.init = function (msg, cfg, callback) {
    var taskId = msg.body.taskId;

    pactas.getAccessToken(this, cfg)
        .then(pactas.registerWebhook(taskId))
        .then(function(body) {
            callback(null, {webhookId : body.Id});
        })
        .fail(callback)
        .done();
};

exports.shutdown = function (msg, cfg, callback, snapshot) {
    var webhookId = snapshot.webhookId;

    if (!webhookId) {
        return callback();
    }

    pactas.getAccessToken(this, cfg)
        .then(pactas.deleteWebhook(webhookId))
        .then(function() {
            callback(null, ['webhookId']);
        })
        .fail(callback)
        .done();
};

function promiseArray(obj) {

    return _.isArray(obj)? Q(obj) : Q([obj]);
}

exports.process = function(msg, cfg, next, snapshot) {

    var createdAt = snapshot.createdAt || 0;
    var maxCreatedAt = snapshot.createdAt || 0;

    var that = this;
    var customerId = msg.body.CustomerId;

    pactas.getAccessToken(that, cfg)
        .then(promiseCustomer(customerId))
        .then(pactas.parseBodyIfResponseOk(200))
        .then(promiseArray)
        .then(function(contacts) {

            for(var i in contacts) {

                var currentContact = contacts[i];
                var currentCreatedAt = new Date(currentContact.CreatedAt).getTime();

                if (customerId || currentCreatedAt > createdAt) {

                    var data = messages.newMessageWithBody(currentContact);

                    that.emit('data', data);
                }

                if (currentCreatedAt > maxCreatedAt) {
                    maxCreatedAt = currentCreatedAt;
                }
            }
        })
        .fail(function(e) {
            console.log(e);
            that.emit('error', e);
        })
        .done(function() {
            if (maxCreatedAt > createdAt) {
                snapshot.createdAt = maxCreatedAt;

                that.emit('snapshot', snapshot);
            }
            that.emit('end');
        });
};