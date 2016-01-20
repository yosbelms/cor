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
    var ret;
        
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
        } catch(e) {}
        
        return ret;
    }
};


Module.prototype.require = function(filename) {
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
            nodeAnswer = oRequire.apply(this, arguments);
        } catch (e){}
        
        if (nodeAnswer) {
            return nodeAnswer;
        }
        
        if (corAnswer) {
            return corAnswer.getExports(this);
        }
    }
    
    return oRequire.apply(this, arguments);
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

loader.onReadFileFailure = function() {
    loader.numModules++;
}

require('./plugins.js');