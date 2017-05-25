define(["require", "exports"], function (require, exports) {
    "use strict";
    var MethodHandler = (function () {
        function MethodHandler(transport) {
            this.topic = {
                post: '$iothub/methods/POST/#',
                response: '$iothub/methods/res/',
                regexr: {
                    post: '\\$iothub/methods/POST/([^/]*)/\\?\\$rid=(\\d+)',
                },
            };
            this.transport = transport;
            this.postSub = {
                topic: this.topic.post,
                topicReg: new RegExp(this.topic.regexr.post),
                qos: 0,
                messageHandler: this._onMethodCalled.bind(this)
            };
            this.registeredMethods = [];
        }
        MethodHandler.prototype.addMethod = function (name, payload, statusCode, delay) {
            if (name in this.registeredMethods) {
                alert('method name already exist!');
                return;
            }
            if (!this.checkMethodPara(payload, statusCode, delay)) {
                return;
            }
            this.registeredMethods[name] = {
                'payload': payload,
                'statusCode': statusCode,
                'delay': delay
            };
            //add ui
        };
        MethodHandler.prototype.initialize = function () {
            this.transport.subscribe(this.postSub);
        };
        MethodHandler.prototype.uninitialize = function () {
            this.transport.unsubscribe(this.postSub);
        };
        MethodHandler.prototype.removeMethod = function (name) {
            delete this.registeredMethods[name];
        };
        MethodHandler.prototype.sendResponse = function (payload, statusCode, rid) {
            var topic = this.topic.response + statusCode + '/?$rid=' + rid;
            var body = payload;
            //alert(websocketclient.publish);
            this.transport.publish(topic, body, 0, false);
            //websocketclient.appendToMethodTerminal('Response sent');
        };
        MethodHandler.prototype._onMethodCalled = function (topic, payload) {
            if (this.onMethodCalled) {
                this.onMethodCalled(topic, payload);
            }
            var reg = new RegExp(this.topic.regexr.post);
            var resultArray = reg.exec(topic);
            if (!resultArray || !resultArray[1] || !resultArray[2]) {
                return;
            }
            var methodName = resultArray[1];
            var rid = resultArray[2];
            if (!(methodName in this.registeredMethods)) {
                //websocketclient.appendToMethodTerminal('server called method '+methodName+' not registered.');
                return;
            }
            var methodObj = this.registeredMethods[methodName];
            //websocketclient.appendToMethodTerminal('Method ' + methodName + ' called.');
            //websocketclient.appendToMethodTerminal('Will return status code:'+methodObj.statusCode+',response:'+methodObj.payload+' in '+methodObj.delay+' ms delay');
            setTimeout(this.sendResponse.bind(this, methodObj.payload, methodObj.statusCode, rid), parseInt(methodObj.delay));
        };
        MethodHandler.prototype.checkMethodPara = function (payload, statusCode, delay) {
            if (isNaN(statusCode) || isNaN(delay)) {
                alert('status code and delay must be integer');
                return false;
            }
            return true;
        };
        return MethodHandler;
    }());
    exports.MethodHandler = MethodHandler;
});
