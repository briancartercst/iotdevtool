define(["require", "exports", './util'], function (require, exports, util_1) {
    var Transport = (function () {
        function Transport() {
        }
        Transport.prototype.initializeIH = function (iotHubConnectionString, ehCG) {
            var matches = RegExp('HostName=(.*)\\.azure-devices\\.net;SharedAccessKeyName=(.*);SharedAccessKey=(.*)').exec(iotHubConnectionString);
            if (!matches || !matches[1] || !matches[2] || !matches[3]) {
                alert('invalid iot hub connection string');
                return false;
            }
            this.iHAccount = matches[1];
            this.sharedAccessKeyName = matches[2];
            this.sharedAccessKey = matches[3];
            this.optionsIH = {
                "hostname": this.iHAccount + ".azure-devices.net",
                "container_id": "conn" + new Date().getTime(),
                "max_frame_size": 4294967295,
                "channel_max": 65535,
                "idle_timeout": 120000,
                "outgoing_locales": 'en-US',
                "incoming_locales": 'en-US',
                "offered_capabilities": null,
                "desired_capabilities": null,
                "properties": {},
                "connection_details": null,
                "reconnect": false,
                "username": this.sharedAccessKeyName + '@sas.root.' + this.iHAccount,
                "password": util_1.Util.getSASToken(this.iHAccount, this.sharedAccessKey, this.sharedAccessKeyName),
                "onSuccess": null,
                "onFailure": null,
            };
            this.sendable = false;
            this.ihTopic = '/messages/devicebound';
            var Container = window.require('rhea');
            this.clientIH = new Container();
            this.initializedIH = true;
            this.ehCG = ehCG;
            return true;
        };
        Transport.prototype.initializeEH = function (eventHubEndPoint, eventHubName, eventHubConsumerGroup, messageTimeOffset) {
            if (messageTimeOffset === void 0) { messageTimeOffset = 0; }
            var matches = RegExp('sb://(.*)/').exec(eventHubEndPoint);
            if (!matches || !matches[1]) {
                alert('invalid event hub endpoint');
                return false;
            }
            this.ehHost = matches[1];
            if (!eventHubName) {
                alert('invalid event hub name');
                return false;
            }
            if (!eventHubConsumerGroup) {
                alert('invalid event hub consumer group');
                return false;
            }
            this.optionsEH = {
                "hostname": this.ehHost,
                "container_id": "conn" + new Date().getTime(),
                "max_frame_size": 4294967295,
                "channel_max": 65535,
                "idle_timeout": 120000,
                "outgoing_locales": 'en-US',
                "incoming_locales": 'en-US',
                "offered_capabilities": null,
                "desired_capabilities": null,
                "properties": {},
                "connection_details": null,
                "reconnect": false,
                "username": this.sharedAccessKeyName,
                "password": this.sharedAccessKey,
                "onSuccess": null,
                "onFailure": null,
            };
            this.messageTimeOffset = messageTimeOffset;
            this.remainingOpenReceiver = 3;
            this.ehPath = eventHubName;
            this.ehCG = eventHubConsumerGroup;
            this.ehTopics = new Array();
            var Container = window.require('rhea');
            this.clientEH = new Container();
            this.initializedEH = true;
            return true;
        };
        Transport.prototype.connectIH = function (success, fail) {
            var _this = this;
            if (!this.initializedIH) {
                console.log('not initialized');
                return;
            }
            var wsIH = this.clientIH.websocket_connect(WebSocket);
            this.optionsIH.connection_details = wsIH("wss://" + this.iHAccount + ".azure-devices.net:443/$servicebus/websocket?iothub-no-client-cert=true", ["AMQPWSB10"]);
            this.clientIH.on('connection_open', function (context) {
                _this.messageSender = _this.connectionIH.open_sender(_this.ihTopic);
                _this.connectionIH.open_receiver('messages/events/');
            });
            this.clientIH.on('connection_error', function (context) {
                if (fail)
                    fail();
            });
            this.clientIH.on('connection_close', function (context) {
                if (_this.onConnectionCloseIH)
                    _this.onConnectionCloseIH();
            });
            this.clientIH.on('sendable', function (context) {
                _this.sendable = true;
                if (context.sender.local.attach.target.value[0].value === _this.ihTopic && _this.onReadyToSend)
                    _this.onReadyToSend();
            });
            this.clientIH.on("message", function (context) {
                console.log('onmessage called should not use!!');
            });
            this.clientIH.on("error", function (context) {
                // Use error handle to catch event hub infos
                if (context.condition === 'amqp:link:redirect' && context.link.error.info) {
                    _this.initializeEH('sb://' + context.link.error.info.hostname + '/', new RegExp('5671/(.*)/').exec(context.link.error.info.address)[1], _this.ehCG);
                    _this.connectEH(success, fail);
                }
            });
            this.connectionIH = this.clientIH.connect(this.optionsIH);
        };
        Transport.prototype.connectEH = function (success, fail) {
            var _this = this;
            if (!this.initializedEH) {
                console.log('not initialized');
                return;
            }
            var wsEH = this.clientEH.websocket_connect(WebSocket);
            this.optionsEH.connection_details = wsEH("wss://" + this.ehHost + ":443/$servicebus/websocket", ["AMQPWSB10"]);
            this.clientEH.on('connection_open', function (context) {
                if (success) {
                    success();
                }
                _this.ehTopics.push('$management');
                _this.managementSender = _this.connectionEH.open_sender('$management');
                _this.connectionEH.open_receiver('$management');
            });
            this.clientEH.on('connection_error', function (context) {
                if (fail)
                    fail();
            });
            this.clientEH.on('connection_close', function (context) {
                if (_this.onConnectionCloseEH)
                    _this.onConnectionCloseEH();
            });
            this.clientEH.on('sendable', function (context) {
                console.log('on sendable!!!');
                context.sender.send({
                    body: _this.clientEH.message.data_section(util_1.Util.str2ab('[]')),
                    application_properties: {
                        operation: 'READ',
                        name: _this.ehPath,
                        type: 'com.microsoft:eventhub'
                    }
                });
            });
            this.clientEH.on('receiver_open', function (context) {
                _this.remainingOpenReceiver--;
                if (_this.remainingOpenReceiver === 0 && _this.onReadyToReceive) {
                    _this.onReadyToReceive();
                }
            });
            this.clientEH.on("message", function (context) {
                console.log('onmessage called!!');
                if (context.receiver.source.address === '$management') {
                    var p = context.message.body;
                    _this.partitionCount = p.partition_count;
                    _this.remainingOpenReceiver += (_this.partitionCount - 2);
                    _this.partitionIds = p.partition_ids;
                    _this.partitionIds.forEach(function (pid) {
                        _this.ehTopics.push('/' + _this.ehPath + '/ConsumerGroups/' + _this.ehCG + '/Partitions/' + pid);
                        _this.connectionEH.open_receiver({
                            source: {
                                address: '/' + _this.ehPath + '/ConsumerGroups/' + _this.ehCG + '/Partitions/' + pid,
                                filter: _this.clientEH.filter.selector("amqp.annotation.x-opt-enqueuedtimeutc > " + (new Date().getTime() + _this.messageTimeOffset).toString())
                            }
                        });
                    }, _this);
                }
                else {
                    if (_this.onMessage)
                        _this.onMessage(context.message.message_annotations['iothub-connection-device-id'], util_1.Util.Utf8ArrayToStr(context.message.body.content),context.message.application_properties);
                }
            });
            this.connectionEH = this.clientEH.connect(this.optionsEH);
        };
        Transport.prototype.disconnectIH = function () {
            this.clientIH.disconnect();
        };
        Transport.prototype.disconnectEH = function () {
            this.clientEH.disconnect();
        };
        Transport.prototype.send = function (deviceId, payload) {
            if (!this.sendable) {
                alert('not ready to send message');
                return false;
            }
            this.messageSender.send({ to: '/devices/' + deviceId + this.ihTopic, body: this.clientIH.message.data_section(util_1.Util.str2ab(payload)) });
        };
        Transport.prototype.updateDesired = function (deviceId, payload, success, fail) {
            if (!this.initializeIH) {
                alert('iot hub not initialized');
                fail();
                return;
            }
            var jsonPayload = {
                properties: {
                    desired: JSON.parse(payload)
                }
            };
            util_1.Util.restAPI(this.iHAccount, this.sharedAccessKey, this.sharedAccessKeyName, 'PATCH', '/twins/' + deviceId, { 'Content-Type': 'application/json' }, JSON.stringify(jsonPayload), success, fail);
        };
        Transport.prototype.getTwin = function (deviceId, success, fail) {
            if (!this.initializeIH) {
                alert('iot hub not initialized');
                fail();
                return;
            }
            util_1.Util.restAPI(this.iHAccount, this.sharedAccessKey, this.sharedAccessKeyName, 'GET', '/twins/' + deviceId, null, null, success, fail);
        };
        Transport.prototype.callMethod = function (deviceId, methodName, methodPayload, timeout, success, fail) {
            if (!this.initializeIH) {
                alert('iot hub not initialized');
                fail();
                return;
            }
            var jsonPayload = {
                methodName: methodName,
                payload: methodPayload,
                timeoutInSeconds: timeout,
            };
            util_1.Util.restAPI(this.iHAccount, this.sharedAccessKey, this.sharedAccessKeyName, 'POST', '/twins/' + deviceId + '/methods', { 'Content-Type': 'application/json' }, JSON.stringify(jsonPayload), success, fail);
        };
        return Transport;
    })();
    exports.Transport = Transport;
});
