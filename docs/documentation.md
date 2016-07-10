# Documentation

This is a reference manual for the Cor programming language. It will guide you inside language aspects and concepts. Cor is a language designed with large web development in mind. Hence, is possible to develop your software without to execute any command to compile the source code, CLI tools are only needed to make the product able for production environments.

<toc/>


## Quick recap
### Inlcuding modules
```
use '../jquery.js'
use './module'
```

### Functions
```
// as a statement
func sum(a, b) {
    return a + b
}

// simplified statement
func sums(a, b) a + b

// as expression
mult = func(a, b) {
    return a * b
}

// simplified expression
mults = func(a, b) a * b


// module initializer
func init() {
    jquery('.panel').html(render())
}
```

### String Interpolation
```
str = $'hello my name is {person.name}'
```

### Concurrency/Parallelism/Coroutines/Channels
```
// corotines starts with `go`
go {
    // block until the result is resolved
    accounts = <- fetch.get($'http://rest-api.com/client/{id}/accounts')
    for account in accounts {
        //...
    }
}
```

```
// unbuffered channel
ch = chan()
go {
    for num in 1:100 {
        // send
        ch <- num
    }
}

go {
    // receive
    c = <- ch
    console.log(c)
}
```

```
// parallel
go {
    result = <- (
        books    : fetch.get($'http://rest-api.com/client/{id}/books'),
        articles : fetch.get($'http://rest-api.com/client/{id}/books'),
    )

    for book in result.books {
        //..
    }

    for articles in result.articles {
        //..
    }
}

```

### Slices/Coalesce Operator/Conditional Operator
```
---
Coalesce operator
---
// if `null` or `undefined` then be an empty array
panels = getPanels() ?? (,)

---
Slice
---
// first 5 panels
five = panels[0:5]

---
Conditional operator
---
five.forEach(func(pan) pan.maximize?())

pan.maximize?()
h = pan?.height
c = pan.children?[0]
```

### Classes/Inheritance/Instance
```
---
classes are prototype based underlaying
---

class Model {
    // property with default value
    id = genId()
    conn

    // initializer
    func init() {}

    // method
    func save() {}
}
```

```
---
inheritance is fully compatible with javascript prototypal inheritance
---
class Person : Model {
    name
    age
    func getName() me.name
    func getAge()  me.age

    // method overriding
    func save() {
        me.beforeSave()
        // super call
        super()
    }
}
```

```
---
use `&` symbol to create instances
---

// new instance
person = &Person

// instance and properties setting
person = &Person(
    name : 'John',
    age  : 23,
)

// positional properties setting
person = &Person('John', 23)

// person.name == 'John'
// person.age == 23
```

### If/For/Switch
```
// module initializer
func init() {
    // if
    if foo == 'bar' {
        sum()
    }

    // infinite for
    for { }

    // like `while (a) { ... }`
    for a { }

    // for-in, works for arrays and objects own properties
    for value in array { }
    for key, value in array { }

    // for-in-range
    for i in 0:10 {
        val = arr[i]
    }

    // classic for
    for i = 0; i < arr.length; i++ { }

    // switch
    switch foo {
        case 1     : doOne()
        case 2     : doTwo()
        // multiple cases
        case 3,4,5 : doThreeFourFive()
        // default case
        default    : doOtherwise()
    }
}
```

### Type Assertion/Errors
```
func init() {

    // type assertion `expression.(Class/Constructor)`
    func isString(obj) {
        return obj.(String)
    }
    
    isPerson = obj.(Person)

    func launchError() {
        // throw an error
        error('Error launched')
    }
    
    ---
    catch evaluates a expression and executes a block
    of code if an error happends
    ---
    catch launchError() {
        // the builtin `error()` function returns the error object
        console.log(error())

        // also can be used to throw an error
        // it rethrows the caught error if no parametter is passed
        error()
    }

}
```


## Platform Compatibility

