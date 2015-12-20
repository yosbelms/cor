(function(cor){

var
parseJson = typeof JSON !== 'undefined' ? JSON.parse : function parseJson(str) {
    if(! /^([\s\[\{]*(?:"(?:\\.|[^"])+"|-?\d[\d\.]*(?:[Ee][+-]?\d+)?|null|true|false|)[\s\]\}]*(?:,|:|$))+$/.test(str)) {
        throw 'Invalid characters in JSON';
    }
    return eval('(' + str + ')');
};

var fakeProgram = {
    getExports: function() {

    },
    toJs: function() {
        return {src: ''};
    }
};

var
hasProp = Object.prototype.hasOwnProperty,
Class   = cor.Class,
path    = cor.path;

var path = {
    fileExts: [
        '.php',
        '.html',
        '.htm',
        '.jsp',
        '.jspx',
        '.asp',
        '.aspx',
        '.json'
    ],

    pathSep: '/',

    // normalizePath('a/b/../../file.cor'.split('/'))
    // taking an array as input
    // will output file.cor
    normalize: function(path, allowUpperRoot) {
        var i,
        up = 0;

        for (i = path.length - 1; i >= 0; i--) {
            switch (path[i]) {
                case '.' :
                    path.splice(i, 1);
                    break;
                case '..' :
                    path.splice(i, 1);
                    up++;
                    break;
                default :
                    if (up) {
                        path.splice(i, 1);
                        up--;
                    }
            }
        }

        if (allowUpperRoot) {
            while (up--) {
                path.unshift('..');
            }
        }

        return path;
    },

    cwd: function() {
        var cwd;

        if (cor.isBrowser) {
            cwd = '/' + window.location.pathname;
        }
        else if (cor.isNode) {
            cwd = require('path').resolve(process.cwd());
        }

        return this.sanitize(cwd);
    },

    sanitize: function(path) {
        return path.replace(/\\/g, this.pathSep).replace(/\/+/g, this.pathSep);
    },

    isRelative: function(path) {
        return /^(\.\.|\.)\//.test(path);
    },

    isAbsolute: function(path) {
        return /^(\/|[a-zA-Z]+\:)/.test(path);
    },

    isFile: function(path) {
        return this.fileExts.indexOf(this.ext(path)) !== -1;
    },

    parse: function(path) {
        var
        rParse  = /^(\/|[a-zA-Z]+\:)?([\s\S]+\/(?!$)|\/)?((?:\.{1,2}$|[\s\S]+?)?(\.[^.\/]*)?)$/,
        parsed = rParse.exec(path);

        //console.log(parsed);
        return {
            root     : parsed[1] || '',
            dir      : parsed[2] || '',
            basename : parsed[3] || '',
            ext      : parsed[4] || ''
        };
    },

    ext: function(path) {
        return this.parse(path).ext;
    },

    basename: function(path, ext) {
        var
        parsed, ret,
        rBasename = /([\s\S]+)*(\.[^.\/]*)/,
        basename  = this.parse(path).basename;

        if (ext && basename.substr(-1 * ext.length) === ext) {
            ret = basename.substr(0, basename.length - ext.length);
        }
        else {
            parsed = rBasename.exec(basename);
            if (parsed && parsed[1]) {
                ret =  parsed[1];
            }
            else {
                ret = '';
            }
        }

        return ret;
    },

    dir: function(path) {
        return this.parse(path).dir;
    },

    resolve: function(path1, path2, noCheckFile) {
        var arr;

        if (!noCheckFile && this.isFile(path1)) {
            parsed = this.parse(path1);
            path1  = parsed.root + parsed.dir;
        }

        arr = this.sanitize(path1 + this.pathSep + path2).split(this.pathSep);
        return this.normalize(arr).join(this.pathSep);
    },

    absolute: function(path) {
        if (! this.isAbsolute(path)) {
            path = this.resolve(this.cwd(), path);
        }
        return path;
    },

    split: function(path) {
        return path.split(this.pathSep);
    },

    join: function() {
        var i, len, stack = [];
        for (i = 0, len = arguments.length; i < len; i++) {
            stack.push(arguments[i]);
        }
        return this.sanitize(stack.join(this.pathSep));
    }

};

/*
## cor.Loader

This class is responsible to load the modules required anywhere
in the source code. It resolve module dependencies

*/
var Loader = Class({
    // the path of the .json file containig the environment variables
    envPath                : null,
    // the modules are astored here once compiled
    moduleCache            : {},
    // path ignored by the loader
    ignoredPaths           : {},
    // a has map of paths to redirect the loader
    // required/path => path/to/redirect
    // the wilcard * redirect the rest of the paths
    pathMap                : {'*': ''},
    // number of loaded modules
    numModules             : 0,
    // number of rquired modules
    numRequiredModules     : 0,
    // the path of the entry module
    entryModulePath        : null,

    // plugins to extend the loader funcionality
    plugins : {},


    init: function() {
        var
        me = this,
        originalOnReadFileSuccess = this.onReadFileSuccess,
        originalOnReadFileFailure = this.onReadFileFailure;

        this.onReadFileSuccess = function onReadFileSuccess() {
            originalOnReadFileSuccess.apply(me, arguments);
        };

        this.onReadFileFailure = function onReadFileFailure() {
            originalOnReadFileFailure.apply(me, arguments);
        };
    },

    error: function error(msg, from) {
        return new Error((from ? from : '') + ': ' + msg);
    },

    /*
    plugin parameter must be an Object
    with the following format:
    {
        ext: 'file_extension',

        // this function will find the required modules inside the source code
        // the parameters passed are the source code and the route of the file
        // returns an array
        findRequired: function(src, from){

        },

        // this function should compile the source code to javascript
        // the parammeters are source code and the route of the loaded file
        // should return an object whith the following format:
        // {
        //     prefix: '',
        //     src: '',
        //     suffix: ''
        // }
        toJs: function(src, from){

        }
    }
    */
    addPlugin: function(plugin) {
        if (plugin) {
            if (typeof plugin.ext !== 'string') {
                throw this.error("'ext' property must be string");
            }
            if (typeof plugin.findRequired !== 'function') {
                throw this.error("'findRequired' function is not implemented in " + plugin.ext + "' plugin");
            }
            if (typeof plugin.toJs !== 'function') {
                throw this.error("'toJs' function is not implemented in '" + plugin.ext + "' plugin");
            }
            this.plugins[plugin.ext] = plugin;
            path.fileExts.push(plugin.ext);
        }
        else {
            throw this.error("Invalid object for plugin" + ext + "'");
        }
    },

    /*
    readFile will read files using XHTTPRequest
    */
    readFile: function(path, from, onLoad, onError) {
        var
        e, xhr,
        sync = !onLoad;

        xhr = (typeof ActiveXObject === 'function')
            ? new ActiveXObject('Microsoft.XMLHTTP')
            : new XMLHttpRequest();

        function everyThingOk() {
            return (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304 || xhr.status === 1223);
        }

        try {
            xhr.open('GET', path, !sync);
            if (sync) {
                xhr.send(null);
                if (everyThingOk()) {
                    return xhr.responseText;
                }
                else {
                    this.error('There is not file at ' + path, from);
                }
            }
            else {
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4 ) {
                        if (everyThingOk()) {
                            onLoad(path, from, xhr.responseText);
                        }
                        else {
                            if (typeof onError === 'function') {
                                onError(path, from);
                            }
                        }
                    }
                }
                xhr.send(null);
            }
        }
        catch (e) {
            throw this.error('Could not use XMLHttpRequest for ' + path + '(' + e.toString() + ')', from);
        }
    },

    // add paths to be ignred by the loader
    // path parametter is an array
    ignorePath: function(path) {
        var i, len;
        if (path instanceof Array) {
            for (i = 0, len = path.length; i < len; i++) {
                this.ignoredPaths[path[i]] = true;
            }    
        }
        else {
            this.ignoredPaths[path] = true;
        }
        
    },

    resolveMappedPath: function(srcPath) {
        var
        name, candidate, ret = '';

        for (name in this.pathMap) {
            if (hasProp.call(this.pathMap, name) && srcPath.indexOf(name) === 0) {
                candidate = this.pathMap[name] + srcPath.substr(name.length);
            }
        }

        if (candidate) {
            ret = path.sanitize(candidate);
        }

        return ret;
    },

    registerModule: function(path, src, deps) {
        var
        p = new Program(path, src, deps, this);
        this.moduleCache[path] = p;
        this.numModules++;
    },

    onReadFileSuccess: function onReadFileSuccess(srcPath, from, txt) {
        var
        i, len, absolutePath,
        requiredPath, required,
        ext         = path.ext(srcPath),
        plugin      = this.plugins[ext],
        dependences = {};

        if (plugin) {
            required = plugin.findRequired(txt, from);
        }
        else {
            throw this.error("Extension '" + ext + "' is not supported");
        }

        for (i = 0,  len = required.length; i < len; i++) {
            requiredPath = required[i];

            if (path.isAbsolute(requiredPath)) {
                absolutePath = path.sanitize(requiredPath);
            }
            else {
                absolutePath = this.resolveMappedPath(requiredPath);
                if (! absolutePath) {
                   absolutePath = path.resolve(srcPath, requiredPath);
                }
            }

            dependences[requiredPath] = absolutePath;
            this.requireModule(absolutePath, srcPath);
        }

        this.registerModule(srcPath, txt, dependences);

        if (this.numModules === this.numRequiredModules) {
            this.onLoaderReady();
        }
    },

    onReadFileFailure: function onReadFileFailure(srcPath, from) {
        console.error('Unable to read file ', srcPath, ' requested from ', from);
    },

    onLoaderReady: function() {
        var module = this.moduleCache[this.entryModulePath];
        if (module) {
            return module.getExports();
        }
        else {
            this.error('Entry module not found');
        }
    },

    setPath: function(srcPaths, envPath) {
        var name;
        for (name in srcPaths) {
            this.pathMap[name] = path.resolve(envPath, srcPaths[name]);
        }
    },

    requireModule: function(srcPath, from) {
        if ((! this.ignoredPaths[srcPath]) && (! this.moduleCache[srcPath])) {
            this.ignorePath(srcPath);

            var ext = path.ext(srcPath);
            if (ext === '') {
                srcPath += path.ext(from);
            }

            if (! this.entryModulePath) {
                this.entryModulePath = srcPath;
            }
            this.numRequiredModules++;
            this.readFile(srcPath, from, this.onReadFileSuccess, this.onReadFileFailure);
        }
    },

    setEntry: function(entryPath, envPath) {
        var
        parsed,
        me  = this,
        cwd = path.cwd();

        if (entryPath) {
            if (path.ext(envPath) === '.json') {
                me.readFile(envPath, cwd, function onEnvReady(envPath, from, txt) {
                    var
                    env = parseJson(txt);
                    me.envPath = path.resolve(cwd, envPath);
                    if (env) {
                        if (env.ignore) {
                            me.ignorePath(env.ignore);
                        }
                        if (env.paths) {
                            me.setPath(env.paths, me.envPath);
                        }
                        me.boot(entryPath);
                    }
                },
                me.onReadFileFailure);
            }
            else {
                me.boot(entryPath);
            }
        }
    },

    boot: function(srcPath) {
        var
        resolved = path.resolve(path.cwd(), srcPath);
        this.requireModule(resolved, path.cwd());
    }

});

// Program Class
var Program = Class({

    filename    : null,
    exports     : null,
    dependences : null,
    src         : '',
    environment : null,
    loader      : null,


    init: function(path, src, deps, loader) {
        this.src         = src;
        this.filename    = path;
        this.dependences = deps;
        this.loader      = loader;
    },

    getExports: function() {
        var path, prog, env, js;

        if (this.environment === null) {

            js = this.toJs();
            if (typeof js === 'string') {
                js = {src: js};
            }
            prog = (new Function('return function(require,module,exports){' +
                  (js.prefix  || '') +
                  (js.src     || '') + '}' +
                  (js.suffix  || '')
            ))();

            if (typeof prog === 'function') {
                this.environment = this.newModule();
                prog(this.environment.require, this.environment, this.environment.exports);
            }
            else {
                this.loader.error('Error while attemp to execute ' + path);
            }
        }

        return this.environment.exports;
    },

    newModule: function() {
        var
        me     = this,
        newMod = {
            exports: {},

            require: function require(srcPath) {
                var
                cache   = me.loader.moduleCache,
                depPath = me.dependences[srcPath],
                module;

                if (path.ext(depPath) === '') {
                    module = cache[depPath + path.ext(me.filename)];
                }
                else {
                    module = cache[depPath];
                }

                if (module) {
                    return module.getExports();
                }
                else {
                    throw me.loader.error("Can not find module '" + srcPath + "'", me.filename);
                }
            }
        };

        return newMod;
    },

    toJs: function() {
        var
        ext    = path.ext(this.filename),
        plugin = this.loader.plugins[ext];

        if (plugin) {
            return plugin.toJs(this.src, this.filename);
        }
        else {
            throw this.error('Can not translate to javascript files \'.' + ext + "'", this.filename);
        }
    }
});

// public to cor namespace
cor.Loader  = Loader;
cor.Program = Program;
cor.path    = path;

})(typeof cor === 'undefined' ? {} : cor);