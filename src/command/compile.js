require('../parser.js');
require('../scope/env.js');
require('../scope/scope.js');
require('../compiler.js');
require('../sourcemap.js');
require('../loader/node.js');


var
cliApp,
cliInput,
path       = require('path'),
fs         = require('fs'),
sourcePath = '',
sourceCode = {},
sourceDirs = [];

function print() {
    //
}

function read(srcPath, base) {
    var
    files, i, len,
    stats, key;

    if (base) {
        srcPath = path.join(base, srcPath);
    }

    try {
        stats = fs.statSync(srcPath);
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            console.log('No such file or directory ' + srcPath);
            return;
        }
    }

    key = path.relative(sourcePath, cor.path.sanitize(srcPath));

    if (stats.isDirectory()) {
        files = fs.readdirSync(srcPath);

        for (i = 0, len = files.length; i < len; i++) {
            read(files[i], srcPath);
        }

        sourceDirs.push(key);
    }
    else if (stats.isFile()) {
        sourceCode[key] = fs.readFileSync(srcPath, 'utf8');
    }
}

function makePath(sDirPath) {
    var
    i, len,
    genPath = sDirPath[0];

    for (i = 1, len = sDirPath.length; i <= len; i++) {
        if (! fs.existsSync(genPath)) {
            try {
                fs.mkdirSync(genPath);
            }
            catch (e) {
                throw Error('Could not make path ' + genPath);
            }
        }
        genPath = cor.path.join(genPath, sDirPath[i]);
    }
}

function write(outPath) {
    var
    i, len, parsed,
    content, plugin, src,
    srcPath, absPath;

    for (i = 0, len = sourceDirs.length; i < len; i++) {
        absPath = cor.path.join(outPath, sourceDirs[i]);
        makePath(cor.path.split(absPath));
    }

    print('Compiling:\n');

    for (srcPath in sourceCode) {
        src     = sourceCode[srcPath];
        plugin  = cor.loader.plugins[cor.path.ext(srcPath)];
        absPath = cor.path.sanitize(path.join(outPath, srcPath));

        if (plugin) {
            print('    from: ' + absPath);

            parsed  = cor.path.parse(absPath);
            absPath = parsed.root + parsed.dir + cor.path.basename(absPath, cor.path.ext(absPath)) + '.js';
            content = plugin.toJs(src, absPath).src;

            print('    to:   ' + absPath + '\n');
        }
        else {
            content = src;
        }

        fs.writeFileSync(absPath, content);
    }

    print('\nOutput in ' + path.resolve(outPath));
}

var
cmd = new cor.CliCommand('compile', 'compile packages');
cmd.addArgument('path', 'path to the package to be compiled', true);

cmd.addOption('o', 'name of the directory to write the compiling result');
cmd.addOption('v',   'print file names as the are compiled');
cmd.setAction(function (input, app) {

    cliInput = input;
    cliApp   = app;
    sourcePath = cor.path.sanitize(cliInput.getArgument('path'));

    var
    defaultOut = cor.path.basename(sourcePath) + ('js_' + (new Date()).getTime()),
    basePath   = cor.path.cwd();

    if (input.getOption('v')) {
        print = app.print;
    }

    read(sourcePath);
    write(cliInput.getOption('o') || defaultOut);

});

module.exports = cmd;
