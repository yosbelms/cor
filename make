#!/usr/bin/env node

path = require('path');
showdown = require('./docs/assets/showdown.min.js');
require('shelljs/make');

function writeToDist(files, targetFile) {
    var
    header  = '/*\n' + cat('LICENSE') + '*/\n',
    content = cat(files);

    (header + content).to(targetFile + '.js');
}

function setPageTitle(html) {
    var parsed, title = '';

    parsed = /<h1 ([\s\S]+)?>([\w\s]+)?<\/h1>/.exec(html);
    if (parsed) {
        title = parsed[2] || '';
    }

    return html.replace(/<title>([\w\s]+)?<\/title>/, '<title>' + title + '</title>');
}


function generateTableOfContents(html) {
    var toc = '<h1>Table of Content</h1>';

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

target.all = function() {
    target.clean();
    target.parser();
    target.dist();
    target.docs();
}

target.clean = function() {
    target.cleandist();
    target.cleandocs();
    target.cleantest();
}

target.cleandist = function() {
    echo(' + cleaning dist');
    rm('-rf', 'dist');
}

target.cleandocs = function() {
    echo(' + cleaning doc');
    rm('-rf', 'docs/*.html');
}

target.cleantest = function() {
    echo(' + cleaning test');
    rm('-rf', 'test/test*.js');
}

target.test = function() {
    require('./test/run_node.js');
}

target.parser = function(debug) {
    echo(' + generating parser');
    var
    gen, parserSrc,
    opts    = {
        debug: debug || false,
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

    //console.log(grammar);
    gen         = new jison.Generator(grammar, opts);
    parserSrc   = gen.generate(opts);
    parserSrc += '\ncor.Parser = CorParser.Parser; delete CorParser;';

    fs.writeFileSync('./src/parser.js', parserSrc);
}

target.dist = function(args) {
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
        'src/loader/loader.js',
        'src/loader/browser.js',
        'src/loader/plugins.js',
    ];

    if (! test('-d', 'dist')){
        mkdir('dist');
    }

    // for browsers
    if (args && args[0] === 'shim') {
        echo('  + adding ES5 shims');
        files.unshift(
            'vendor/es5-shim/es5-shim.js',
            'vendor/es5-shim/es5-sham.js'
        );
    }

    writeToDist(files, 'dist/cor');
    writeToDist('src/crl.js', 'dist/crl');
}

target.docs = function() {

    target.cleandocs();

    var
    i, len, outFile, converter,
    html, outPath,
    pre   = cat('docs/assets/pre'),
    post  = cat('docs/assets/post'),
    files = ls('docs/*.md');

    echo(' + generating doc');

    for (i = 0, len = files.length; i < len; i++) {
        converter = new showdown.Converter();
        outFile   = path.basename(files[i], '.md') + '.html';
        html = converter.makeHtml(cat(files[i]));
        
        if (files[i] === 'docs/documentation.md') {
            html = generateTableOfContents(html) + html;
        }

        html      = pre + html + post;
        outPath   = path.normalize('./docs/' + outFile);
        setPageTitle(html).to(outPath);

        echo('   ' + outPath);
    }
}
