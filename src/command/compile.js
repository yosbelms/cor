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

function getStats(path) {
    var stats;
    
    try {
        return fs.statSync(path);
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.log('No such file or directory ' + path);
            return;
        }
    }
}

function read(srcPath, base) {
    var
    files, i, len,
    stats, key;

    if (base) {
        srcPath = path.join(base, srcPath);
    }
    
    stats = getStats(srcPath);

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

function writeFile(src, srcPath, outPath) {
    var
    parsed, content,
    plugin = cor.loader.plugins[cor.path.ext(srcPath)];

    //console.log(srcPath); return;

    if (plugin) {
        print('    from: ' + srcPath);

        parsed  = cor.path.parse(outPath);
        content = plugin.toJs(src, outPath).src;

        print('    to:   ' + outPath + '\n');
    }
    else {
        content = src;
    }

    fs.writeFileSync(outPath, content);
}

function writeAll(dirPath) {
    var
    i, len, parsed, outPath,
    srcPath, absPath;

    for (i = 0, len = sourceDirs.length; i < len; i++) {
        absPath = cor.path.join(dirPath, sourceDirs[i]);
        makePath(cor.path.split(absPath));
    }

    print('Compiling:\n');

    for (srcPath in sourceCode) {
        outPath = cor.path.join(dirPath, srcPath);
        parsed  = cor.path.parse(outPath);

        outPath = parsed.root + parsed.dir + cor.path.basename(outPath, cor.path.ext(outPath)) + '.js';
        writeFile(sourceCode[srcPath], srcPath, outPath);
    }

    console.log('\nOutput in ' + path.resolve(dirPath));
}

function compile(sourcePath, outPath) {
    var stats = getStats(sourcePath), parsed;
    
    if (! stats) { return; }
    
    read(sourcePath);
        
    if (stats.isFile()) {
        parsed = cor.path.parse(sourcePath);        
        outPath = outPath || parsed.root + parsed.dir + cor.path.basename(sourcePath, cor.path.ext(sourcePath)) + '.js';
        writeFile(sourceCode[''], sourcePath, outPath);
    }
    else if (stats.isDirectory()) {
        outPath = outPath || cor.path.basename(sourcePath) + ('js_' + (new Date()).getTime());
        writeAll(outPath);
    }
}

var
cmd = new cor.CliCommand('compile', 'compile sources');
cmd.addArgument('path', 'path to the directory which contains source files to be compiled', true);

cmd.addOption('o', 'name of the directory to write the compiling result');
cmd.addOption('v',   'print file names as the are compiled');
cmd.setAction(function (input, app) {

    cliInput = input;
    cliApp   = app;
    sourcePath = cor.path.sanitize(cliInput.getArgument('path'));

    var
    basePath   = cor.path.cwd();

    if (input.getOption('v')) {
        print = app.print;
    }

    compile(sourcePath, cliInput.getOption('o'));
});

module.exports = cmd;
