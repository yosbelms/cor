require('../cor.js');
require('../class.js');
require('./path.js');
require('./loader.js');

var
Module   = require('module'),
fs       = require('fs'),
nodePath = require('path'),
path     = cor.path,
loader   = cor.loader = new cor.Loader(),
oRequire = Module.prototype.require,
oRequireModule = cor.Loader.prototype.requireModule,
oOnReadFileSuccess = loader.onReadFileSuccess,
nativeModules  = [
    'assert',
    'buffer',
    'cuild_process',
    'cluester',
    'console',
    'constants',
    'crypto',
    'dgram',
    'dns',
    'domain',
    'events',
    'freelist',
    'fs',
    'http',
    'https',
    'module',
    'net',
    'os',
    'path',
    'punycode',
    'querystring',
    'readline',
    'repl',
    'stream',
    'string_decoder',
    'sys',
    'timer',
    'tls',
    'tty',
    'url',
    'util',
    'vm',
    'zlib'
];

cor.Loader.prototype.isNativeModule = function(name) {
    return nativeModules.indexOf(name) != -1;
};

cor.Loader.prototype.readFile = function(path, from, onLoad, onError) {
    var ret, loader = this;

    loader.busy(true);

    if (onLoad) {
        fs.readFile(path, 'utf8', function(err, data) {
            if (err && typeof onError === 'function') {
                onError(path, from);
            }
            else if (typeof onLoad === 'function') {
                onLoad(path, from, data);
            }
        });
    }
    else {
        try {
            ret = fs.readFileSync(path, 'utf8');
        } catch(e) { }

        return ret;
    }
};

cor.Loader.prototype.busy = function(busy) {
    this.isBusy = !!busy;
}

cor.Loader.prototype.requireModule = function() {
    this.busy(true);
    return oRequireModule.apply(this, arguments);
}


Module.prototype.require = function require(filename) {
    var
    nodeAnswer, corAnswer, absPath,
    ext = nodePath.extname(filename);

    if (loader.isNativeModule(filename)){
        return oRequire.apply(this, arguments);
    }

    if (ext === '') {
        ext       = nodePath.extname(this.filename);
        absPath   = nodePath.resolve(nodePath.dirname(this.filename), filename + ext);
        corAnswer = loader.moduleCache[path.sanitize(absPath)];

        try {
            return oRequire.apply(this, arguments);
        } catch (e) { }

        if (corAnswer) {
            return corAnswer.getExports(this);
        }
    }

    try {
        return oRequire.apply(this, arguments);
    } catch (e) {
        throw new Error('Cannot load module \'' + filename + '\' requested from ' + this.filename);
    }

}

cor.Program.prototype.getExports = function(parent) {
    var mod, js = this.toJs();

    mod = new Module(this.filename, parent);

    mod.filename = this.filename;
    mod.paths    = Module._nodeModulePaths(nodePath.dirname(this.filename));
    mod.src      = js.src;
    mod.loaded   = true;
    mod._contextLoad = true;
    mod._compile(js.src, this.filename);

    return mod.exports || {};
}

loader.onReadFileSuccess = function() {
    loader.busy(false);
    oOnReadFileSuccess.apply(this, arguments);
}

loader.onReadFileFailure = function(filename, from) {
    // if a could not find the file, delegate to
    // the nodejs module finding algorithm.
    // we increase the counter count it as a loaded module to
    // keep the loader working on

    // if `numModules` == 0 then it is the entry file
    if (loader.numModules === 0) {
        throw Error('No such file: ' + filename)
    }

    loader.busy(false);
    loader.numModules++;
}

// check if the loader is idle
var lastIdleTime = new Date().getTime();

// check each 1 sec if the loader
// is idle or not. If idle, for more than two seconds
// then start the program
function checkIdle() {
    lastTimeout = setTimeout(function() {
        var
        now     = new Date().getTime(),
        elapsed = now - lastIdleTime;

        if (loader.isBusy || loader.isReady) {
            lastIdleTime = now;
            return;
        }

        //console.log(elapsed, loader.isReady)

        if (elapsed > 2000 && !loader.isReady) {
            loader.onLoaderReady();
            return;
        }
        checkIdle();
    }, 1000)
}

checkIdle();

require('./plugins.js');