define(["require", "exports"], function (require, exports) {
    var Util = (function () {
        function Util() {
        }
        Util.str2ab = function (str) {
            str = decodeURI(encodeURIComponent(str));
            var buf = new ArrayBuffer(str.length); // 2 bytes for each char
            var bufView = new Uint8Array(buf);
            for (var i = 0, strLen = str.length; i < strLen; i++) {
                bufView[i] = str.charCodeAt(i);
            }
            return buf;
        };
        Util.getSASToken = function (account, key, keyName) {
            var sr = account + '.azure-devices.net';
            var se = Math.round(new Date().getTime() / 1000) + 60;
            var stringtosign = sr + '\n' + se;
            var sig = Util.encodeUriComponentStrict(CryptoJS.HmacSHA256(stringtosign, CryptoJS.enc.Base64.parse(key)).toString(CryptoJS.enc.Base64));
            return 'SharedAccessSignature sr=' + sr + '&sig=' + sig + '&se=' + se + '&skn=' + keyName;
        };
        Util.encodeUriComponentStrict = function (str) {
            return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
                return '%' + c.charCodeAt(0).toString(16);
            });
        };
        Util.Utf8ArrayToStr = function (array) {
            var out, i, len, c;
            var char2, char3;
            out = "";
            len = array.length;
            i = 0;
            while (i < len) {
                c = array[i++];
                switch (c >> 4) {
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                        // 0xxxxxxx
                        out += String.fromCharCode(c);
                        break;
                    case 12:
                    case 13:
                        // 110x xxxx   10xx xxxx
                        char2 = array[i++];
                        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                        break;
                    case 14:
                        // 1110 xxxx  10xx xxxx  10xx xxxx
                        char2 = array[i++];
                        char3 = array[i++];
                        out += String.fromCharCode(((c & 0x0F) << 12) |
                            ((char2 & 0x3F) << 6) |
                            ((char3 & 0x3F) << 0));
                        break;
                }
            }
            return out;
        };
        Util.restAPI = function (account, key, keyName, method, path, header, body, success, fail) {
            var sasToken = this.getSASToken(account, key, keyName);
            var apiVersionString = 'api-version=2016-11-14';
            if (path.indexOf('?') !== -1) {
                path += ('&' + apiVersionString);
            }
            else {
                path += ('?' + apiVersionString);
            }
            var url = 'https://' + WEBSITE_HOSTNAME + '/rest/' + account + path;
            if (typeof header === 'function') {
                success = header;
                fail = body;
                header = {};
                body = null;
            }
            else if (typeof body === 'function') {
                fail = success;
                success = body;
                body = null;
            }
            else if (typeof header === 'string') {
                fail = success;
                success = body;
                body = header;
                header = {};
            }
            header = header || {};
            header.Authorization = sasToken;
            header['x-user-guid'] = this.getUUID();
            fail = fail || function () { };
            jQuery.ajax({
                url: url,
                type: method,
                headers: header,
                data: body
            }).done(success).fail(fail);
        };
        Util.getUUID = function () {
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
        return Util;
    })();
    exports.Util = Util;
});
