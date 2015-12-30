# Documentation

This is a reference manual for the Cor programming language. It will guide you inside language aspects and concepts, including experimental features to be added in future releases. Cor is a language designed with web development in mind. Programs are constructed from packages and modules, whose properties allow management of dependencies.

<toc/>

## Semicolon Insertion

Cor grammar uses semicolon to terminate statements, but those semicolons doesn't need to appear in the source. Instead, the lexer applies a simple rule to insert semicolons automatically as it scans, so you can avoid write it. **The rule is:** If the last token before a newline is an identifier (which includes keywords), a basic literal such as a number or string constant, or one of the tokens: `++ -- ) }` the lexer always inserts a semicolon after the token.

## Expressions

### Functions

Functions may be defined using syntax such as the following:
```
func sum(a, b) {
    return a + b
}
```


### Lambda

Lambdas are functions that can be used as values, hence, they are assignables.

```
mult = func(a, b) {
    return a * b
}
```

With simplified syntax:
```
mult = func(a, b) a * b

// usage
console.log(mult(2, 3)) // echoes 6
```


### Comments

Cor supports two types of comments, one line comments, and multi-line comments. The first type starts when the lexer finds `//` and terminates in the first end of line. The second type starts once the lexer finds `---` and ends in the next occurrence of `---`. This style is also known as `docblock`.

Example:
```
---
sum(a int, b int) int
This function returns the result of a plus b
---
func sum(a, b) {
    // sum two numbers
    return a + b
}
```


### Variables and Lexical Scoping

Cor does not has a keyword to declare variables, instead, Cor declares it for you the first time it is used. If a variable with equal name is declared in outer scope the compiler will assume you are using the declared outside. Unless you write the variable as a simple statement. This technique is called **variable announcing**.

Example:
```
outer = 'outer value'

func changeGlobal() {
    outer = 'inner value'
}

func init() {
    changeGlobal()
    console.log(outer) // 'inner value'
}
```
`changeScope` function changes the value of `outer` variable defined in module scope.

```
outer = 'outer value'

func changeLocal() {
    outer // force to use it as local, even if is declared in outer scope
    outer = 'inner value'
}

func init() {
    changeLocal()
    console.log(outer) // 'outer value'
}
```
In above fragment, `outer` variable will be declared in a local scope by **announcing** it inside `changeLocal` function.


### Objects

Objects are a collection of variables and functions. It may be created using `&` operator.
> In previous versions it was possible to use `@` operator, but is now deprecated.
```
// creates an empty object
obj = &[]

// filling properties
obj.name = 'Aaron'
obj.age  = 20

```

Object properties can be assigned in more declarative way by using `Literal Constructors`
```
client = &[
    name : 'Aaron',
    age  : 20,
    pet  : &[
        name : 'Kitty',
        kind : 'Cat',
    ],
]
```

There is two ways to access object properties, by using `.` symbol or by using `[` `]` wrappers.
```
client.age = 20
console.log(client.age)
// will print '20'

client['age'] = 20
console.log(client['age'])
// will print '20'
```


### Literal Constructors

A literal constructor is a list of elements bounded by `[` and `]` symbols, used for creating objects and arrays. An element can be either, expression or a key-value pair. If one element is key-value type, all other elements has to be key-value in the same declaration.

Example using key-value pair elements:
```
walter = &Client[
    name : 'Walter',
    age  : 12,
]
```

Example using expression elements:
```
aaron = &Client['Aaron', 20]

// aaron.name = 'Aaron'
// aaron.age  = 20
```

### Strings

A string is a series of characters delimited by `'` symbol, can be defined as following:
```
aaron  = 'Aaron Swartz'
walter = 'Walter O\'Brian'

// multi-line
query = '
    SELECT
        *
    FROM Article
    WHERE slug = ?
'
```


### Numbers

Numbers can be specified using any of the following syntaxes:
```
// integer
n = 3

// signed
n = +4
n = -8

// with floating point
n = 4.7
n = +6.3
n = -50.2

// with exponential part
n = 4e12
n = 4E12
n = 3e+4
n = 3e-10

```


### Operators
Operators are the following:

```
// 1 - Assignment
*=  /=  %=  +=  -=  <<=  >>=  >>>=  &=  ^=  |=

// 2 - Comparison
<=  >=  ==  !=  <   >

// 3 - Arithmetic
++  --  +   -

// 4 - Binary Bitwise
&   |   ^

// 5 - Binary Logical
&&  ||  !

// 6 - Binary Shift
<<  >>  >>>

// 7 - Other
??
```

