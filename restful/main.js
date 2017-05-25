function init() {
    var app = new Vue({
        el: '#iothub',
        data: {
            router: 'deviceAPI',
            deviceAPIConnectionString: '',
            deviceAPIAccount: '',
            deviceAPIKeyName: '',
            deviceAPIKey: '',
            deviceAPIName: 'bulkDeviceOperation',
            currentDeviceAPIObj: {},
            deviceAPIResponse: {},
            deviceAPIObj: {
                bulkDeviceOperation: {
                    path: '/devices?api-version=2016-11-14',
                    method: 'POST',
                    header: {},
                    body: [{
                        deviceId: '',
                        generationId: '',
                        etag: '',
                        auth: {
                            symkey: {
                                primaryKey: '',
                                secondaryKey: ''
                            }
                        },
                        status: 'Enabled',
                        statusReason: ''
                    }]
                },
                deleteDevice: {
                    path: '/devices/{id}?api-version=2016-11-14',
                    method: 'DELETE',
                    header: {
                        'If-Match': '*'
                    },
                    body: null
                },
                getDevice: {
                    path: '/devices/{id}?api-version=2016-11-14',
                    method: 'GET',
                    header: {},
                    body: null
                },
                getDevices: {
                    path: '/devices?api-version=2016-11-14&top=10',
                    method: 'GET',
                    header: {},
                    body: null
                },
                getRegistryStatistics: {
                    path: '/statistics/devices?api-version=2016-11-14',
                    method: 'GET',
                    header: {},
                    body: null
                },
                getServiceStatistics: {
                    path: '/statistics/service?api-version=2016-11-14',
                    method: 'GET',
                    header: {},
                    body: null
                },
                purgeCommandQueue: {
                    path: '/devices/{id}/commands?api-version=2016-11-14',
                    method: 'DELETE',
                    header: {},
                    body: null
                },
                putDevice: {
                    path: '/devices/{id}?api-version=2016-11-14',
                    method: 'PUT',
                    header: {},
                    body: {
                        deviceId: '',
                        authentication: {
                            symmetricKey: {
                                primaryKey: '',
                                secondaryKey: ''
                            },
                            x509Thumbprint: {
                                primaryThumbprint: '',
                                secondaryThumbprint: ''
                            }
                        }
                    }
                },
                queryDevices: {
                    path: '/devices/query?api-version=2016-11-14',
                    method: 'POST',
                    header: {},
                    body: {
                        query: ''
                    }
                }
            },
            deviceTwinAPIConnectionString: '',
            deviceTwinAPIAccount: '',
            deviceTwinAPIKeyName: '',
            deviceTwinAPIKey: '',
            deviceTwinAPIName: 'getDeviceTwin',
            currentDeviceTwinAPIObj: {},
            deviceTwinAPIResponse: {},
            deviceTwinAPIObj: {
                getDeviceTwin: {
                    path: '/twins/{id}?api-version=2016-11-14',
                    method: 'GET',
                    header: {},
                    body: null
                },
                invokeDeviceMethod: {
                    path: '/twins/{id}/methods?api-version=2016-11-14',
                    method: 'POST',
                    header: {},
                    body: {
                        methodName: '',
                        payload: {},
                        responseTimeoutInSeconds: 30,
                        connectTimeoutInSeconds: 30
                    }
                },
                updateDeviceTwin: {
                    path: '/twins/{id}?api-version=2016-11-14',
                    method: 'PATCH',
                    header: {},
                    body: {
                        properties: {
                            desired: {}
                        }
                    }
                }
            },
            httpRuntimeConnectionString: '',
            httpRuntimeAccount: '',
            httpRuntimeKeyName: '',
            httpRuntimeKey: '',
            httpRuntimeName: 'abandonDeviceBoundNotification',
            currentHttpRuntimeObj: {},
            httpRuntimeResponse: {},
            httpRuntimeObj: {
                abandonDeviceBoundNotification: {
                    path: '/devices/{id}/messages/deviceBound/{etag}/abandon?api-version=2016-11-14',
                    method: 'POST',
                    header: {},
                    body: null
                },
                completeDeviceBoundNotification: {
                    path: '/devices/{id}/messages/deviceBound/{etag}?api-version=2016-11-14[&reject]',
                    method: 'DELETE',
                    header: {},
                    body: null
                },
                createFileUploadSasUri: {
                    path: '/devices/{id}/files?api-version=2016-11-14',
                    method: 'POST',
                    header: {},
                    body: {
                        blobName: ''
                    }
                },
                receiveDeviceBoundNotification: {
                    path: '/devices/{id}/messages/deviceBound?api-version=2016-11-14',
                    method: 'GET',
                    header: {},
                    body: null
                },
                sendDeviceEvent: {
                    path: '/devices/{id}/messages/events?api-version=2016-11-14',
                    method: 'POST',
                    header: {},
                    body: 'anything to send'
                },
                updateFileUploadStatus: {
                    path: '/devices/{id}/files/notifications?api-version=2016-11-14',
                    method: 'POST',
                    header: {},
                    body: {
                        correlationId: '',
                        isSuccess: true,
                        statusCode: 200,
                        statusDescription: ''
                    }
                }
            }
        },
        methods: {
            goto: goto,
            getSASToken: getSASToken,
            updateDeviceAPObj: updateDeviceAPObj,
            applyDeviceAPIConnectionString: applyDeviceAPIConnectionString,
            sendDeviceAPIRequest: sendDeviceAPIRequest,
            updateDeviceTwinAPIObj: updateDeviceTwinAPIObj,
            applyDeviceTwinAPIConnectionString: applyDeviceTwinAPIConnectionString,
            sendDeviceTwinAPIRequest: sendDeviceTwinAPIRequest,
            updateHttpRuntimeObj: updateHttpRuntimeObj,
            applyHttpRuntimeConnectionString: applyHttpRuntimeConnectionString,
            sendHttpRuntimeRequest: sendHttpRuntimeRequest,
        },
        created: function () {
            this.updateDeviceAPObj();
            this.updateDeviceTwinAPIObj();
            this.updateHttpRuntimeObj();
        },
    });
}

