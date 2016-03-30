# Get started

Cor promotes modularity, conventions and code organization, it is built for scalable applications development. The language itself allows organization and the syntax enforces you to write mantainable code. With Cor, you can use any library written in javascript or import from javascript any library written and built with Cor.


## Download

Cor can be downloaded in several ways depending on different needs. The Cor compiler can run in any javascript environment however it's priority is the browser.


### From GitHub

Available releases can be downloaded from [here](https://github.com/yosbelms/cor/releases). Once downloaded, decompress the bundle (.zip or .tar). The main script can be found at `cor/dis/cor.js` ready to be included in production evironments.


### With NPM

To install it globally:
```
npm install -g cor-lang
```
You must use this way for CLI usage.


To install it locally:
```
npm install cor-lang
```
You must use this way for programatic usage or for client-side development.


### With Bower

If you prefer Bower as package manager make sure to have Node.js and Bower installed.

To install Bower run:

```
npm install -g bower
```
Once installed you can install Cor, from the CLI run:

```
bower install cor-lang
```

After that, you are able to include the distribution script located at bower_components/cor/dist/cor.js in any html file through the <script></script> tag.

<scritp type="text/javascript" src="bower_components/cor/dist/cor.js">

## First steps

### In Node.js

The CLI tools are available as a [Node.js](http://nodejs.org) utility. To use Cor from Node.js you must install it using NPM:
```
npm install -g cor-lang
```

Leave off the `-g` if you don't wish to install globally:
```
npm install cor-lang
```

Execute a script:
```
cor run /path/to/source.cor
```

Compile a script:
```
cor compile /path/to/source.cor
```

Once globally installed using NPM you have access to `cor` command which can compile and build sources. For CLI usage run `cor help` command. The files containing source code should have `.cor` extension.

The `build` command will compile and pack source code and its dependences to one file. The `compile` command will just compile the provided source code contained in a directory or file.

For commands reference see [Commands](documentation.html#commands).


### In the browser

Cor is designed with client-side development in mind, it dynamically load files using XHTTPRequest object, so that, hot-realoading is an amazing feature to keep you away from CLI compile/watch tools for a smooth client-side development. Because XHTTPRequest object, application source must be behind a web server (Apache HTTP Server, Nginx, or that you like). The Cor CLI tools provides a static HTTP server through `http` command which can be used with the same purpose.


After install Cor globally, you may run:
```
// from the directory to be served
cor http
```
The server will publish in port `9000` unless you have chosen a different one.


To bootstrap Cor in development mode include Cor library (located at `node_modules/cor-lang/dist/cor.js` if NPM was used to install it locally) inside a HTML file using a `script` tag, then specify the application entry script using `data-entry="path/to/script.cor"` in a separated script tag, for example:
```
<html>
    <script type="text/javascript" src="node_modules/cor-lang/dist/cor.js"></script>
    <script data-entry="hello.cor"></script>
</html>
```

See the [documentation](documentation.html) for further reading.