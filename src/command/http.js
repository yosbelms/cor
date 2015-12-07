var
mimes,
http = require('http'),
fs   = require('fs'),
path = require('path'),
url  = require('url');

var mimes = {
    '.gif'   :   'image/gif',
    '.jpeg'  :   'image/jpeg',
    '.jpg'   :   'image/jpeg',
    '.png'   :   'image/png',

    '.js'    :   'text/javascript',
    '.json'  :   'application/json',
    '.css'   :   'text/css',
    '.html'  :   'text/html',
    '.htm'   :   'text/html',
    '.shtml' :   'text/html',
    '.xml'   :   'application/xml',

    '.txt'   :   'text/plain',
    '.text'  :   'text/plain',
    '.log'   :   'text/plain'
};

function mime(ext) {
    var
    m = mimes[ext];
    return typeof m === 'string' ? m : 'text/plain';
}

function show404(response, urlPath) {
    response.writeHead(404);
    response.end('<pre>Error: file ' + urlPath + ' was not found.</pre>');
}

function isHidden(filePath) {
    return /^\./.test(path.basename(filePath));
}

function handleDir(response, urlPath, dirPath) {
    if (isHidden(dirPath)) {
        show404(response, urlPath);
    }
    else {
        fs.readdir(dirPath, function(err, files) {
            var
            i, len, html;

            if (err) {
                show404(response, urlPath);
            }
            else {
                html =  '<pre>';
                html += '<p>Index of ' + urlPath + '</p>';
                html += '<ul>';
                html += '<li><a href="' + path.dirname(urlPath) + '">..</a></li>';
                for (i = 0, len = files.length; i < len; i++) {
                    dirPath = (urlPath === '/' ? '' : urlPath + '/') + files[i];
                    if (! isHidden(dirPath)) {
                        html += '<li><a href="' + dirPath + '">' + files[i] + '</a></li>';
                    }
                }

                html += '</ul></pre>';

                response.writeHead(200, {'Content-Type': 'text/html'});
                response.end(html, 'utf8');
            }
        });
    }
}

function handleFile(response, urlPath, filePath, stats) {
    var
    ext = path.extname(filePath);

    fs.readFile(filePath, function(err, data) {
        if (err || isHidden(filePath)) {
            show404(response, urlPath);
        }
        else {
            response.writeHead(200, {
                'Content-Type'   : mime(ext),
                'Content-Length' : data.length,
                'Last-Modified'  : stats.mtime.toGMTString()
            });
            response.end(data, 'utf8');
        }
    });
}

function serve(port) {
    port = port || 9000;
    http.createServer(function (request, response) {
        var
        indexPagePath,
        parsedUrl = url.parse(request.url),
        urlPath   = parsedUrl.pathname || '',
        filePath  = path.join(process.cwd(), urlPath);

        fs.stat(filePath, function(err, stats) {
            if (err) {
                show404(response, urlPath);
            }
            else {
                if (stats.isDirectory()) {
                    /*
                    // is the directory path doesn't ends with '/'char
                    if (urlPath.charAt(urlPath.length - 1) !== '/') {
                        parsedUrl.pathname += '/';
                        // redirect to '/'
                        response.writeHead(301, {
                            'Content-Length' : 0,
                            'Location'       : url.format(parsedUrl),
                        });
                        response.end();
                        return;
                    }

                    indexPagePath = filePath + '/index.html';

                    fs.stat(indexPagePath, function(err, indexPageStats) {
                        if (!err && indexPageStats.isFile()) {
                            handleFile(response, urlPath, indexPagePath, indexPageStats);
                        }
                        else {
                            handleDir(response, urlPath, filePath, stats);
                        }
                    });
                    */
                    handleDir(response, urlPath, filePath, stats);
                }
                else if (stats.isFile()) {
                    handleFile(response, urlPath, filePath, stats);
                }
            }
        });

    }).listen(port);

    console.log('Server running at http://127.0.0.1:' + port);
}

var
cmd = new cor.CliCommand('http', 'runs a http server for development purpose');

cmd.addOption('port', 'port for the http server, default is 9000');
cmd.setAction(function (input, app) {
    var port = input.getOption('port');

    if (port) {
        if (! (/[1-9][0-9]+/.test(port)) ) {
            app.print('Invalid port: ' + port);
            return;
        }
    }

    serve(port);

});

module.exports = cmd;