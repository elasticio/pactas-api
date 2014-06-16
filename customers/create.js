var pactas = require("../pactas.js");
var messages = require("../messages.js");
var request = require("request");
var Q = require("q");

var httpPost = Q.denodeify(request.post);


function createCustomer(customer) {
    return function postCustomer(accessToken) {
        console.log("About to create a new Pactas customer");

        var opts = {
            uri : pactas.getResourceUri('/Customers/'),
            headers : {
                Authorization : 'Bearer ' + accessToken,
                'Content-Type':'application/json'
            },
            body : JSON.stringify(customer)
        };

        return httpPost(opts);
    };
}

exports.process = function(msg, cfg) {

    var that = this;

    pactas.getAccessToken(that, cfg)
        .then(createCustomer(msg.body))
        .then(pactas.parseBodyIfResponseOk(201))
        .then(function(contact) {

            var data = messages.newMessageWithBody(contact);

            that.emit('data', data);
        })
        .fail(function(e) {
            console.log(e);
            that.emit('error', e);
        })
        .done(function() {
            that.emit('end');
        });
};