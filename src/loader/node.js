require('../cor.js');
require('../class.js');
require('./loader.js');

var
loader,
path    = require('path'),
fs      = require('fs'),
loeader = cor.loader = new cor.Loader();

cor.Loader.prototype.readFile = function(path, from, onLoad, onError) {
    fs.readFile(path, 'utf8', function(err, data) {
        if (err) {
            onError(path, from);
        }
        else {
            onLoad(path, from, data);
        }
    });
}


require('./plugins.js');
