define(["require", "exports"], function (require, exports) {
    "use strict";
    var TwinHandler = (function () {
        function TwinHandler(transport) {
            this.topic = {
                desired: '$iothub/twin/PATCH/properties/desired/#',
                reported: '$iothub/twin/PATCH/properties/reported/',
                get: '$iothub/twin/GET/',
                response: '$iothub/twin/res/#',
                regexr: {
                    desired: '\\$iothub/twin/PATCH/properties/desired/.*',
                    response: '\\$iothub/twin/res/(\\d+)/.*\\$rid=(\\d+).*',
                }
            };
            this.onDesiredTwinUpdate = function (topic, payload) {
            };
            this.transport = transport;
            this.desiredSub = {
                topic: this.topic.desired,
                topicReg: new RegExp(this.topic.regexr.desired),
                qos: 0,
                messageHandler: this._onDesiredTwinUpdate.bind(this)
            };
            this.responseSub = {
                topic: this.topic.response,
                topicReg: new RegExp(this.topic.regexr.response),
                qos: 0,
                messageHandler: this.onTwinMessageArrived.bind(this)
            };
            this.rid = 1234;
            this.eventQueue = {};
        }
        TwinHandler.prototype.initialize = function () {
            this.transport.subscribe(this.desiredSub);
            this.transport.subscribe(this.responseSub);
        };
        TwinHandler.prototype.uninitialize = function () {
            this.transport.unsubscribe(this.desiredSub);
            this.transport.unsubscribe(this.responseSub);
        };
        TwinHandler.prototype.getTwin = function (callback) {
            this.transport.publish(this.topic.get + '?$rid=' + this.rid, '', 0, false);
            this.eventQueue[this.rid] = callback;
            this.rid++;
        };
        TwinHandler.prototype.updateReported = function (content, callback) {
            try {
                var body = JSON.parse(content);
            }
            catch (e) {
                alert('Reported properties is not valid JSON');
                return;
            }
            this.transport.publish(this.topic.reported + '?$rid=' + this.rid, content, 0, false);
            this.eventQueue[this.rid] = callback;
            this.rid++;
        };
        TwinHandler.prototype.onTwinMessageArrived = function (topic, payload) {
            var reg = new RegExp(this.topic.regexr.response);
            var resultArray = reg.exec(topic);
            if (!resultArray || !resultArray[1] || !resultArray[2]) {
                return;
            }
            if (resultArray[2] in this.eventQueue) {
                this.eventQueue[resultArray[2]](topic, payload);
                delete this.eventQueue[resultArray[2]];
            }
        };
        TwinHandler.prototype._onDesiredTwinUpdate = function (topic, payload) {
            if (this.onDesiredTwinUpdate) {
                this.onDesiredTwinUpdate(topic, payload);
            }
        };
        return TwinHandler;
    }());
    exports.TwinHandler = TwinHandler;
});