Coroutines are based in generators, so, if you plan to use concurrency features in old versions of Node.js or browsers without generator support, you must use [gnode](https://github.com/TooTallNate/gnode) and/or [regenerator](http://facebook.github.io/regenerator/). The following platforms are supported without 3rd party tools:

### Servers

* Node.js 4+

When using Node.js 0.11.x or greater, you must use the `--harmony-generators` flag or just `--harmony` to get access to generators.

### Browsers

* Firefox 27+
* Chrome 39+
* Opera 26+
* Edge 13+

Chrome between 28 and 38 are supported by turning on an experimental flag.


## Semicolon Insertion

Cor grammar uses semicolon to terminate statements, but those semicolons doesn't need to appear in the source. Instead, the lexer applies a simple rule to insert semicolons automatically as it scans, so you can avoid write it. **The rule is:** If the last token before a newline is an identifier (which includes keywords), a basic literal such as a number or string constant, or one of the tokens: `++ -- ) }` the lexer always inserts a semicolon after the token.

## Expressions

### Functions

Functions may be defined using syntax such as the following:
```
// as a statement
func sum(a, b) {
    return a + b
}

// as expression
mult = func(a, b) {
    return a * b
}
```

It can be used in a simplified way.
```
func sums(a, b) a + b

mults = func(a, b) a * b
```
The body of the simplified way is an expression to be returned. This kind of syntax is usefull for callbacks passing, functional nuances ors compact code style.

```
func init() {
    array.map(func(o) o.id).filter(func(o) o.age >= 18)
}
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
```
// creates an empty object
obj = &Object

// filling properties
obj.name = 'Aaron'
obj.age  = 20

```

Object properties can be assigned in more declarative way by using `Literal Constructors`
```
client = (
    name : 'Aaron',
    age  : 20,
    pet  : (
        name : 'Kitty',
        kind : 'Cat',
    ),
)
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


### Parenthesis Expressions

A parenthesis expression is bouded by `(` and `)` symbols, it evaluates depending on what is inside, followig the rules:

1. If there is just one value it evaluates to that value.
2. If at least a `:` it returns an object.
3. If at least a `,` it return an array.

If one element inside is key-value type, all other elements has to be key-value in the same declaration.

```
// rule #1, expression
expr = (4)

// rule #2, object
obj  = (:)
obj  = (name: 'john')

// rule #3, array
arr  = (,)
arr  = (1,)
arr  = (1, 2, 3)
```

Example using key-value pair list:
```
walter = &Client(
    name : 'Walter',
    age  : 12,
)
```

Example using expression list:
```
aaron = &Client('Aaron', 20)

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


### Templates (String Interpolation)

Templates or string interpolation is a string literal with trailing `$` symbol and curly braces to define the bounds of the expressions within the string, example:
```
str  = $'Hello {person.name}!'
```

It is possible to use string delimiters inside the expressions:
```
str  = $'Hello {person['name']}!'
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

// 7 - Existential
??  ?

// 8 - Async Operator
<-
```

The operators `==` and `!=` are translated to `===` and `!==` in the same order.


### Coalesce

The coalesce operator returns the first value that is not `nil` nor `undefined`. `nil` is returned only if all operands are `nil` or `undefined`. It replaces javascript `||` when substituting default value for `nil` or `undefined` values.

Examle:

```
summary = article.summary ?? article.content ?? '(no content)'
```

This returns the articles's summary if exists, otherwise returns the content of the article if exists, otherwise retuns `(no content)`.


### Exist Conditional

Sometimes code tends to drown a bit in existence-checking. The exist-conditional operator lets you access members and elements only when the receiver exists, providing an empty result otherwise:

Example:

```
someFunc?()
```

The above example should be translated to: *if `someFunc` exists, call it*. It also can be used with indexes, selectors and slices.

```
len  = customers?.length
frst = customers?[0]
copy = customers?[:]
```


### Arrays

An array is a collection of ordered values. It may be defined using literal constructor with expressions as elements. Example:
```
empty  = (,)
colors = ('red', 'green', 'blue')
foo    = (bar(), 56, 'baz')

// accessing
color1 = colors[0]
color2 = colors[1]

// color1 == 'red'
// color2 == 'green'
```


### Slices

Slice expression constructs an array from an existing array, it is a syntactic sugar for the javascript `slice` method. You can use the syntax: `array[start:length]`, start and length are optionals.
```
colors = ('red', 'green', 'blue')

sliced = colors[1:3] // sliced is ('green', 'blue')
sliced = colors[:1]  // sliced is ('red')
sliced = colors[1:]  // sliced is ('green', 'blue')
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


### Coroutines

Coroutines are blocks containig code that executes asynchronously. It can be defined using the `go` keyword followed by a block. Coroutines can be also used as expressions, its execution starts once evaluated, it returns a **Promise** object.

Example:
```
go {
    // code...
}
```

Used as expression:
```
prom = go {
    return 'yosbelms'
}

prom.then(func(s) console.log(s))

// will print 'yosbelms'
```
> Coroutines are based in generators, see [platform compatibility](#platformcompatibility)


### Asynchronic Operator

The asynchronic operator `<-` allows to block coroutines and wait to receive future values (Promises) if a Promise is returned, also can be used to send values to [Channels](#chan). Asynchronic operators can be used only inside coroutines (`go` blocks)
```
go {
    accounts = <- fetch.get($'http://rest-api.com/client/{id}/accounts')
    for account in accounts {
        //...
    }
}
```

If receiving a array or object of future values it will resolve all values in parallel.
```
go {
    result = <- (
        books    : fetch.get($'http://rest-api.com/client/{id}/books'),
        articles : fetch.get($'http://rest-api.com/client/{id}/books'),
    )

    for book in result.books {
        //..
    }

    for articles in result.articles {
        //..
    }
}
```

Awaiting a coroutine (idiomatic Cor):
```
// get articles in the las hour
func findArticlesByTag(tag) go {
    articles <- fetch.get($'http://rest-api.com/article')
    return articles.filter(func(a) a.tag == tag)
}

func renderArticles() go {
    &ArticlesView(<- findArticlesByTag(tag))
}
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

client = &Client(
    firstName : 'Aaron',
    lastName  : 20,
    accounts  : (
        &Account(
            code    : '3980-121970',
            ammount : 5000,
        ),
    ),
)
```

`me` keyword always references the internal scope of the class regardless its actual scope:
```
class Foo {
    func bar() { }    
    func baz() {
        f = func() {
            me.bar() // call bar method of Foo class
        }
    }
}
```
In the above example `me` keyword is used inside a lambda scope, however it references the instance object of the `Foo` class.

> The `this` keyword is intact, you can use it as in javascript, however it may lead to unsafe code, use `this` at your own risk.

#### Initialization

There is two ways to define class initialization. The first way is by declaring a property-set before any method declaration:
```
class Animal {
    name
    movement
    
    // methods...
}


// a = &Animal('snake', 'slithering')
// a = &Animal(
//      name:     'snake',
//      movement: 'slithering',
//  )
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

// a = &Animal('snake', 'slithering')
```

> You can use eiter, `init` method or property-set, but not both.


#### Inheritance

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



## Builtin Functions

### Super

The `super` function calls a method of the super class. It will call the method with equal name to the current method where `super` is located. It should compile to `<SuperClass>.prototype.<Method>.apply(this, arguments)`

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


### Regex
The `regex` function enables to use regular expressions in Cor. The regular expression syntax is equal to JavaScript regular expressions.
```
reg  = regex('pla[a-z]?')
// with flags
regf = regex('gi(t)+', 'ig')
```

Furthemore, it can be multilined:
```
r = regex('
    pla
    [a-z]?
')
```


### Chan

`chan(bufferSize, tranformer)`

The `chan` function creates a channel. A channel is a structure to allow comunication and synchronization between coroutines.

Channels can be buffered or unbuffered. When sending data through unbuffered channels it always blocks the sender until some other process receives. Once the data has been received, the sender will be unblocked and the receptor will be blocked until new data is received. Unbuffered channels are also known as _synchronic channels_. When some data is sent to a buffered channel it only blocks the coroutine if the buffer is full. The receiver only blocks if there is no data in the buffer.

* The fist parameter defines the buffer size, if omitted or `nil` is provided the created channel will be unbuffered.

* The transformer is a function that transfor values to send though the channel.

The created channels are objects that can be closed using `.close()` method, to check whether is closed or not use `.closed` property.

Example:
```
// unbuffered channel
ch = chan()
go {
    for num in 1:100 {
        // send
        ch <- num
    }
}

go {
    // receive
    c = <- ch
    console.log(c)
}
```

Transformer example:
```
// transform value*2
ch = chan(nil, func(s) s*2)

go {
    for num in 1:3 {
        ch <- num
    }
}

go {
    console.log(<- ch)
}

---
output:
2
4
---
```


### Timeout

`timeout(msecs)`
The timeout function blocks the execution of a coroutine during the specified milliseconds.

Example:
```
go {
    timeout(100)
    console.log('after 100 milliseconds')
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

> A module may only contain variable declarations, functions, classes, and `use` statements.

Modules which the first letter of its name is uppercased only exports the construction (variable, class or function) which has the name equal to the module name. This convention replaces `CommonJS` `module.exports` however is completely compatible whith it.

Example:

Let's suppose we have the following project structure:
```
app
  |── app.cor
  └── model
        └── User.cor
```

In `model/User.cor`
```
class User {
    username
    password    
}
```
There is a class named equal to the `filename`, so it will be exported by default. Any other function or variable defined in the module wil not be exported.

In `app.cor`
```
use 'model/User'

func init() {
    u = &User('ragnar', 'secretpass')
}
```
Don't need to qualify the name when importing throwgh `use` statement because the class `User` will be exported as default.


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
fruits = ('orange', 'apple', 'pear')

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
array = (4, 3, 'Cor', 'PHP', 5, 'Go', 1, 7, 'Python')
langs = (,)

for item = array.shift() {
    if item.(Number) { continue }
    langs.push(item)
}
```


### For/In

A for/in loop provides the easiest way to iterate collections. There are two syntaxes; the second one is a slight extension of the first.

The first syntax gives access to the current value in each iteration.
```
arr = (1, 2, 3)
sum = 0

for value in arr {
    sum += value
}

// sum == 6
```

The second way is similar but exposes the current index and value in each iteration.
```
arr = ('Niña', 'Pinta', 'Santa María')

for index, value in arr {
    console.log(index + ' ' + value)
}

// 0 Niña
// 1 Pinta
// 2 Santa María
```

For-In can be used to iterate over object properties
```
obj = (name: 'Bill', age: 50)

for index, value in obj {
    console.log(index + ' ' + value)
}

// name Bill
// age 50
```
> For-In statements iterates through the object own prototype.

### For/In/Range

The For/in/range flavor is a convenient syntanctic sugar that regards most of the iteration use cases.
```
for i in [0:100] {
	// ...
}

// is the same to
for i = 0; i < 100 ;i++ {

}
```


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

Switch statement is even more generic, one can omit the main expression, the `true` value will be evaluated in place of the omitted expression:
```
switch {
    case x > 2 : doSomething()
    case x < 2 : doOtherThing()
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

Use statement imports modules previously defined. The `use` keyword behaves ruled by some conventions.

Example:
```
// importing math.cor
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

You may see [Modules](#modules) and [Configuration](#configuration) as a complement.

### Catch/Error

Cor has a simple exception model that works very well with javascript exceptions, it guarantees full interoperability between both languages. The `catch` statement executes a defined block of instructions if a exception is thrown by a watched expression.
```
catch WatchedExpression {
    // ... instructions
}
```

Example:
```
catch someFunc() {
    console.log(error())
}
```
if `error()` builtin function is used as a value it will return the thrown error. It should throw otherwise.

Example:
```
catch someFunc() {
    // throw catched error
    error()
    
    // throw custom error
    error(&TypeError)
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

### Run

`run` command reads and executes a `.cor` file containing Cor source code.

Usage:
```
cor run <path> [run options]
```

<table>
    <tbody>
        <tr><td colspan="2">Arguments:</td></tr>
        <tr>
            <td class="cmd-arg"><code>path</code></td>
            <td>Specifies the path to the file to execute.</td>
        </tr>
        <tr><td colspan="2">Options:</td></tr>
        <tr>
            <td class="cmd-arg"><code>-conf</code></td>
            <td>Specifies the path to the <code>.json</code> file to use as configuration.</td>
        </tr>
    </tbody>
</table>

Example:
```
cor run path/to/file.cor
```
Runs a program located in the specified path.


### Build

`build` command compiles `.cor` files and its dependencies, the resulting javascript code will be packed and written to a standalone `.js`. The CRL will be embedded in the head of the resulting file unless you use `-no-crl` oprtion. The `build` command supports four types of packages: AMD, CommonJS, Global and DOM Ready.

Usage:
```
cor build <path> [build options]
```

<table>
    <tbody>
        <tr><td colspan="2">Arguments:</td></tr>
        <tr>
            <td class="cmd-arg"><code>path</code></td>
            <td>Specifies the path to the entry file to build.</td>
        </tr>
        <tr><td colspan="2">Options:</td></tr>
        <tr>
            <td class="cmd-arg"><code>-o</code></td>
            <td>Specifies the name of the file where the resulting javascript code will be written, if not specified the file name will be the base name of the entry file with <code>.js</code> suffix.</td>
        </tr>
        <tr>
            <td class="cmd-arg"><code>-conf</code></td>
            <td>Specifies the path to the <code>.json</code> file to use as configuration.</td>
        </tr>
        <tr>
            <td class="cmd-arg"><code>-type</code></td>
            <td>Specifies the type of the resulting bundle. The supported types are <code>domready</code>, <code>commonjs</code>, <code>amd</code> and <code>global</code>. It must be provided separated by <code>,</code>(<i>do not write spaces between</i>). <code>domready</code> type will be used by default if <code>-type</code> option is omitted.</td>
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
cor build myapp.cor
```
Builds `myapp` program and its dependencies and creates a file named `myapp.cor.js` inside `myapp` directory containing the resulting javascript code.

```
cor build myapp.cor -crl -o=app.js
```
In this case the output file is named `app.js` and CRL will be embedded in the beginning of the file.

```
cor build myapp -env=myapp/env.json
```
Builds `myapp.cor` program and tells compiler the environment file is located at `myapp/env.json`.

```
cor build ./mylib.cor -type=amd,commonjs,global
```
Build `./mylib.cor` file making it available through AMD, CommonJS and Global api.

### Compile

`compile` command compiles source contained in a directory and put the result in the specified output directory. Every file contained in the source dir will be copied to the destination preserving the original directory structure as they are, except `.cor` or any other file processed by the loader. These files will be compiled and written to the file system as `.js`.

Usage:
```
cor compile <path> [compile options]
```

<table>
    <tbody>
        <tr><td colspan="2">Arguments:</td></tr>
        <tr>
            <td class="cmd-arg"><code>path</code></td>
            <td>Specifies the path to the directory which contains files to compile.</td>
        </tr>
        <tr><td colspan="2">Options:</td></tr>
        <tr>
            <td class="cmd-arg"><code>-o</code></td>
            <td>Specifies the path to the directory where the compiled files will be written. The default name has the format: <code>compiled_{timestamp}<code></td>
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
Compiles source inside `mylib` directory and creates a directory named `mylib_js_` followed by a timestamp, here is where the compiled content will be written.

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

The loader is a component which manages dependencies and dynamically loads files into the browser by using Ajax and using `fs` library on Node.js. It is extensible, so, it is possible to add support for any processor, for example, Markdown, or Mustache. It expects every requested file to be `CommonJS` compliant. It is intended to be used just for development, so, once the cource is compiled and packed the loader is not needed any more.

The loader supports `.js` files loading out of the box, hence it is possible to use thirth party javascript libraries compliant with `CommonJS` specifications.

This is a valid Cor project:
```
// filename: app.cor

use './jquery.js'   jquery
use './template.js' tpl

func show() {
    jquery.get('http://server.com/api.php', func(r) tpl.render(r))
}

func init() {
    show()
}
```

### Configuration

The configuration file must be in JSON format, but not javascript object literal, it will affect the behavior of the loader beeing used to resolve dependencies. This file should be named `conf.json` just for convention, however you can choose de name you prefer. It must be used with `-conf` option in `cor build` command or with `data-conf` in HTML pages. All relative paths defined are relative to the configuration file. The file might look like this:
```
{    
    "paths" : {
        "jquery"     : "node_modules/jquery/dist/jquery.js",
        "underscore" : "node_modules/underscore/underscore.js",
        "backbone"   : "node_modules/backbone/backbone.js"
    },
    
    "ignore"         : ["fs", "child_process"]
}
```

Values:

* **paths**: The mapping from routes (used with `use` statement in Cor or with `require` function in javascript) to file paths.

* **ignore**: The routes to be ignored.

With the above example we could write:
```
// Backbone.js requires jQuery and Underescore.js
// the loader will handle it

use 'backbone' bbone

class TodoModel : bbone.Model {
    // ...
}
```


#### Dependence injection

If you have not catched on, the configuration file is good resource for dependence injection. Check the following configuration:
```
{
    
    "paths" : {
        "jquery" : "node_modules/zepto/zepto.js"
    }
}
```
In the above case we inject Zepto.js to be used used as `jquery` replacement under the same route.


## Cor in the Browser

Cor library (located at `cor/dist/cor.js`) should be inlcuded using a script `tag` inside a html page for development environments:
```
<html>
    <script type="text/javascript" src="cor/dist/cor.js"></script>
</html>
```
Once the DOM is ready the Loader will look for a script tag containig the `data-entry` or `data-conf` attribute, or both to boot the application. Example:

```
<script data-entry="myapp.cor"></script>
```
In the above example was setted `myapp.cor` module as the entry of  the application.

Example using a `.js` module as entry:
```
<script data-entry="./myapp.js" data-conf="./conf.json"></script>
```

The Cor distribution for browsers is recomended only for development purpose, to take advantage of the hot-realod avoiding the *compile* step in the *coding/compile/run/test* worflow. However you must use the `build` command before to put an application in production, example: `cor build ./myapp.cor -conf=./conf.json` and utilize the resulting standalone `.js` file which will contain all the application and its dependences.


## The CRL (Cor Runtime Library)

The CRL is a small (~13Kb unminified and uncompressed) library which makes possible to take advantage of features such as *for/in statements, inheritance, type assertions, among others*. Without the CRL, the javascript code obtained as the result of compilation could be repetitive and bigger in consequence, that's one of the reasons that CRL exits, to provide a small set of features that will be internally used by the javascript resulting code.