function goto(view) {
    this.router = view;
}

function getUUID() {
    var uuid = localStorage.getItem("uuid");
    if (uuid === null) {
        uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        }); // RFC4122 version 4 compatible solution
        localStorage.setItem("uuid", uuid);
    }
    return uuid;
};

function callAPI(account, path, method, header, body, callback) {
    var url = 'https://' + WEBSITE_HOSTNAME + '/rest/' + account + path;
    header['x-user-guid'] = getUUID();
    $.ajax({
        url: url,
        type: method,
        headers: header,
        data: body
    }).done(function (data, textStatus, xhr) {
        callback(xhr, true, data);
    }).fail(function (xhr, textStatus, errorThrown) {
        callback(xhr, false, errorThrown);
    });
}

function encodeUriComponentStrict(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}

function updateDeviceAPObj() {
    this.currentDeviceAPIObj.host = 'https://' + this.deviceAPIAccount + '.azure-devices.net';
    this.currentDeviceAPIObj.method = this.deviceAPIObj[this.deviceAPIName].method;
    this.currentDeviceAPIObj.path = this.deviceAPIObj[this.deviceAPIName].path;

    var body, header = {};
    for (var key in this.deviceAPIObj[this.deviceAPIName].header) {
        header[key] = this.deviceAPIObj[this.deviceAPIName].header[key];
    }
    header.Authorization = this.getSASToken(this.deviceAPIAccount, this.deviceAPIKeyName, this.deviceAPIKey);
    if (this.deviceAPIObj[this.deviceAPIName].body) {
        header['Content-Type'] = 'application/json';
        if (Array.isArray(this.deviceAPIObj[this.deviceAPIName].body)) {
            body = [];
            for (var i in this.deviceAPIObj[this.deviceAPIName].body) {
                var item = {};
                for (var key in this.deviceAPIObj[this.deviceAPIName].body[i]) {
                    item[key] = this.deviceAPIObj[this.deviceAPIName].body[i][key];
                }
                body.push(item);
            }
        } else {
            body = {};
            for (var key in this.deviceAPIObj[this.deviceAPIName].body) {
                body[key] = this.deviceAPIObj[this.deviceAPIName].body[key];
            }
        }
    }
    this.currentDeviceAPIObj.header = JSON.stringify(header, null, 4);
    this.currentDeviceAPIObj.body = this.deviceAPIObj[this.deviceAPIName].body ? JSON.stringify(body, null, 4) : '';
    this.deviceAPIResponse = {};
}

