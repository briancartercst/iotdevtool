define(["require", "exports"], function (require, exports) {
    "use strict";
    var MessageHandler = (function () {
        function MessageHandler(transport) {
            this.onMessageArrived = function (topic, payload) {
            };
            this.transport = transport;
            this.topic = {
                message: 'devices/' + this.transport.getClientId() + '/messages/devicebound/#',
                regexr: {
                    message: 'devices/' + this.transport.getClientId() + '/messages/devicebound/'
                }
            };
        }
        MessageHandler.prototype.initialize = function () {
            this.messageSub = {
                topic: this.topic.message,
                topicReg: new RegExp(this.topic.regexr.message),
                qos: 0,
                messageHandler: this.onMessageArrived.bind(this)
            };
            this.transport.subscribe(this.messageSub);
        };
        MessageHandler.prototype.uninitialize = function () {
            this.transport.unsubscribe(this.messageSub);
        };
        MessageHandler.prototype.sendMessage = function (topic, payload, qos, retain) {
            if (isNaN(qos) || qos < 0 || qos > 1) {
                return;
            }
            this.transport.publish(topic, payload, qos, retain);
        };
        return MessageHandler;
    }());
    exports.MessageHandler = MessageHandler;
});
