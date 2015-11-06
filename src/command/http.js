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
    '.log'   :   'text/plain',
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
    port = port || 8080;
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

cmd.addOption('port', 'port for the http server, default is 8080');
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

return;
//-----------------------------------------------------------------------

/**
 * @class http.Response
 *
 * Response instances are typically automatically created by http.Child
 */
/*global require, exports, toString, decaf, java */

"use strict";

var mimeTypes = require('mimetypes').mimeTypes,
    GZIP      = require('GZIP').GZIP;

/**
 * @private
 * Hash containing HTTP status codes and the messages associated with them.
 */
var responseCodeText = {
    100 : 'Continue',
    101 : 'Switching Protocols',
    200 : 'OK',
    201 : 'Created',
    202 : 'Accepted',
    203 : 'Non-Authoritative Information',
    204 : 'No Content',
    205 : 'Reset Content',
    206 : 'Partial Content',
    300 : 'Multiple Choices',
    301 : 'Moved Permanently',
    302 : 'Found',
    303 : 'See Other',
    304 : 'Not Modified',
    305 : 'Use Proxy',
    307 : 'Temporary Redirect',
    400 : 'Bad Request',
    401 : 'Unauthorized',
    402 : 'Payment Required', // note RFC says reserved for future use
    403 : 'Forbidden',
    404 : 'Not Found',
    405 : 'Method Not Allowed',
    406 : 'Not Acceptable',
    407 : 'Proxy Authentication Required',
    408 : 'Request Timeout',
    409 : 'Conflict',
    410 : 'Gone',
    411 : 'Length Required',
    412 : 'Precondition Failed',
    413 : 'Request Entity Too Large',
    414 : 'Request-URI Too Long',
    415 : 'Unsupported Media Type',
    416 : 'Request Range Not Satisfiable',
    417 : 'Expectation Failed',
    500 : 'Internal Server Error',
    501 : 'Not Implemented',
    502 : 'Bad Gateway',
    503 : 'Service Unavailable',
    504 : 'Gateway Timeout',
    505 : 'HTTP Version Not Supported'
};

/**
 * @class http.Response
 * @constructor
 * Create an instance of an HTTP Response object.
 *
 * Response instances are typically automatically created by http.Child
 *
 * @param {net.OutputStream} os OutputStream to send response to
 * @param {http.Request} req http request object
 */
function Response(os, req) {
    this.os = os;
    this.req = req;
    this.headersSent = false;
    this.status = 200;
    this.contentLength = 0;
    this.cookies = null;
    this.headers = {};
    this.proto = this.req.proto;
}

