require('../parser.js');
require('../scope/env.js');
require('../scope/scope.js');
require('../compiler.js');
require('../loader/node.js');

var
confFilename,
entryPath,

Module   = require('module'),
fs       = require('fs'),
nodePath = require('path'),
path     = cor.path,
loader   = cor.loader = new cor.Loader(),
origRequire = Module.prototype.require;

Module.prototype.require = function(filename) {
    var
    plugin, mod,
    ext = nodePath.extname(filename);
    
    if (ext === '') {
        ext = nodePath.extname(this.filename);
        mod = loader.moduleCache[path.sanitize(nodePath.resolve(filename + ext))];
    }
    
    if (mod) {
        return mod.getExports();
    }
    else {
        return origRequire.apply(this, arguments);    
    }
}

cor.Program.prototype.getExports = function(parent) {    
    var js,
    mod = new Module(this.filename, parent);
    
    mod.filename = this.filename;
    mod.paths    = Module._nodeModulePaths(nodePath.dirname(this.filename));
    mod.loaded   = true;
    mod._contextLoad = true;
        
    js = this.toJs();
    
    mod._compile(js.src, this.filename);
    
    return mod.exports || {};
}

function run() {
    loader.setEntry(path.sanitize(entryPath || ''), path.sanitize(confFilename || ''));    
}

var
cmd = new cor.CliCommand('run', 'ok');

cmd.addArgument('path', 'path to the file to run', true);

cmd.addOption('conf', 'path to the .json file which contains environment variables for cor.Loader');
cmd.addOption('v',   'print additional information');

cmd.setAction(function (input, app) {
    entryPath    = input.getArgument('path');
    confFilename = input.getOption('conf');
    
    run();
});

module.exports = cmd;