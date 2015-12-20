(function(){ typeof cor === 'undefined' && (cor = {});

require('../parser.js');
require('../scope/env.js');
require('../scope/scope.js');
require('../compiler.js');
require('../sourcemap.js');
require('../loader/node.js');

var
outFilename,
envFilename,
packageType,
sourcePath,
cliInput,
cliApp,
loader    = cor.loader,
embeddCrl = true,
cwd       = cor.path.cwd(),
fs        = require('fs'),
path      = require('path'),
pkgJson   = require('../../package.json');

function print() {
    //empty
}

function getHeadStub() {
    var
    dt   = new Date(),
    stub = '';

    stub += '// Packed by Cor ' + pkgJson.version + '\n\n';
    stub += '// Date(m-d-y): ' + [dt.getMonth() + 1, dt.getDate(), dt.getFullYear()].join('-') + '\n';
    stub += '// Build-Id: ' + dt.getTime() + '\n';

    return stub;
}


cor.Loader.prototype.onLoaderReady = function() {
    var
    name, i, len, content,
    filename, temp, dep,
    rInvalidChars = /[^a-zA-Z_]/g,
    src           = '',
    depsSrcList   = [],
    fileNameTable = {},
    dependences   = [],
    programs      = [],
    filenames     = [],
    moduleName    = '';

    print('\nCompiling:\n');

    for (name in this.moduleCache) {
        print('    ' + name);

        filename = this.moduleCache[name].filename;
        //console.log(filename);
        fileNameTable[filename] = filenames.length;
        filenames.push(filename);

        dependences.push(this.moduleCache[name].dependences);

        moduleName = path.basename(filename).replace(rInvalidChars, '_');
        
        programs.push(
            'function ' + moduleName + '(require, module, exports){\n' +
             this.moduleCache[name].toJs().src  +
            '\n}'
        );
    }

    //console.log(fileNameTable);
    //console.log(dependences);

    for (i = 0, len = filenames.length; i < len; i++) {
        temp = [];
        for (name in dependences[i]) {
            depPath = dependences[i][name];
            if (cor.path.ext(depPath) === '') {
                filename = fileNameTable[depPath + cor.path.ext(filenames[i])];
            }
            else {
                filename = fileNameTable[depPath];
            }

            if (filename) {
                temp.push("'" + name + "':" + filename);
            }
            else {
                console.log('could not locate dependence ' + name + ' for: ' + filenames[i]);
                global.process.exit(1);
            }
        }
        if (temp.length > 0) {
            depsSrcList.push('{' + temp.join(',') + '}');
        }
        else {
            depsSrcList.push('null');
        }
    }

    src += getHeadStub();
    if (embeddCrl) {
        src += fs.readFileSync(__dirname + '/../crl.js', 'utf8');
    }
    src += fs.readFileSync(__dirname + '/stubs/build.prefix', 'utf8');

    for (i = 0, len = packageType.length; i < len; i++) {
        try {
            content = fs.readFileSync(__dirname + '/stubs/packageType.' + packageType[i], 'utf8');
        } catch(e) {
            throw packageType[i] + ' not supported';
        }

        src += content.replace('{package_name}', /^([a-zA-Z_]+)/.exec(path.basename(this.entryModulePath))[1]);
    }
    
    src += '})([\n' +
          depsSrcList.join(',\n') +
          '\n],[\n' +
          programs.join(',') +
          '\n]);';
    
    if (! outFilename) {
        outFilename = sourcePath + '.cor.js';
    }
    
    outFilename = path.resolve(cwd, outFilename);
    
    cliApp.print('\nWriting package to: ' + outFilename);
    fs.writeFileSync(outFilename, src);
};

function build() {
    var
    spath, last,
    path = cor.path.sanitize(sourcePath);

    if (path.length === 0) {
        return;
    }

    if (cliInput.getOption('v')) {
        print = cliApp.print;
    }

    if (cliInput.getOption('no-crl')) {
        embeddCrl = false;
    }

    if (!packageType) {
        packageType = ['domready'];
    }
    else {
        packageType = packageType.split(',');
    }

	if (path) {
        if (cor.path.ext(path) === '') {
            spath = path.split(cor.path.pathSep);
            spath.push(cor.path.pathSep + spath[spath.length - 1] + '.cor');
            path  = cor.path.sanitize(spath.join(cor.path.pathSep));
        }        
		loader.setEntry(path, envFilename);
	}

}

var
cmd = new cor.CliCommand('build', 'compile packages and dependecies');
cmd.addArgument('path', 'path to the entry file or package to be compiled whith it dependences', true);

cmd.addOption('o', 'name of the file to write the compiling result');
cmd.addOption('type', 'type of the resulting package (domready, commonjs, amd and global)');
cmd.addOption('env', 'path to the .json file which contains environment variables for cor.Loader');
cmd.addOption('no-crl', 'specify tht CRL(Cor Runtime Library) should not be embedded in the head of the compiling result');
cmd.addOption('v',   'print additional information during build proccess');

cmd.setAction(function (input, app){
    cliInput = input;
    cliApp   = app;
    sourcePath  = input.getArgument('path');
    envFilename = input.getOption('env');
    outFilename = input.getOption('o');
    packageType = input.getOption('type');

    build();
});

module.exports = cmd;

}).call(this);
