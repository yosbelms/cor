require('../parser.js');
require('../scope/env.js');
require('../scope/scope.js');
require('../compiler.js');
require('../loader/node.js');

var
confFilename,
entryPath,
loader = cor.loader = new cor.Loader();


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