The operators `==` and `!=` are translated to `===` and `!==` in the same order.


### Coalesce

The coalesce operator returns the first value that is not `nil` nor `undefined`. `nil` is returned only if all operands are `nil` or `undefined`. It replaces javascript `||` when substituting default value for `nil` or `undefined` values.

Examle:

```
summary = article.summary ?? article.content ?? '(no content)'
```

This returns the articles's summary if exists, otherwise returns the content of the article if exists, otherwise retuns `(no content)`.


### Arrays

An array is a collection of ordered values. It may be defined using literal constructor with expressions as elements. Example:
```
empty  = []
colors = ['red', 'green', 'blue']
foo    = [bar(), 56, 'baz']

// accessing
color1 = colors[0]
color2 = colors[1]

// color1 == 'red'
// color2 == 'green'
```


### Slices

Slice expression construct an array from an existing array.
```
colors = ['red', 'green', 'blue']

sliced = colors[1:2] // sliced is ['green', 'blue']
sliced = colors[:1]  // sliced is ['red', 'green']
sliced = colors[1:]  // sliced is ['green', 'blue']
```


### Type Assertion

Type assertions checks if a value is an instance of a class. Having the following syntax:
```
value.(Class)
```
The result of type assertion evaluation is a `Boolean` value.
```
obj = &Object
isObject = obj.(Object) // true

class Runner {}

rnr = &Runner
isRunner = rnr.(Runner) // true
isRunner = obj.(Runner) // false

```


### Classes

A class is a "blueprint" for objects, Cor has its own approach and keeps compatibility with javascript. Unlike javascript's `this` which references the execution scope, Cor's `me` identifier is available as a reference to the class  instance.
```
class Client {
    firstName
    lastName
    accounts
    
    func getName() {
        return me.firstName + ' ' + me.lastName
    }
}

client           = &Client
client.firstName = 'Walter'
client.lastName  = 'Martinez'

name = client.getName()
//name == Walter Martinez
```

A complex example:
```
class Client {
    firstName
    lastName
    accounts
}

class Account {
    code
    ammount
}

client = &Client[
    firstName : 'Aaron',
    lastName  : 20,
    accounts  : [
        &Account[
            code    : '3980-121970',
            ammount : 5000,
        ],
    ],
]
```


### Initialization

There is two ways to define class initialization. The first way is by declaring a property-set before any method declaration:
```
class Animal {
    name
    movement
    
    // methods...
}


// a = &Animal['snake', 'slithering']
// a = &Animal[
//      name:     'snake',
//      movement: 'slithering',
//  ]
```

