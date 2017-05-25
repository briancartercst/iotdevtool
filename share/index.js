const fs = require('fs');
const path = require('path')

module.exports = function (context, req) {
    var _path = req.query.path;
    context.log(_path)
    if (!_path) {
        _path = 'index.html'
    }

    try {
        var file = fs.readFileSync(path.join(__dirname, _path), 'utf8');
    } catch(e) {
        context.res = {
            status: 404
        };
        context.done();
        return;
    }
    
    var suffix = _path.split('.')[1];
    var type;
    switch (suffix) {
        case 'js':
            type = 'application/javascript';
            break;
        case 'css':
            type = 'text/css';
            break;
        case 'png':
            type = 'image/png';
            break;
        case 'html':
            type = 'text/html';
            break;
        default:
            type = 'application/octet-stream';
    }
    context.res = {
        headers: {
            'Content-Type': type
        },
        body: file
    };
    context.done();
};