decaf.extend(Response.prototype, {
    /**
     *
     */
    destroy : function () {
        var me = this,
            os = me.os;

        if (me.chunked) {
            os.writeln('0');
            os.writeln('');
            me.flush();
        }
        me.chunked = false;
    },

    setCookie : function (key, value, expires, path, domain) {
        var cookie = {
            value : value
        };
        if (expires) {
            expires = toString.apply(expires) === '[object Date]' ? expires.toGMTString() : expires;
            cookie.expires = expires;
        }
        if (path) {
            cookie.path = path;
        }
        else {
            cookie.path = '/';
        }
        if (domain) {
            cookie.domain = domain;
        }
        this.cookies = this.cookies || {};
        this.cookies[key] = cookie;
    },

    unsetCookie : function (key) {
        var now = new Date().getTime() / 1000;
        var yesterday = now - 86400;
        this.cookies = this.cookies || {};
        var cookie = this.cookies[key] || {};
        cookie.path = cookie.path || '/';
        cookie.expires = new Date(yesterday * 1000).toGMTString();

        this.cookies[key] = cookie;
    },

    /**
     * Set response status and headers.
     *
     * @param {Number} status HTTP status, e.g. 200 (for OK), 404 (not found), etc.
     * @param {Object} headers hash containing headers to be added to the response headers.
     */
    writeHead : function (status, headers) {
        var me = this;

        decaf.extend(this.headers, headers);
        this.status = status;
    },

    /**
     * Send a response.
     *
     * This method is inspired by res.send() of ExpressJS.
     *
     * This method determines the type of the thing to be sent and pretty much does the
     * right thing.
     *
     * If the body to be sent is a string, the content-type header is set to text/html.
     *
     * If the body to be sent is an array or object, then the JSON representation will be sent
     * with content-type set to application/json.
     *
     * If the optional status code is not provided, then 200 is assumed.
     *
     * If the only argument is a number, it is assumed to be a status code and a response body
     * string is automatically sent (e.g. OK for 200, Not Found for 404, etc.)
     *
     * @param {Number} status - optional HTTP status code (e.g. 200, 404, etc.)
     * @param {String|Object} body - optional thing to be sent as the response
     */
    send : function (status, body) {
        if (typeof status === 'number') {
            if (body === undefined) {
                this.writeHead(status, {'Content-Type' : 'text/html'});
                this.end(responseCodeText[status] || ('Unknown status ' + status));
                return;
            }
        }
        else if (body === undefined) {
            body = status;
            status = this.status || 200;
        }

        if (typeof body === 'string') {
            this.writeHead(status, {'Content-Type' : 'text/html '});
            this.end(body);
        }
        else {
            this.writeHead(status, {'Content-Type' : 'application/json'});
            this.end(JSON.stringify(body));
        }
    },

    /**
     * Send a file to the client.
     *
     * @param {String} filename name of file to send
     * @param {Boolean} modifiedSince false to disable 304 if-modified-since processing
     */
    sendFile : function (filename, modifiedSince) {
        var os = this.os,
            headers = this.headers,
            extension = filename.indexOf('.') !== -1 ? filename.substr(filename.lastIndexOf('.') + 1) : '',
            file = new java.io.File(filename),
            modified = file.lastModified(),
            size = file.length();

        if (modified === 0) {
            throw new Error('404');
        }

        headers['Content-Type'] = mimeTypes[extension] || 'text/plain';
        modified = parseInt(modified / 1000, 10);
        headers['last-modified'] = new Date(modified * 1000).toGMTString();

        if (modifiedSince) {
            if (typeof modifiedSince === 'string') {
                modifiedSince = Date.parse(modifiedSince) / 1000;
            }
            if (modified < modifiedSince) {
                this.status = 304;
                this.sendHeaders();
                return;
            }
        }

        try {
            var inFile = new java.io.FileInputStream(filename),
                buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 4096 * 16),
                remaining = size,
                offset = 0,
                actual;

            this.status = 200;
            headers['Content-Length'] = remaining;
            this.sendHeaders();
            os.flush();

            while (remaining > 0) {
                actual = inFile.read(buf);
                if (actual <= 0) {
                    break;
                }
                os.writeBytes(buf, 0, actual);
                offset += actual;
                remaining -= actual;
            }
            inFile.close();
            os.flush();
        }
        catch (e) {
            e.dumpText();
        }
    },

    /**
     * Send a Java byte[] array to the client.
     *
     * @param {Array.<Number>} bytes array of bytes to send
     * @param {String} mimeType mime-type to send (content-type)
     * @param {Number} lastModified timestamp byte array last modified
     * @param {String|Number} modifiedSince if-modified-since request header value
     */
    sendBytes : function (bytes, mimeType, lastModified, modifiedSince) {
        var os = this.os,
            headers = this.headers,
            size = bytes.length;
        headers['Content-Type'] = mimeType;
        if (lastModified) {
            lastModified = parseInt(lastModified / 1000, 10);
            headers['last-modified'] = new Date(lastModified * 1000);
            if (modifiedSince) {
                if (typeof modifiedSince === 'string') {
                    modifiedSince = Date.parse(modifiedSince);
                }
                modifiedSince = parseInt(modifiedSince / 1000, 10);
                if (lastModified <= modifiedSince) {
                    this.status = 304;
                    this.sendHeaders();
                    this.flush();
                    return;
                }
            }
        }
        headers['Content-Length'] = size;
        this.sendHeaders();
        this.flush();

        os.writeBytes(bytes, 0, size);

        //var remaining = size,
        //    offset = 0,
        //    actual;
        //
        //while (remaining > 0) {
        //    actual = os.writeBytes(bytes, offset, remaining);
        //    offset += actual;
        //    remaining -= actual;
        //}
        os.flush();
    },

    /**
     * Send response headers to the client.
     */
    sendHeaders : function () {
        var me = this,
            os = me.os,
            headers = me.headers;

        if (me.headersSent) {
            return;
        }
        os.writeln(me.proto + ' ' + me.status + ' ' + responseCodeText[me.status]);
        os.writeln('Date: ' + new Date().toGMTString());
        for (var key in headers) {
            if (headers.hasOwnProperty(key)) {
                os.writeln(key + ': ' + headers[key]);
            }
        }
        if (me.cookies && !me.headers['Set-Cookie']) {
            decaf.each(me.cookies, function (cookie, key) {
                var out = 'Set-Cookie: ' + key + '=' + encodeURIComponent(cookie.value);
                if (cookie.expires) {
                    out += '; Expires=' + cookie.expires;
                }
                if (cookie.path) {
                    out += '; Path=' + cookie.path;
                }
                if (cookie.domain) {
                    out += '; Domain=' + encodeURIComponent(cookie.domain);
                }
                os.writeln(out);
            });
        }
        os.writeln('');
        me.headersSent = true;
    },

    /**
     * Set response header
     * @param {string} key name of header
     * @param {string} value value of header
     */
    setHeader : function (key, value) {
        this.headers[key] = value;
    },

    /**
     * Write string to response.
     *
     * If headers aren't sent, this will send headers with Transfer-Encoding: chunked.  The write() and each
     * successive one will be sent as a chunk.
     *
     * @param {string} s string to write
     */
    write : function (s) {
        var me = this,
            os = me.os;

        if (!me.headersSent) {
            me.setHeader('Transfer-Encoding', 'Chunked');
            me.sendHeaders();
            me.chunked = true;
        }
        os.writeln(s.length.toString(16));
        os.writeln(s);
        os.flush();
    },

    /**
     * complete response
     *
     * @param {string} s body of response
     */
    end : function (s, gzip) {
        var os = this.os,
            headers = this.headers;

        if (s) {
            if (toString.apply(s) === '[object Array]') {
                s = s.join('\n');
            }
            s = decaf.toJavaByteArray(s);
            if (gzip) {
                s = GZIP.compress(s);
                headers['Content-Encoding'] = 'gzip';
            }
            headers['Content-Length'] = s.length;
        }
        this.sendHeaders();
        if (s) {
            if (typeof s === 'string') {
                os.write(s);
            }
            else {
                os.flush();
                os.writeBytes(s, 0, s.length);
            }
        }
        os.flush();
    },

    /**
     * Complete request handling.
     *
     * This method does not return.  The request is assumed to be completed.
     *
     * You can call this from within nested methods to terminate/complete the request.
     */
    stop : function () {
        throw 'RES.STOP';
    },

    /**
     * Issue a 303 redirect to the specified URI
     *
     * @param {string} uri
     */
    redirect : function (uri) {
        var me = this,
            os = me.os;

        me.status = 303;
        var base;
        if (uri.substr(0, 7) !== 'http://' && uri.substr(0, 8) !== 'https"://') {
            base = 'http://';
            base += me.req.host;
            if (me.port !== 80) {
                base += ':' + me.req.port;
            }
            uri = base + uri;
        }
        me.headers['Location'] = uri;
//        os.writeln(me.proto + ' ' + me.status + ' ' + responseCodeText[me.status]);
//        os.writeln('Location: ' + uri);
//        os.flush();
        me.end();
        me.stop();
    },

    /**
     * Flush the response output stream.
     */
    flush : function () {
        this.os.flush();
    }
});

decaf.extend(exports, {
    responseCodeText : responseCodeText,
    Response         : Response
});
