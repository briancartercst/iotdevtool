function init() {
    var app = new Vue({
        el: '#iothub',
        data: {
            router: 'connectionString',
            connectionString: '',
            connectionInfo: {},
            showAddNewDevice: false,
            newDeviceID: '',
            currentDevice: '',
            devices: [],
            selectedDevice: {},
            showSASToken: false,
            saskey: '',
            sasttl: '',
            sasToken: '',
        },
        methods: {
            goto: goto,
            addNewDevice: addNewDevice,
            saveNewDevice: saveNewDevice,
            cancelNewDevice: cancelNewDevice,
            getDeviceList: getDeviceList,
            deleteDevice: deleteDevice,
            deviceInfo: deviceInfo,
            dateFormat: dateFormat,
            generateSASToken: generateSASToken,
            connectToDevice: connectToDevice,
        },
    });
}

function goto(view) {
    this.router = view;
}

function addNewDevice() {
    if (!this.connectionInfo.account) {
        alert('Invalid IoT Hub connection string.');
        return;
    }
    this.newDeviceID = '';
    this.showAddNewDevice = true;
}

function saveNewDevice() {
    if (/^\s*$/.test(this.newDeviceID)) {
        this.showAddNewDevice = false;
        return;
    }
    var body = {
        deviceId: this.newDeviceID
    };
    body = JSON.stringify(body);
    var header = {
        'Content-Type': 'application/json'
    };

    var scope = this;

    callAPI(this.connectionInfo, '/devices/' + this.newDeviceID + '?api-version=2016-11-14', 'PUT', header, body, function(status, devices) {
        if (status >= 400) {
            alert(devices);
            return;
        }
        scope.getDeviceList(true).bind(scope);
    });
    this.showAddNewDevice = false;
}

function cancelNewDevice() {
    this.showAddNewDevice = false;
}

function getInfoFromConnectionString(connectionString) {
    var matches = connectionString.match(/^\s*HostName=(.*?)\.azure\-devices\.net;SharedAccessKeyName=(.*?);SharedAccessKey=(.*?)\s*$/);
    return {
        account: matches[1],
        username: matches[2],
        key: matches[3],
    };
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

function callAPI(connectionInfo, path, method, header, body, callback) {
    var url = 'https://' + WEBSITE_HOSTNAME + '/rest/' + connectionInfo.account + path;
    if (typeof header === 'function') {
        callback = header;
        header = {};
    }
    if (typeof header === 'string') {
        body = header;
        header = {};
    }
    if (typeof body === 'function') {
        callback = body;
        body = null;
    }
    header = header || {};
    header['x-user-guid'] = getUUID(); // guid
    header.Authorization = getSASToken(connectionInfo);
    $.ajax({
        url: url,
        type: method,
        headers: header,
        data: body
    }).done(function(data, textStatus, xhr){
        callback(xhr.status, data);
    }).fail(function(xhr, textStatus, errorThrown) {
        callback(xhr.status, errorThrown);
    });
}

function encodeUriComponentStrict(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}

function getSASToken(connectionInfo) {
    var account = connectionInfo.account;
    var key = connectionInfo.key;
    var sr = account + '.azure-devices.net';
    var se = Math.round(new Date().getTime() / 1000) + 60;
    var stringtosign = sr + '\n' + se;
    var sig = encodeUriComponentStrict(CryptoJS.HmacSHA256(stringtosign, CryptoJS.enc.Base64.parse(key)).toString(CryptoJS.enc.Base64));
    return 'SharedAccessSignature sr=' + sr + '&sig=' + sig + '&se=' + se + '&skn=' + connectionInfo.username;
}

function getDeviceList(force) {
    var scope = this;
    this.currentDevice = '';
    if (this.lastConnectionString === this.connectionString && !force) {
        return;
    }

    this.devices = [];
    this.connectionInfo = {};
    if (/^\s*$/.test(this.connectionString)) {
        return;
    }
    this.connectionInfo = getInfoFromConnectionString(this.connectionString);
    if (!this.connectionInfo.account) {
        return;
    }

    appInsights.trackEvent('registryConnect', {account: this.connectionInfo.account});
    
    this.lastConnectionString = this.connectionString;
    callAPI(this.connectionInfo, '/devices?api-version=2016-11-14', 'GET', function(status, devices) {
        if (status >= 400) {
            alert(devices);
            return;
        }
        scope.devices = devices;
    });
}

function deleteDevice(deviceId) {
    if (!confirm('Confime to delete device: ' + deviceId + '?')) {
        return;
    }
    var header = {
        'If-Match': '*'
    };

    var scope = this;
    callAPI(this.connectionInfo, '/devices/' + deviceId + '?api-version=2016-11-14&top=20', 'DELETE', header, function(status, devices) {
        if (status >= 400) {
            alert(devices);
            return;
        }
        scope.getDeviceList(true).bind(scope);
    });
}

function deviceInfo(device) {
    this.selectedDevice = device;
    this.saskey = device.authentication.symmetricKey.primaryKey;
    this.sasttl = 3600;
    this.sasToken = '';
    this.goto('deviceDetail');
}

function dateFormat(timeString) {
    var date = new Date(timeString);
    return date.toLocaleString();
}

function getDeviceSASToken(account, deviceId, key, ttl) {
    if (isNaN(ttl) || Number(ttl) < 1) {
        ttl = 3600;
    }
    ttl = Math.floor(ttl);
    var sr = account + '.azure-devices.net/devices/' + deviceId;
    var se = Math.round(new Date().getTime() / 1000) + ttl;
    var stringtosign = sr + '\n' + se;
    var sig = encodeUriComponentStrict(CryptoJS.HmacSHA256(stringtosign, CryptoJS.enc.Base64.parse(key)).toString(CryptoJS.enc.Base64));
    return 'SharedAccessSignature sr=' + sr + '&sig=' + sig + '&se=' + se;
}

function generateSASToken() {
    this.sasToken = getDeviceSASToken(this.connectionInfo.account, this.selectedDevice.deviceId, this.saskey, this.sasttl);
}

function connectToDevice(device) {
    localStorage.deviceConnectionString = 'HostName=' + this.connectionInfo.account + '.azure-devices.net;DeviceId=' + device.deviceId + ';SharedAccessKey=' + device.authentication.symmetricKey.primaryKey;
    window.open('../device', '_blank');
}

jQuery(document).ready(init);