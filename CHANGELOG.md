# 0.10.0

Many pending features and radical changes were added to Cor in this version, example, the new builtin function for regular expressions, also some syntax has changed. Croutines, concurrency, and parallelism were introduced in this version.

* Add template literals (string interpolation)
* Square brackets '[ and ']' is no longer part of the syntax in object constructors and arrays, now it uses parenthesis '(' and ')'
* Add `regex` builtin function
* Object and array constructors are now primary expressions
* Add coroutines
* Add the asynchronic operations
* Add `timeout` builtin function
* Add channels


# 0.6.0

0.6.0 Is one of the major releases since the first Cor release. This release brings automatic testing with CircleCI and `run` command is now available, so you can now do `cor run path/to/file.cor` in node.js

* Add more tests
* Fix a bug in the playground that din't let it work properly in firefox
* `compile` command now works properly whaen compiling a single file
* The node Loader was refoctored
* Function now can be written in compact mode, e.g `func sum(a, b) a + b`
* New for/in/range loop


# 0.4.0

Interesting features has been added to Cor this time, the exception handling has been revamped with simplified syntax while it remains fully compatible with javascript exceptions model. The Cor syntax now supports the *exist* (`?`) operator, which is a good replacement for the `if` statement to check for existence, it makes `Cor` more expressive but still sober and readable.


Let's see an example of error handling in `0.4.0`:
```
// throwing errors
func explode() { error('Booooom!') }

// handling error
func handleError() {
    catch horror() {
        console.log(error())
    }
}
```

* Syntax
    * Add Exist Operator `?`, example: `customers[0]?.accounts?.length`
    * Change the old try/catch/finally for the `catch/error` statement
* Remove the package system in favor of well known modules
* Add social icons and links to Documentation



# 0.3.0

This release brings important language additions in order to look modern allowing to write less code without loosing readability. Was added the coalesce operator (`??`), also the `&` symbol now should be used as a replacement of `@` to create new objects. Now the lambda function has a convenient shorter syntax to fill some use cases, however, the new syntax does not replaces the classic one.

A show case using some features of the new syntax. Lets assume we are using **Underscore.js**:

Before `0.3.0`:
```
stooges = [
    @[name: 'curly', age: 25],
    @[name: 'moe',   age: 21],
    @[name: 'larry', age: 23],
]

func init() {
    ch = _.chain(stooges)
    ch.sortBy(func(s){ return s.age })
    ch.map(func(s){ return s.name + ' is ' + s.age })

    console.log(ch.first().value()) // "moe is 21"
}
```

With `0.3.0`:
```
stooges = [
    &[name: 'curly', age: 25],
    &[name: 'moe',   age: 21],
    &[name: 'larry', age: 23],
]

func init() {
    ch = _.chain(stooges)
    ch.sortBy(func(s) s.age)
    ch.map(func(s) s.name + ' is ' + s.age)
    
    console.log(ch.first().value()) // "moe is 21"
}
```
As you can see, the code with `0.3.0` is cleaner and still remains readable with a modern look.

* Syntax
    * Add coalesce operator `??`
    * Add `&` operator for literal contruction
    * Deprecate `@` operator for literal contruction in favor of `&`
    * Simplify lambda functions, now the body can be an expression whithout to be warpped by `{}`
* AST
    * Improve the way internal variables are generated avoiding conflict whith user defined variables
* Documentation
    * Add syntax hihghlighter for Cor code
    * Change the index.html page to be more engaging
    

# 0.2.6

Important changes has been factored since `0.2.1`, the most important new feature is the possibility to build your project in 4 different ways: `domready`, `commonjs`, `amd` and `global`. Hence you can deliver your _lib/app_ with full compatibility in the `js` ecosystem. The compiler now preserves comments(either `doc-block` and `single line comment`) and translate it to javascript comments which is very useful for the sake of source documentation and debugging.

* Loader
    * Refactor the way it evals `js` source
* Cli
    * Build command now produces a named function to improve debugging experience
    * Build command now supports for `amd`, `commonjs` and `amd` package types
    * Fixed a bug in bin/cor.cmd, it now gets arguments properly
* Compiler
    * Preserver comments and passthrough it as javscript comments
    * Improve source-map support for classes and string literals
    * improve routes tranformation in `use` statement
    * Fixed bug, now throws when pass invalid routes, e.g ('', '!@#@')
* Refactoring
    * separate loader path proccessing logic from the loader itself

# 0.2.1

This release removes multiple inheritance in favor of single inheritance. Said that, from this release we promote composition over inheritance, however you can use single inheritance depending on your needs.

* Fix bug, `super` no longer can be called from a class which does not inherits
* Change the way `super` is used
* Refactor the site
* Improve performance in yy.MethodNode
* Playground minor refactoring
* Remove multiple inheritance in favor of single inheritance, see issues #2 and #4
    * Refactor the parser grammar
    * Add CRL.extends
    * Remove CRL.defClass
* Update docs

# 0.1.4 

This release fixes a malformation of `bower.json` among others. The changes introduced in `0.1.0` qre now documented.

* Fix bug in the lexer (cor.l), it no longer recognize "(digit)(char)" as a valid identifier
* Fix `bower.json` malformation
* Add `make release` task
* Update docs

# 0.1.0

The `0.1.0` release has a lot of bug fixes and refactoring related to the lexer and the AST. In this release we add the *Playground* to the documentation to allow developers to see the `js` code result of the compilation. The forum is now in Ost.io

* Remove -crl option in `build` command. Support CRL embedding by default and add -no-crl option
* Refactor CRL
    * Change `defineClass` to `defClass`
    * Menial refactoring
* Add a playground page to the docs
* Change '$' char by '__' in variable generation
* Class now compiles in a different way making it more compatible with ES5 prototypes 
* Restructured documentation, there is now a content table for the reference
    * Joined to one page, laguage reference and command reference
    * nav-bar element position is not `fixed` anymore
* Lot of bug fixing and AST refactoring
* Fix bug, in cor.l, it no longer recognizes {digit}{char}+ as a valid identifier
* '$' character can now be used in identifiers
* Clean code in http command, default port is now 9000
* Improved docs
* Moving the forum to http://ost.io/@yosbelms/cor
* Modified README.md

# 0.0.2

The main motivation of this release is to provide an installable package for testing availability in NPM and Bower repositories.

Shipping :

* Compiler
* Loader
* Source-maps
* AST
* CRL
* Docs
* CLI tools