# Get started

Cor is an open source language that compiles to javascript, it is designed for application-scale development. You can install it from NPM and use the CLI tools with [Node.js](http://nodejs.org).

## Download

The Cor compiler can run in any javascript environment however is primarily devised to run in the browser. You can download available releases <a class="button-inline" href="https://github.com/yosbelms/cor/releases">here</a>.

It can be also downloaded with [Bower](http://bower.io):

```
bower install cor-lang
```

The CLI tool is available as a [Node.js](http://nodejs.org) utility. For commands reference see [Commands](commands.html).

From NPM:

```
npm install -g cor-lang
```

Directly from git repository:

```
npm install -g yosbelms/cor
```

Once installed using NPM you should have access to `cor` command which can compile and build sources. For cli usage run `cor help` command. The files containing source code should have `.cor` extension. However, Cor read files through `Cor Loader`, a component that can be extended to add support for any kind of processors such as Markdown, Handlebars, YAML... and every else.

Examples:

* Compiles and builds `app.cor` file and its dependences, the resulting file should be located at `app.cor.js` file:
```
cor build app.cor
```

* Compiles and builds `app` package and its dependences writing the result to `./app/app.js` file:
```
cor build ./app -o=app.js
```

Output file (`app.js`) is now ready to be used in a web page through `<srcipt src="app.js"></script>` tag. See [commands](commands.html) for reference.


## Hello World tutorial

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

* **Step 4.** Run `cor http` inside `hello` folder and open `http://127.0.0.1/index.html` in a browser, you should see a `Hello World` alert.

See the [reference](reference.html) for further information about the language.
