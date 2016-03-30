#!/usr/bin/env node

path        = require('path');
showdown    = require('./docs/assets/showdown.min.js');
packageJson = require('./package.json');

require('shelljs/make');

// writes an array of files join it and writes
// the result to a targetFile
function writeToDist(files, targetFile) {
    var
    header  = '/*\n' + cat('LICENSE') + '*/\n',
    content = cat(files);

    (header + content).to(targetFile + '.js');
}

// find the firts <h1> tag an uses its content
// to set <title> tag inside page body
function setPageTitle(html) {
    var parsed, title = '';

    parsed = /<h1 ([\s\S]+)?>([\w\s]+)?<\/h1>/.exec(html);
    if (parsed) {
        title = parsed[2] || '';
    }

    return html.replace(/<title>([\w\s]+)?<\/title>/, '<title>Cor - ' + title + '</title>');
}

// takes HTML source as input, regarding h1, h2, h3... tags
// it generates a "table of contents"
function generateTableOfContents(html) {
    var toc = '<h2>Table of Content</h2>';

    html.replace(/(?:\<h)(\d)\s*(?:id\=")(\w*)(?:"\>)([\s\S]*?)(?:\<\/h)/g, function() {
        var
        level = arguments[1],
        id    = arguments[2],
        text  = arguments[3];

        if (level != 1) {
            toc += '<a class="toclink toclink-'+ level +'" href="#' + id + '"' + '>' + text + '</a>';    
        }
        
    });

    return toc;
}

// clean and build the project including the parser,
// distribution packages and documentation
// usage: make
target.all = function() {
    target.clean();
    target.parser();
    target.dist();
    target.docs();
    target.test();
}

// runs all clean tasks
// usage: make clean
target.clean = function() {	
    target.cleandist();
    target.cleandocs();
    target.cleantest();
    target.cleanparser();
}

// clean `dist` directory
// usage: make cleandist
target.cleandist = function() {
    echo(' + cleaning dist');
    rm('-rf', 'dist');
}

// removes all .html files inside
// `docs` directory
// usage: make cleandocs
target.cleandocs = function() {
    echo(' + cleaning doc');
    rm('-rf', 'docs/*.html');
}

// clean `dist` directory
// usage: make cleandist
target.cleantest = function() {
    echo(' + cleaning test');
    rm('-rf', 'test/test*.js');
}

// remove the `parser`
// usage: make cleanparser
target.cleanparser = function() {
    echo(' + removing parser');
    rm('-rf', 'src/parser.js');
}

// to run test from nodejs
// usage: make test
target.test = function() {
    echo(' + testing');
    exec(__dirname + '/bin/cor ' + __dirname + '/test/node.cor');
}

// generates the parser using Jison(jison.org) library
// usage: make parser
// for debugging: make parser -- debug
target.parser = function(debug) {
    echo(' + generating parser');
    var
    gen, parserSrc,
    opts    = {
        debug: debug == 'debug' || false,
        type: 'lalr',
        moduleName: 'CorParser',
        moduleType: 'js'
    },
    fs      = require('fs'),
    jison   = require('jison'),
    bnf     = require('jison/node_modules/ebnf-parser'),
    lex     = require('jison/node_modules/lex-parser'),
    grammar = bnf.parse(fs.readFileSync('./src/bnf/cor.y', 'utf8')),
    lexer   = lex.parse(fs.readFileSync('./src/bnf/cor.l', 'utf8'));

    grammar.lex = lexer;
    gen         = new jison.Generator(grammar, opts);
    parserSrc   = gen.generate(opts);
    parserSrc   += '\ncor.Parser = CorParser.Parser; delete CorParser;';

    fs.writeFileSync('./src/parser.js', parserSrc);
}

// build and create distribution packages
// and writes to ./dist/*
// usage: make dist
target.dist = function() {
    target.cleandist();
    echo(' + creating distribution packages');

    var
    files = [
        'src/crl.js',
        'src/cor.js',
        'src/class.js',
        'src/parser.js',
        'src/scope/env.js',
        'src/scope/scope.js',
        'src/compiler.js',
        'src/sourcemap.js',
        'src/loader/path.js',
        'src/loader/loader.js',
        'src/loader/browser.js',
        'src/loader/plugins.js',
    ];

    if (! test('-d', 'dist')){
        mkdir('dist');
    }

    writeToDist(files, 'dist/cor');
    writeToDist('src/crl.js', 'dist/crl');
}

// generate project documentation
// usage: make docs
target.docs = function() {

    target.cleandocs();

    var
    i, len, outFile, converter,
    html, outPath,
    prefix = cat('docs/assets/docs.prefix'),
    suffix = cat('docs/assets/docs.suffix'),
    files  = ls('docs/*.md');

    echo(' + generating doc');

    for (i = 0, len = files.length; i < len; i++) {
        converter = new showdown.Converter();
        outFile   = path.basename(files[i], '.md') + '.html';
        html = converter.makeHtml(cat(files[i]));
        
        if (files[i] === 'docs/documentation.md') {
            html = html.replace('<toc/>', generateTableOfContents(html));
        }

        html      = prefix + html + suffix;
        outPath   = path.normalize('./docs/' + outFile);
        setPageTitle(html).to(outPath);

        echo('   ' + outPath);
    }
}

// run tests
target.test = function() {
	echo(' + testing')
    exec('node ./bin/cor run ./test/node.cor');
}

// make a release, publishing a new tag
// usage: make release
target.release = function() {

    if (!which('git')) {
        echo('this command requires "git" to be installed')
        exit(1)
    }

    if (!which('npm')) {
        echo('this command requires "npm" to be installed')
        exit(1)
    }

    var
    out = exec('git branch --no-color', {silent: true}).output,
    version = /\*\s+([\w\.]+)/.exec(out)[1];

    if (version == packageJson.version) {
        echo('+ releasing ' + version);
        exec('git tag v' + version)
        exec('git push origin master --tags')
        exec('npm publish .')
    }
    else {
        echo('+ current branch does not match with the "version" in package.json');
    }    
}