The second one is by declaring `init` as the first member of the class. You should use this way case of inheriting from a class defined in a javascript library which relays in `constructor` e.g: views and models of Backbone.js. Using this approach does not mean there is a `init` method in the compiled `js`, it will be translated to `constructor`, so that if you use `super` builtin function, it will call the constructor of the super class, see [Super (Builtin Function)](#superbuiltinfunction).

Example:
```
class Animal : Model {
    func init(name, movement) {
        me.name     = name
        me.movement = movement
        super()
    }
    
    // methods...
}

// a = &Animal['snake', 'slithering']
```

> You can use eiter, `init` method of property-set, but not both.


### Inheritance

Cor supports single inheritance by using `:` operator. It embraces javascript prototype chain, so it is safe to use it along with any javascript libraries.

Example:
```
class Shape {
    func getArea() {
        //...
    }
}

class Triangle : Shape {
    func getArea() {
        //custom area
    }
}
```
In above example `Triangle` class inherits from `Shape` class.



### Super (Builtin Function)

The `super` builtin function calls a method of the super class. It will call the method with equal name to the current method where `super` is located. It should compile to `<SuperClass>.prototype.<Method>.apply(this, arguments)`

Example:

```
class Employee {
    func getSalary() {
        return 3000
    }
}

class Chairman : Employee {
    func getSalary() {        
        return super()*2
    }
}
```

Calling `super` with parameters:
```
class Window {
    func show(position) {
        me.renderTo(position)
    }
}

class DialogBox : Window {
    func show() {
        super('center')
    }
}
```


## Modules

A module is a `.cor` file containing definitions and declarations that can be used by other modules. Variables, classes and functions defined in a module are all exported without needing a keyword or a special statement. The name of the file is the name of the module with `.cor` suffix.

Cor modules are `CommonJS` compliant, so it is possible to use Cor modules from javascript and vice versa, whenever it implements `CommonJS` specifications.

Example:
```
// math.cor

PI = 3.141592

func circleArea(r) {
    return r * r * PI
}

class Circle {
    radius
    func area() {
        return circleArea(me.radius)
    }
}
```
This module exports `PI` variable, `circleArea` function and `Circle` class. Once a module is required, it initializes by executing(if exists) a function named `init`. Modules initializes the first time is required.

Example:
```
http = nil

func init() {
    http = &HttpServer
}

```
Once this module is initialized, `http` variable will have an instance of `HttpServer` class.

There are three types of modules.
1. **Main Module:** Is the module which has the same name as its package with `.cor` suffix.
2. **Exposed Module:** Are modules that the first letter of its name is uppercased and it can be accessed from any other module outside or inside of it's package, but just can be used the construction (variable, class or function) which has the name equal to the module name. It is an attempt to be compliant with coding standards which enforces to have a class per file.
3. **Inner Module:** Is a module which can be only used in other modules inside the same package. It is a inner module if it is not a main module and is not exposed.

> A module may only contain variable declarations, functions, classes, and `use` statements.

Example:

```
app                       
  |── app.cor             // main module
  |── model               
  |     |── Client.cor    // exposed module
  |     |── Account.cor   // exposed module
  |     └── util.cor      // inner module
  ...
  |
  |── controller  
  └── view
        
```


## Packages

A package is a directory containing one or several modules and/or subpackages. The name of the package is equal to the name of the directory. The `main module` is module located inside a package with equal name to the package followed `.cor` suffix. That is the right place to write API for humans. Once a package is required through `use` keyword the main module will be loaded and exported variables, classes and functions will be available for usage.

Example of a package named `math`:
```
math              // package
  |── math.cor    // main package module
  └── util.cor    // module

```

With a supackage named `finance`:
```
math                      // package
  |── math.cor            // main package module
  |── util.cor            // module
  └── finance             // subpackage
        |── finance.cor   // main package module
        └── Loan.cor      // module
```

In above examples you could see a basic package structure where each directory is a package and every `.cor` file located inside is a module.


## Statements


### For loop

For loops similar to javascript For statement, but with higher flexibility. It has two syntaxes, the first is:
```
for Start; Continuation; Statement {
    Statements
}
```

Example:
```
fruits = ['orange', 'apple', 'pear']

for i = 0, len = fruits.length; i < len; i++ {
    console.log(fruits[i])
}

// orange
// apple
// pear
```

Each one of these expressions can be empty.
```
// infinite loop
for ;; {

}

// whith only ContinuationExpression
for ; i == len; i ++ {

}
```

The second syntax is more compact than previous, it replaces `while` statements founded in many programming languages. The syntax is:
```
for Condition {
    Statements
}
```

Example:
```
// executes while i is less than 10
for i < 10 {
    i++
}

// executes while cm is truthy
for cm = comments.next() {
    cm.show()
}

// infinite loop
for {
    
}
```

If you need to jump to the next iteration or to get out of the current curl, `break` and `continue` are there for you, it behaves exactly as in javascript.

```
array = [4, 3, 'Cor', 'PHP', 5, 'Go', 1, 7, 'Python']
langs = []

for item = array.shift() {
    if item.(Number) { continue }
    langs.push(item)
}
```


### For/In

A for/in loop provides the easiest way to iterate collections. There are two syntaxes; the second one is a slight extension of the first.

The first syntax gives access to the current value in each iteration.
```
arr = [1, 2, 3]
sum   = 0

for value in arr {
    sum += value
}

// sum == 6
```

The second way is similar but exposes the current index and value in each iteration.
```
arr = ['Jeremy', 'Nolan', 'Brendan']

for index, value in arr {
    console.log(index + ' ' + value)
}

// 0 Jeremy
// 1 Nolan
// 2 Brendan
```

For-In can be used to iterate over object properties
```
obj = &[name: 'Bill', age: 50]

for index, value in obj {
    console.log(index + ' ' + value)
}

// name Bill
// age 50
```
> For-In statements does not iterates through the object prototype.


### If/Else

`if` statement is one of the most important features in many languages including Cor. It allows the execution of conditional code fragments.

Example:
```
// if-else
if a < b {
    
} else {
    
}

// with else-if
if a < b {
    
} else if b == 0 {
    
}
```


### Switch/Case/Default

With Cor you don't need to remember to `break` after every `case`. Cor switch statements prevents accidental fall-though by automatically breaking at the end of each `case` clause.

Switch statements in Cor can take multiple values for each `case` clause. If any of the values match, the clause runs.
```
switch good {
    case 'House' : fee = 50
    case 'Boat'  : fee = 20
    case 'Car'   : fee = 10
    default      :
        fee = 0
        console.log('The citizen has no House, Boat, or Car')
}

// with multiple values in a single case clause
switch num {
    case 0, 1 : alert('0 or 1')
    case 2, 3 : alert('2 or 3')
}
```


### Inc/Dec

Inc/Dec statement increments or decrements an expression. Similar features are found in many languages but these are offered as an expression, in Cor it is a statement.

Example:
```
// correct usage
func init() {
    a = 0
    a++
    a--
}
```

The grammar enforces to be used as a statement.
```
// will cause a parsing error
// because it is used as an expression
b = a++
```

### Use

Use statement requests modules previously defined. It is possible to achieve by using `use` keyword which behaves ruled by some conventions.

Example. Using a subpackage:
```
use './math'

func init() {
    console.log(math.PI)
}
// 3.141592
```

Aliases can be used for abbreviation or to avoid name collisions inside module scope
```
use './finance' fnc

func init() {
    m = fnc.newMortgage(352000)
}

```

Use a module located in the same package
```
use '.util'

func init() {
    util.square(3)
}
// 9
```


Notice the `.` just in the beginning of the module name in the route of above example. As you can see, there is an important difference between `./` and `.` prefixes, `./` can be translated as *"package relative to the current path"* and `.` can be translated to *"module located in the same package"*.

Module routes which base name starts with uppercased letter, example: `./model/Client`, that imports a defined variable, class or function having the name equal to the route base name. Consider the following example:

`Project structure`
```
app
  |── controller
  |      |── Client.cor
  |      └── ...
  └── model
         |── Client.cor
         └── ...
```

`app/store/Client.cor`
```
class Client : Store {
    func findAll() {
        // return a promise
    }
}
```

`app/controller/Client.cor`

Using a module with base name having first letter uppercased
```
use '../model/Client' ClientStore

class Client : Controller {
    func index() {
        store = &ClientStore
        store.findAll().then(func(){
            //...
        })
    }
}
```


## Exceptions (*Experimental)

Cor has an exception model similar to that javascript to guarantee interoperability between both languages. So, `try/catch/finally` syntax is very close to javascript syntax.
```
// just try
try {

}

// try/catch/finally
try {

} catch errVar {

} finally {

}

```

`errVar` is an identifier which contains the throwed error, it can be avoided:
```
try {

} catch {

}
```

to `throw` an expression will cause a program error.
```
try {
    throw 'Bang!'
} catch {
    console.log('Explosion silenced')
}
```


## Commands

Cor cli is available as a [Node.js](http://nodejs.org) utility, it allows you to compile and build sources. Commands are used as subcommands of Cor program, for instance `cor build`. Each command may have parameters and options, parameters are passed after the name of the command and options are specified using the following format: `-option=value` which must be specified after parameters. To know about usage, `help` command is there for you. Running `cor help` or just `cor` would show available commands, and `cor help [command]` will print usage of the specified `command`.


### Help
`help` command prints documentation about available commands. Is a tool to guide `cor` cli usage without to get out of the console.

Usage:
```
cor help [command]
```
Will shows available commands. Also prints usage and documentation about a specified command.

Example:
```
cor help build
```
Prints documentation about `cor build` command

```
cor help compile
```
Prints documentation about `cor compile` command


### Build

`build` command compiles packages and its dependencies, the resulting javascript code will be packed and written to a standalone `.js` file inside the specified package. CRL will be embedded in the head of the resulting file. The `build` command supports four types of packages: AMD, CommonJS, Global and DOM Ready.

Usage:
```
cor build <path> [build options]
```

<table>
    <tbody>
        <tr><td colspan="2">Arguments:</td></tr>
        <tr>
            <td class="cmd-arg"><code>path</code></td>
            <td>Specifies the path to the entry file or package to compile.</td>
        </tr>
        <tr><td colspan="2">Options:</td></tr>
        <tr>
            <td class="cmd-arg"><code>-o</code></td>
            <td>Specifies the name of the file where the resulting javascript code will be written, if not specified the file name will be the base name of the entry file with <code>.js</code> suffix.</td>
        </tr>
        <tr>
            <td class="cmd-arg"><code>-env</code></td>
            <td>Specifies the path to the <code>.json</code> file to use as environment configuration.</td>
        </tr>
        <tr>
            <td class="cmd-arg"><code>-type</code></td>
            <td>Specifies the type of the resulting package. The supported types are <code>domready</code>, <code>commonjs</code>, <code>amd</code> and <code>global</code>. It must be provided separated by <code>,</code>(<i>do not write spaces between</i>). <code>domready</code> type will be used by default if <code>-type</code> option is omitted.</td>
        </tr>
        <tr>
            <td class="cmd-arg"><code>-no-crl</code></td>
            <td>If used will not embed CRL(Cor Runtime Library) in the head of the compiling result.</td>
        </tr>
        <tr>
            <td class="cmd-arg"><code>-v</code></td>
            <td>If used will print additional information during building process.</td>
        </tr>
    </tbody>
</table>


Example:
```
cor build myapp
```
Builds `myapp` package and its dependencies and creates a file named `myapp.cor.js` inside `myapp` directory containing the resulting javascript code.

```
cor build myapp -crl -o=app.js
```
In this case the output file is named `app.js` and CRL will be embedded in the beginning of the file.

```
cor build myapp -env=myapp/env.json
```
Builds `myapp` package and tells compiler the environment file is located at `myapp/env.json`.

```
cor build ./mylib -type=amd,commonjs,global
```
Build `./mylib` package making it available through AMD, CommonJS and Global api.

### Compile

`compile` command compiles packages and put the result in the specified directory. Every file contained in the source package will be copied to the destination directory as they are, except `.cor` or any other file processed by the loader extensions. These files will be compiled and written to the file system as `.js`.

Usage:
```
cor compile <path> [compile options]
```

<table>
    <tbody>
        <tr><td colspan="2">Arguments:</td></tr>
        <tr>
            <td class="cmd-arg"><code>path</code></td>
            <td>Specifies the path to the package to compile.</td>
        </tr>
        <tr><td colspan="2">Options:</td></tr>
        <tr>
            <td class="cmd-arg"><code>-o</code></td>
            <td>Specifies the path to the directory where the compiled package will be written. The default name has the format: <code>compiled_{timestamp}<code></td>
        </tr>
        <tr>
            <td class="cmd-arg"><code>-v</code></td>
            <td>Specifies whether to print or not file names as they are compiled.</td>
        </tr>
    </tbody>
</table>


Example:
```
cor compile ./mylib
```
Compiles `mylib` package creates a directory named `mylib_js_` followed by a timestamp, here is where the compiled content will be written.

```
cor compile mylib -o=../delivery_dir/mylib
```
In this case the output directory is `../delivery_dir/mylib`


### Http

`http` command launch a simple http server using current directory (`cwd`) as the root. If a directory is requested it will list all files inside as a list of html links (`<a href=""></a>`). This server is for development purpose; do not use it in production.

Usage:
```
cor http [http options]
```

<table class="command-args">
    <tbody>
        <tr><td colspan="2">Options:</td></tr>
        <tr>
            <td class="cmd-arg"><code>-port</code></td>
            <td>Specifies the port where the server will listen requests. Default is <code>9000</code></td>
        </tr>
    </tbody>
</table>


Example:
```
cor http
```
Launch an http server using `9000` port.

```
cor http -port=8790
```
Using `8790` port.


## The Loader

The loader is a component which manages dependencies and dynamically loads files into the browser by using Ajax. It is extensible, so, it is possible to add support for any processor, for example, markdown, or mustache templates. It expects every requested file to be `CommonJS` compliant. It is intended to be used just for development, so, once the cource is compiled and packed the loader is not needed any more.

The loader supports `.js` files loading out of the box, if you need to write some javascript code do not hesitate, put down the source taking into account `module`, `exports` and `require` objects, parts of `CommonJS` specification.

This is a valid Cor project:
```
// filename: app.cor

use './util.js'     util
use './template.js' tpl

func show(){
    util.ajax('http://server.com/api.php').then(func(r) tpl.render(r))
}

func init() {
    show()
}

```


## The CRL (Cor Runtime Library)

The CRL is a small (~3Kb) library which makes possible to take advantage of features such as *for/in statements, inheritance, type assertions, among others*. Without the CRL, the javascript code obtained as the result of compilation could be repetitive and bigger in consequence, that's one of the reasons that CRL exits, to provide a small set of features that will be internally used by the javascript resulting code.