function updateDeviceTwinAPIObj() {
    this.currentDeviceTwinAPIObj.host = 'https://' + this.deviceTwinAPIAccount + '.azure-devices.net';
    this.currentDeviceTwinAPIObj.method = this.deviceTwinAPIObj[this.deviceTwinAPIName].method;
    this.currentDeviceTwinAPIObj.path = this.deviceTwinAPIObj[this.deviceTwinAPIName].path;

    var body, header = {};
    for (var key in this.deviceTwinAPIObj[this.deviceTwinAPIName].header) {
        header[key] = this.deviceTwinAPIObj[this.deviceTwinAPIName].header[key];
    }
    header.Authorization = this.getSASToken(this.deviceTwinAPIAccount, this.deviceTwinAPIKeyName, this.deviceTwinAPIKey);
    if (this.deviceTwinAPIObj[this.deviceTwinAPIName].body) {
        header['Content-Type'] = 'application/json';
        if (Array.isArray(this.deviceTwinAPIObj[this.deviceTwinAPIName].body)) {
            body = [];
            for (var i in this.deviceTwinAPIObj[this.deviceTwinAPIName].body) {
                var item = {};
                for (var key in this.deviceTwinAPIObj[this.deviceTwinAPIName].body[i]) {
                    item[key] = this.deviceTwinAPIObj[this.deviceTwinAPIName].body[i][key];
                }
                body.push(item);
            }
        } else {
            body = {};
            for (var key in this.deviceTwinAPIObj[this.deviceTwinAPIName].body) {
                body[key] = this.deviceTwinAPIObj[this.deviceTwinAPIName].body[key];
            }
        }
    }
    this.currentDeviceTwinAPIObj.header = JSON.stringify(header, null, 4);
    this.currentDeviceTwinAPIObj.body = this.deviceTwinAPIObj[this.deviceTwinAPIName].body ? JSON.stringify(body, null, 4) : '';
    this.deviceTwinAPIResponse = {};
}

function updateHttpRuntimeObj() {
    this.currentHttpRuntimeObj.host = 'https://' + this.httpRuntimeAccount + '.azure-devices.net';
    this.currentHttpRuntimeObj.method = this.httpRuntimeObj[this.httpRuntimeName].method;
    this.currentHttpRuntimeObj.path = this.httpRuntimeObj[this.httpRuntimeName].path;

    var body, header = {};
    for (var key in this.httpRuntimeObj[this.httpRuntimeName].header) {
        header[key] = this.httpRuntimeObj[this.httpRuntimeName].header[key];
    }
    header.Authorization = this.getSASToken(this.httpRuntimeAccount, this.httpRuntimeKeyName, this.httpRuntimeKey);
    if (this.httpRuntimeObj[this.httpRuntimeName].body) {
        if (typeof this.httpRuntimeObj[this.httpRuntimeName].body === 'object') {
            header['Content-Type'] = 'application/json';
            if (Array.isArray(this.httpRuntimeObj[this.httpRuntimeName].body)) {
                body = [];
                for (var i in this.httpRuntimeObj[this.httpRuntimeName].body) {
                    var item = {};
                    for (var key in this.httpRuntimeObj[this.httpRuntimeName].body[i]) {
                        item[key] = this.httpRuntimeObj[this.httpRuntimeName].body[i][key];
                    }
                    body.push(item);
                }
            } else {
                body = {};
                for (var key in this.httpRuntimeObj[this.httpRuntimeName].body) {
                    body[key] = this.httpRuntimeObj[this.httpRuntimeName].body[key];
                }
            }
        } else {
            body = this.httpRuntimeObj[this.httpRuntimeName].body;
        }
    }
    this.currentHttpRuntimeObj.header = JSON.stringify(header, null, 4);
    this.currentHttpRuntimeObj.body = this.httpRuntimeObj[this.httpRuntimeName].body ?
        (typeof body === 'object' ? JSON.stringify(body, null, 4) : body) : '';
    this.httpRuntimeResponse = {};
}

function getConnectionObject(connectionString) {
    if (!/^\s*HostName=(.*?)\.azure\-devices\.net;SharedAccessKeyName=(.*?);SharedAccessKey=(.*?)\s*$/.test(connectionString)) {
        return null;
    } else {
        var matches = connectionString.match(/^\s*HostName=(.*?)\.azure\-devices\.net;SharedAccessKeyName=(.*?);SharedAccessKey=(.*?)\s*$/);
        return {
            account: matches[1],
            keyName: matches[2],
            key: matches[3],
        }
    }
}

function applyDeviceAPIConnectionString() {
    if (this.deviceAPIAccount) {
        this.deviceAPIAccount = '';
        this.deviceAPIResponse = {};
        return;
    }

    var connectionObject = getConnectionObject(this.deviceAPIConnectionString);

    if (!connectionObject) {
        alert('Invalid IoT Hub connection string. Valid IoT Hub connection string is in format HostName=xxx.azure-devices.net;SharedAccessKeyName=xxx;SharedAccessKey=xxx');
        return;
    }

    appInsights.trackEvent('restfulApply', { account: connectionObject.account, api: 'device' });

    this.deviceAPIAccount = connectionObject.account;
    this.deviceAPIKeyName = connectionObject.keyName;
    this.deviceAPIKey = connectionObject.key;
    this.updateDeviceAPObj();
}

