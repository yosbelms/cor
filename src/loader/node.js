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
oRequireModule = cor.Loader.prototype.requireModule;

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
    //console.log(filename);
    var
    plugin, nodeAnswer, corAnswer,
    mod, ret, absPath,
    ext = nodePath.extname(filename);
    
    if (ext === '') {
        ext       = nodePath.extname(this.filename);
        absPath   = nodePath.resolve(nodePath.dirname(this.filename), filename + ext);        
        corAnswer = loader.moduleCache[path.sanitize(absPath)];

        //console.log('noext : ', path.sanitize(absPath, filename + ext));
        try {
            nodeAnswer = oRequire.apply(this, arguments);
        } catch (e){}
        
        if (nodeAnswer) {
            //console.log('node : ', filename);
            return nodeAnswer;
        }
        else if (corAnswer) {
            //console.log('cor  : ', filename);
            return corAnswer.getExports(this);
        }
    }
    
    //console.log('none :', this.filename);
    return oRequire.apply(this, arguments);
}

cor.Program.prototype.getExports = function(parent) {
    var js = this.toJs();
    
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