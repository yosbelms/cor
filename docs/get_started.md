# Get started

Cor is an open source language that compiles to javascript, it is designed for application-scale development. You can install it from NPM and use the CLI tools with [Node.js](http://nodejs.org).

### Key Concepts

* **Symplicity:** Cor has a very simple and clear syntax which leverages Go, C# and Python languages enforcing developers to write maintainable code.
* **Embrace the Web:** Cor highlights the best parts of the web and it keeps that you love, it is friend of javascript's good parts.
* **Scalability of Maintenance:** Software is not just written and forgotten, it must be maintained. Cor empower you to write scalable software by providing structures such as packages, modules and classes.
* **Development Experience:** Cor brings coding/run/test development flow. It is possible thanks to an asynchronous pluggable loader which compiles sources in the fly, offering the best possible development experience thanks to self-contained source-maps. However, it provides CLI tools to compile and build sources.

## Installation

Cor compiler can run in any javascript environment however is primarily devised to run in the browser. The parser is written using [Jison](http://jison.org) and the CLI tool is available as a [Node.js](http://nodejs.org) utility. For commands reference see [Commands](commands.html).

From NPM:

```
npm install -g cor-lang
```

Directly from git repository:

```
npm install -g yosbelms/cor
```

Once installed you should have access to `cor` command which can compile and build sources. For cli usage run `cor help` command. The files containing source code should have `.cor` extension. However, Cor read files through `Cor Loader`, a component that can be extended to add support for any kind of processors such as Markdown, Handlebars, YAML... and every else.

Examples:

* Compiles source code located in `src` directory and writes it to `compiled` directory:
```
cor compile src -o=compiled
```

* Compiles and builds `app.cor` and its dependences and writing the result to `app.js` file:
```
cor build app.cor -o=app.js
```
Output file (`app.js`) is now ready to be used in a web page by `<srcipt src="app.js"></script>` tag. See [commands](commands.html) for reference.


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

* **Step 3.** Include Cor library (located at `corlang/dist/cor.js`) inside `index.html` using `script` tag and then specify the application entry script using `data-entry="hello.cor"` in a separated script tag:
```
<html>
    <script type="text/javascript" src="cor/dist/cor.js"></script>
    <script data-entry="hello.cor"></script>
</html>
```

* **Step 4.** Run `cor http` inside `hello` folder and open `http://127.0.0.1/index.html` in a browser, you should see a `Hello World` alert.

See the [reference](reference.html) for further information about the language.
