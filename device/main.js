function init(iothub) {
    var defaultConnectionString = localStorage.deviceConnectionString || '';
    localStorage.removeItem('deviceConnectionString');
    var app = new Vue({
        el: '#iothub',
        data: {
            IotHub: iothub.Main,
            iothub: null,
            router: 'connectionString',
            connectionString: defaultConnectionString,
            showMQTTConnOpts: false,
            showMQTTD2CMsgOpts: false,
            showMQTTC2DMsgOpts: false,
            showMQTTMethodOpts: false,
            showMQTTTwinOpts: false,
            showAddNewMethod: false,
            newMethodObj: {
                name: '',
                payload: '',
                code: 200,
                delay: 0
            },
            mqttConnOpts: {},
            connStatus: 'disconnected',
            connErr: '',
            mqttD2COpts: {},
            d2cMessagePayload: '',
            mqttC2DOpts: {},
            d2cMessages: [],
            c2dMessages: [],
            directMethods: [],
            calledMethods: [],
            desiredTwin: {},
            reportedTwin: {},
            newTwin:'',
            unreadC2D:0,
            unreadMethod:0,
            unreadTwin:0,
        },
        methods: {
            goto: goto,
            addNewMethod: addNewMethod,
            saveNewMethod: saveNewMethod,
            cancelNewMethod: cancelNewMethod,
            connect: connect,
            sendD2CMessage: sendD2CMessage,
            getTwin: getTwin,
            sendTwin: sendTwin,
        },
        watch: {
            router: function(newRouter) {
                if(newRouter === 'c2dMessages') {
                    this.unreadC2D = 0;
                }else if(newRouter === 'directMethods') {
                    this.unreadMethod = 0;
                }else if(newRouter === 'deviceTwin') {
                    this.unreadTwin = 0;
                }
            }
        }
    });
}

function goto(view) {
    this.router = view;
}

function addNewMethod() {
    this.newMethodObj = {
        name: '',
        payload: '',
        code: 200,
        delay: 0
    };
    this.showAddNewMethod = true;
}

function saveNewMethod() {
    try {
        if(this.newMethodObj.payload !== '') JSON.parse(this.newMethodObj.payload);
    } catch(e) {
        alert('Direct method payload must by JSON string.');
        return;
    }
    this.directMethods.push(this.newMethodObj);
    this.iothub.methodHandler.addMethod(this.newMethodObj.name, this.newMethodObj.payload, this.newMethodObj.code, this.newMethodObj.delay);
    this.showAddNewMethod = false;
}

function cancelNewMethod() {
    this.showAddNewMethod = false;
}

function sendD2CMessage() {
    if (this.connStatus !== 'connected') {
        alert('Not connected.');
        return;
    }

    if (!this.d2cMessagePayload) {
        alert('No payload found.');
        return;
    }
    this.d2cMessages.unshift({
        timestamp: new Date().toLocaleTimeString(),
        payload: this.d2cMessagePayload,
    });
    this.iothub.messageHandler.sendMessage(this.mqttD2COpts.topic, this.d2cMessagePayload, 0, false);
}

function getTwin() {
    this.iothub.twinHandler.getTwin(onGetTwinResponse.bind(this));
}

function sendTwin() {
    if (this.connStatus !== 'connected') {
        alert('Not connected.');
        return;
    }

    try{
        var twinJson = JSON.parse(this.newTwin);
    }
    catch(e){
        alert('Twin must be json format.');
        return;
    }
    this.iothub.twinHandler.updateReported(this.newTwin,onSendTwinResponse.bind(this,twinJson));
}

function onGetTwinResponse(topic,payload) {
    payload = JSON.parse(payload);
    this.desiredTwin = mergeObject({'$version':payload.desired['$version']},payload.desired);
    this.reportedTwin = mergeObject({'$version':payload.reported['$version']},payload.reported);
}

function onSendTwinResponse(twinJson) {
    this.reportedTwin = mergeObject(this.reportedTwin,twinJson);
    this.newTwin = '';
    if('deviceTwin' !== this.router) {
        this.unreadTwin++;
    }
}

function onDesiredTwinUpdate(topic,payload) {
    payload = JSON.parse(payload);
    this.desiredTwin = mergeObject(this.desiredTwin,payload);
    if('deviceTwin' !== this.router) {
        this.unreadTwin++;
    }
}

function mergeObject(a,b) {
    for(p in b) {
        a[p] = b[p];
    }
    return a;
}

function connect() {
    var scope = this;

    if (this.connStatus !== 'disconnected') {
        this.iothub.disconnect();
        //this.connStatus = 'disconnected';
        return;
    }

    if (!/^\s*HostName=.*?;DeviceId=.*?;SharedAccessKey=.*?/.test(this.connectionString)) {
        alert('Invalid Device Connection String. Device Connection String must be in format HostName=xxx;DeviceId=xxx;SharedAccessKey=xxx.');
        return;
    }

    var account = this.connectionString.match(/^\s*HostName=(.*?)\./)[1];
    appInsights.trackEvent('deviceConnect', {account: account});
    
    this.connStatus = 'connecting';
    this.connErr = '';
    this.iothub = new this.IotHub(this.connectionString, 60);
    this.mqttConnOpts = this.iothub.transport.getOptions();
    this.iothub.onConnected = function() {
        scope.mqttD2COpts = {
            topic: 'devices/' + scope.mqttConnOpts.clientId + '/messages/events/',
            qos: 0,
        }
        scope.mqttC2DOpts = {
            topic: 'devices/' + scope.mqttConnOpts.clientId + '/messages/devicebound/#',
            qos: 0,
        }
        scope.connStatus = 'connected';
        setTimeout(scope.getTwin,1000);
        scope.iothub.twinHandler.onDesiredTwinUpdate = onDesiredTwinUpdate.bind(scope);
    }
    this.iothub.onDisconnected = function(err) {
        scope.mqttConnOpts = {};
        scope.mqttD2COpts = {};
        scope.mqttC2DOpts = {};
        scope.d2cMessages = [];
        scope.c2dMessages = [];
        scope.desiredTwin = {};
        scope.reportedTwin = {};
        scope.d2cMessagePayload = '';
        scope.connStatus = 'disconnected';
        if (err && err.errorCode > 0) {
            scope.connErr = err.errorMessage;
        }
    }

    this.iothub.methodHandler.onMethodCalled = function(topic, payload) {
        var methodName = topic.match(/\$iothub\/methods\/POST\/([^\/]*)\/\?\$rid=(\d+)/)[1];
        scope.calledMethods.unshift({
            timestamp: new Date().toLocaleTimeString(),
            name: methodName,
            payload: payload.replace(/^"|"$/g, ''),
        });
        if('directMethods' !== scope.router) {
            scope.unreadMethod++;
        }
    }

    this.iothub.messageHandler.onMessageArrived = function(topic, payload, messageObj) {
        scope.c2dMessages.unshift({
            timestamp: new Date(messageObj.timestamp).toLocaleTimeString(),
            payload: payload,
        });
        if('c2dMessages' !== scope.router) {
            scope.unreadC2D++;
        }
    }
    this.iothub.connect();
}

jQuery(document).ready(function() {
    require(['app'], init);
});