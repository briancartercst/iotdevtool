define(["require", "exports", "./transport", "./messageHandler", "./twinHandler", "./methodHandler"], function (require, exports, transport_1, messageHandler_1, twinHandler_1, methodHandler_1) {
    "use strict";
    var Main = (function () {
        function Main(connectionString, keepAlive) {
            this.transport = new transport_1.Transport(connectionString, keepAlive);
            this.messageHandler = new messageHandler_1.MessageHandler(this.transport);
            this.twinHandler = new twinHandler_1.TwinHandler(this.transport);
            this.methodHandler = new methodHandler_1.MethodHandler(this.transport);
        }
        Main.prototype.connect = function () {
            var _this = this;
            this.transport.connect(function () {
                _this.messageHandler.initialize();
                _this.twinHandler.initialize();
                _this.methodHandler.initialize();
                _this.onConnected();
            }, this.onDisconnected);
        };
        Main.prototype.disconnect = function () {
            this.messageHandler.uninitialize();
            this.twinHandler.uninitialize();
            this.methodHandler.uninitialize();
            this.transport.disconnect();
        };
        return Main;
    }());
    exports.Main = Main;
});