function applyDeviceTwinAPIConnectionString() {
    if (this.deviceTwinAPIAccount) {
        this.deviceTwinAPIAccount = '';
        this.deviceTwinAPIResponse = {};
        return;
    }


    var connectionObject = getConnectionObject(this.deviceTwinAPIConnectionString);

    if (!connectionObject) {
        alert('Invalid IoT Hub connection string. Valid IoT Hub connection string is in format HostName=xxx.azure-devices.net;SharedAccessKeyName=xxx;SharedAccessKey=xxx');
        return;
    }

    appInsights.trackEvent('restfulApply', { account: connectionObject.account, api: 'deviceTwin' });

    this.deviceTwinAPIAccount = connectionObject.account;
    this.deviceTwinAPIKeyName = connectionObject.keyName;
    this.deviceTwinAPIKey = connectionObject.key;
    this.updateDeviceTwinAPIObj();
}

function applyHttpRuntimeConnectionString() {
    if (this.httpRuntimeAccount) {
        this.httpRuntimeAccount = '';
        this.httpRuntimeResponse = {};
        return;
    }


    var connectionObject = getConnectionObject(this.httpRuntimeConnectionString);

    if (!connectionObject) {
        alert('Invalid IoT Hub connection string. Valid IoT Hub connection string is in format HostName=xxx.azure-devices.net;SharedAccessKeyName=xxx;SharedAccessKey=xxx');
        return;
    }

    appInsights.trackEvent('restfulApply', { account: connectionObject.account, api: 'httpRuntime' });

    this.httpRuntimeAccount = connectionObject.account;
    this.httpRuntimeKeyName = connectionObject.keyName;
    this.httpRuntimeKey = connectionObject.key;
    this.updateHttpRuntimeObj();
}

function getSASToken(account, keyname, key) {
    var sr = account + '.azure-devices.net';
    var se = Math.round(new Date().getTime() / 1000) + 60;
    var stringtosign = sr + '\n' + se;
    var sig = encodeUriComponentStrict(CryptoJS.HmacSHA256(stringtosign, CryptoJS.enc.Base64.parse(key)).toString(CryptoJS.enc.Base64));
    return 'SharedAccessSignature sr=' + sr + '&sig=' + sig + '&se=' + se + '&skn=' + keyname;
}

function sendDeviceAPIRequest() {
    var scope = this;
    try {
        var header = JSON.parse(this.currentDeviceAPIObj.header);
    } catch (e) {
        alert('Request header is not valid JSON string');
        return;
    }

    try {
        var body = this.currentDeviceAPIObj.body ? JSON.stringify(JSON.parse(this.currentDeviceAPIObj.body)) : null;
    } catch (e) {
        alert('Request body is not valid JSON string');
        return;
    }

    this.deviceAPIResponse = {};
    callAPI(this.deviceAPIAccount, this.currentDeviceAPIObj.path, this.currentDeviceAPIObj.method, header, body, function (xhr, success, data) {
        scope.$set(scope.deviceAPIResponse, 'status', xhr.status);
        scope.$set(scope.deviceAPIResponse, 'body', typeof data === 'object' ? JSON.stringify(data, null, 4) : data);
    });
}

function sendDeviceTwinAPIRequest() {
    var scope = this;
    try {
        var header = JSON.parse(this.currentDeviceTwinAPIObj.header);
    } catch (e) {
        alert('Request header is not valid JSON string');
        return;
    }

    try {
        var body = this.currentDeviceTwinAPIObj.body ? JSON.stringify(JSON.parse(this.currentDeviceTwinAPIObj.body)) : null;
    } catch (e) {
        alert('Request body is not valid JSON string');
        return;
    }

    this.deviceTwinAPIResponse = {};
    callAPI(this.deviceTwinAPIAccount, this.currentDeviceTwinAPIObj.path, this.currentDeviceTwinAPIObj.method, header, body, function (xhr, success, data) {
        scope.$set(scope.deviceTwinAPIResponse, 'status', xhr.status);
        scope.$set(scope.deviceTwinAPIResponse, 'body', typeof data === 'object' ? JSON.stringify(data, null, 4) : data);
    });
}

function sendHttpRuntimeRequest() {
    var scope = this;
    try {
        var header = JSON.parse(this.currentHttpRuntimeObj.header);
    } catch (e) {
        alert('Request header is not valid JSON string');
        return;
    }

    try {
        var body = this.currentHttpRuntimeObj.body ? JSON.stringify(JSON.parse(this.currentHttpRuntimeObj.body)) : null;
    } catch (e) {
        var body = this.currentHttpRuntimeObj.body;
    }

    this.httpRuntimeResponse = {};
    callAPI(this.httpRuntimeAccount, this.currentHttpRuntimeObj.path, this.currentHttpRuntimeObj.method, header, body, function (xhr, success, data) {
        scope.$set(scope.httpRuntimeResponse, 'status', xhr.status);
        scope.$set(scope.httpRuntimeResponse, 'body', typeof data === 'object' ? JSON.stringify(data, null, 4) : data);
    });
}

jQuery(document).ready(init);