require('../cor.js');
require('../class.js');
require('./path.js');
require('./loader.js');

var
path = require('path'),
fs   = require('fs');

cor.Loader.prototype.readFile = function(path, from, onLoad, onError) {
    fs.readFile(path, 'utf8', function(err, data) {
        if (err) {
            onError(path, from);
        }
        else {
            onLoad(path, from, data);
        }
    });
};

cor.loader = new cor.Loader();
require('./plugins.js');