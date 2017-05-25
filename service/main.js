function init(transport) {
    var defaultConnectionString = localStorage.deviceConnectionString || '';
    localStorage.removeItem('deviceConnectionString');
    var app = new Vue({
        el: '#service',
        data: {
            IotHub: transport.Transport,
            iothub: new transport.Transport(),
            router: 'connectionString',
            iotHubConnectionString: '',
            eventHubName: '',
            eventHubEndpoint: '',
            eventHubConsumerGroup: '$Default',
            showAMQPConnOpts: false,
            showAMQPD2CMsgOpts: false,
            showAMQPC2DMsgOpts: false,
            showAMQPTwinOpts: false,
            amqpIHConnOpts: {},
            amqpEHConnOpts: {},
            connStatusIH: 'disconnected',
            connErrIH: '',
            amqpD2COpts: [],
            c2dMessagePayload: '',
            amqpC2DOpts: '',
            d2cMessages: [],
            c2dMessages: [],
            desiredTwin: {},
            reportedTwin: {},
            newTwin:'',
            unreadD2C:0,
            unreadTwin:0,
            deviceId:'',
            deviceIdTwin:'',
            showTwinMeta:false,
            methodName:'',
            methodPayload:'',
            calledMethods:[],
            deviceIdMethod:'',
        },
        methods: {
            goto: goto,
            connectIH: connectIH,
            sendC2DMessage: sendC2DMessage,
            getTwin: getTwin,
            sendTwin: sendTwin,
            callMethod:callMethod,
        },
        watch: {
            router: function(newRouter) {
                if(newRouter === 'd2cMessages') {
                    this.unreadD2C = 0;
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

function sendC2DMessage() {
    if (this.connStatusIH !== 'connected') {
        alert('Not connected.');
        return;
    }

    if (!this.c2dMessagePayload) {
        alert('No payload found.');
        return;
    }
    if (!this.deviceId) {
        alert('Device Id cannot be empty.');
        return;
    }
    this.c2dMessages.unshift({
        timestamp: new Date().toLocaleTimeString(),
        deviceId: this.deviceId,
        payload: this.c2dMessagePayload,
    });
    this.iothub.send(this.deviceId,this.c2dMessagePayload);
}

function getTwin() {
    if (this.connStatusIH !== 'connected') {
        alert('Not connected.');
        return;
    }
    if(this.deviceIdTwin === '') {
        alert('Please fill in device id');
        return;
    }
    this.iothub.getTwin(this.deviceIdTwin,
        (data,textStatus,jqXHR)=>{
            payload = data.properties;
            this.desiredTwin = mergeObject({'$version':payload.desired['$version']},payload.desired);
            this.reportedTwin = mergeObject({'$version':payload.reported['$version']},payload.reported);
        },
        (jqXHR, textStatus, errorThrown)=>{
            console.log(errorThrown);
            alert('get twin error');
        }
    );
}

function sendTwin() {
    if(this.deviceIdTwin === '') {
        alert('Please fill in device id');
        return;
    }
    if (this.connStatusIH !== 'connected') {
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
    this.iothub.updateDesired(this.deviceIdTwin,this.newTwin,
        (data,textStatus,jqXHR)=>{
            this.desiredTwin = mergeObject(this.desiredTwin,JSON.parse(this.newTwin));
            this.newTwin = '';
            if('deviceTwin' !== this.router) {
                this.unreadTwin++;
            }
        },
        (jqXHR, textStatus, errorThrown)=>{
            console.log(errorThrown);
            alert('update twin error');
        }
    );
}

function callMethod() {
    if (this.connStatusIH !== 'connected') {
        alert('Not connected.');
        return;
    }
    if (!this.methodName) {
        alert('method name cannot be empty');
        return;
    }
    if(this.deviceIdMethod === '') {
        alert('Please fill in device id');
        return;
    }
    if(this.calledMethods.some((m)=>{ return m.pending})) {
        alert('some method calls are pending');
        return;
    }
    this.calledMethods.unshift({
        timestamp: new Date().toLocaleTimeString(),
        name:this.methodName,
        req_payload:this.methodPayload,
        pending:true,
    });
    this.iothub.callMethod(this.deviceIdMethod,this.methodName,this.methodPayload,60,
        (data,textStatus,jqXHR)=>{
            var m = this.calledMethods.find((m)=>{ return m.pending});
            Vue.set(m,'pending',false);
            Vue.set(m,'code',data.status);
            Vue.set(m,'res_payload',(data.payload ? JSON.stringify(data.payload) : ' '));
            Vue.set(m,'error',false);
        },
        (jqXHR, textStatus, errorThrown)=>{
            if(jqXHR.status === 404) {
                alert('device connect timeout');
            }else {
                alert(errorThrown);
            }
            var m = this.calledMethods.find((m)=>{ return m.pending});
            Vue.set(m,'pending',false);
            Vue.set(m,'code',jqXHR.status);
            Vue.set(m,'res_payload',errorThrown);
            Vue.set(m,'error',true);
        }
    );
    
}

function mergeObject(a,b) {
    for(p in b) {
        a[p] = b[p];
    }
    return a;
}

function connectIH() {
    var scope = this;

    if (this.connStatusIH !== 'disconnected') {
        this.iothub.disconnectIH();
        this.iothub.disconnectEH();
        this.connStatusIH = 'disconnected';
        this.deviceId = '';
        this.deviceIdTwin='';
        this.methodName='';
        this.methodPayload='';
        this.calledMethods=[];
        this.deviceIdMethod='';
        this.d2cMessages = [];
        this.c2dMessages = [];
        this.amqpIHConnOpts = {};
        this.amqpEHConnOpts = {};
        return;
    }

    if(!this.iothub.initializeIH(this.iotHubConnectionString,this.eventHubConsumerGroup)) {
        return;
    }

    var account = this.iotHubConnectionString.match(/^\s*HostName=(.*?)\./)[1];
    appInsights.trackEvent('serviceConnect', {account: account});
    
    this.connStatusIH = 'connecting';
    this.connErrIH = '';
    
    this.iothub.onConnectionCloseIH = function(err) {
        console.log('on connection closed');
        scope.amqpIHConnOpts = {};
        scope.amqpC2DOpts = {};
        scope.c2dMessages = [];
        scope.desiredTwin = {};
        scope.reportedTwin = {};
        scope.connStatusIH = 'disconnected';
        if (err && err.errorCode > 0) {
            scope.connErrIH = err.errorMessage;
        }
    }

    this.iothub.onMessage = function(deviceId,payload,properties) {
        scope.d2cMessages.unshift({
            timestamp: new Date().toLocaleTimeString(),
            payload: payload,
            deviceId: deviceId,
            properties: properties
        });
        if('d2cMessages' !== scope.router) {
            scope.unreadD2C++;
        }
    }
 
    this.iothub.onReadyToSend = ()=>{
        this.amqpC2DOpts = this.iothub.ihTopic;
    }
    this.iothub.connectIH(()=>{
        this.amqpIHConnOpts = this.iothub.optionsIH;
        this.amqpEHConnOpts = this.iothub.optionsEH;
        scope.connStatusIH = 'connected';
    },()=>{
        scope.connStatusIH = 'disconnected';
    });

}

jQuery(document).ready(function() {
    requirejs(['transport'], init);
});