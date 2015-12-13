# Get started

Cor is built for scalable applications development. Its package system leads to organization and the syntax enforces teams to write mantainable code.

## Download

Cor can be downloaded in several ways depending on different needs. The Cor compiler can run in any javascript environment however is primarily devised to run in the browser.

## From GitHub

Available releases can be downloaded <a class="button-inline" href="https://github.com/yosbelms/cor/releases">here</a>.

Once downloaded, decompress the bundle (.zip or .tar) and the main scritp can be located at `cor/dis/cor.js`

## With Bower
If you prefer [Bower](http://bower.io) as package manager make sure to have [Node.js](http://nodejs.org) and [Bower](http://bower.io) installed.

To install [Bower](http://bower.io) run:

```
npm install -g bower
```

Once installed you can run:

```
bower install cor-lang
```

You can include the distribution script located at `bower_components/cor/dist/cor.js`
```
<scritp type="text/javascript" src="bower_components/cor/dist/cor.js">
```


## With NPM

The CLI tools are available as a [Node.js](http://nodejs.org) utility. To install Cor from NPM run:

```
npm install -g cor-lang
```

Directly from git repository:

```
npm install -g yosbelms/cor
```

Once installed using NPM you should have access to `cor` command which can compile and build sources. For cli usage run `cor help` command. The files containing source code should have `.cor` extension. However, Cor read files through `Cor Loader`, a component that can be extended to add support for any kind of processors such as Markdown, Handlebars, YAML... and every else. For commands reference see [Commands](documentation.html#commands).

The `build` command will compile and pack source code and its dependences to one file, `compile` command will just compile the provided source code contained in a directory or file.

Examples:

```
cor build app.cor
```
Compiles and builds `app.cor` file and its dependences, the resulting file should be located at `app.cor.js` file.

```
cor build ./app -o=app.js
```
Compiles and builds `app` package and its dependences writing the result to `./app/app.js` file. Output file (`app.js`) is now ready to be used in a web page through `<srcipt src="app.js"></script>` tag. See [commands](documentation.html#commands) for reference.

If you are planning to use it with [Node.js](http://nodejs.org) you should use `compile` command instead.
```
cor compile <directory> -o <output-directory>
```
Unlike `build` command `compile` does not include `CRL` in the compiled scripts, you must manually add it by `CommonJS` `require` function.

Example:
```
require('cor-lang/dist/crl.js');
app = require('./app/app.js');
```


## Hello World tutorial

Cor dynamically load files using XHTTPRequest object. So, application source must be behind a web server (Apache HTTP Server, Nginx, or that you like). The CLI tools of Cor which provides a static HTTP server through `http` command also can be used with the same purpose.

* **Step 1.** Make the following file tree structure:
```
hello
  |── index.html
  └── hello.cor
```

* **Step 2.** Write the following source to `hello.cor` file:
```
func init() {
    alert('Hello World')
}
```

* **Step 3.** Include Cor library (located at `cor/dist/cor.js`) inside `index.html` using `script` tag and then specify the application entry script using `data-entry="hello.cor"` in a separated script tag:
```
<html>
    <script type="text/javascript" src="cor/dist/cor.js"></script>
    <script data-entry="hello.cor"></script>
</html>
```

* **Step 4.** Start the HTTP server and open `http://localhost:port/index.html`. Otherwise, if you installed Cor CLI tool form NPM run `cor http` inside `hello` folder and open `http://localhost:9000/index.html` in the browser, you should see a `Hello World` alert.

See the [documentation](documentation.html) for further information about the language.
