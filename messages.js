var uuid = require('node-uuid');

exports.newMessageWithBody = function (body) {
    var msg = newEmptyMessage();

    msg.body = body;

    return msg;
};

var newEmptyMessage = function () {
    var msg = {
        id: uuid.v1(),
        attachments: { },
        body: { },
        headers: {},
        metadata: {}
    };

    return msg;
};

exports.newEmptyMessage = newEmptyMessage;