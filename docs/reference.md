# Reference

This is a reference manual for the Cor programming language.

Cor is a language designed with web development in mind. Programs are constructed from packages and modules, whose properties allow management of dependencies.

## Key Concepts

* **Symplicity:** Cor has a very simple and clear syntax which leverages Go, C# and Python languages enforcing developers to write maintainable code.
* **Embrace the Web:** Cor highlights the best parts of the web and it keeps that you love, it is friend of javascript's good parts.
* **Scalability of Maintenance:** Software is not just written and forgotten, it must be maintained. Cor empower you to write scalable software by providing structures such as packages, modules and classes.
* **Development Experience:** Cor brings coding/run/test development flow. It is possible thanks to an asynchronous pluggable loader which compiles sources in the fly, offering the best possible development experience thanks to self-contained source-maps. However, it provides CLI tools to compile and build sources.

## Loader

The loader is a component which manages dependencies and dynamically loads files into the browser. It is extensible, so, it is possible to add support for any processor, for example, markdown, or mustache templates. It expects every requested file is `CommonJS` compliant. It is intended to be used in development environments, so, the loader is not needed once sources are compiled and packed.

**Embrace the Web** is one of the Cor's key concepts, because that Cor attempts to be friendly with the technologies that move the Web. The loader supports `.js` files loading out of the box, if you need to write some javascript code do not hesitate, put down the source taking into account `module`, `exports` and `require` objects, parts of `CommonJS` specification.


## CRL (Cor Runtime Library)

CRL is a small library which makes possible to take advantage of features such as *literal constructors, for-in statements, class combination and type assertions*, these beloved Cor properties would not be possible without CRL. Cor tends to depend less on it, but, without the CRL, the javascript code obtained as the result of compilation could be repetitive and bigger in consequence, that's one of the reasons that CRL exits, to provide a small set of features that will be internally used by compiled routines.


## Semicolon Insertion

Cor grammar uses semicolon to terminate statements, but those semicolons doesn't need to appear in the source. Instead, the lexer applies a simple rule to insert semicolons automatically as it scans, so you can avoid write it.

**The rule is:** If the last token before a newline is an identifier (which includes keywords), a basic literal such as a number or string constant, or one of the tokens: `++ -- ) }` the lexer always inserts a semicolon after the token.


## Functions

Functions may be defined using syntax such as the following:
```
func sum(a, b) {
    return a + b
}
```

Also can be used as a value.
```
mult = func(a, b) {
    return a * b
}
```


## Comments

Cor supports two types of comments, one line and multiple line comments. The first type starts when the lexer finds `//` and terminates in the first end of line.

Example:
```
// this is a one line type comment
```
The second type starts once the lexer finds `---` and ends in the next occurrence of `---`. This style is also known as `docblock`.

Example:
```
---
This is a docblock
---
```

Example to show comments usage:
```
---
sum(a int, b int) int
This function returns the result of a plus b
---
func sum(a, b) {
    // sum two numbers
    c = a + b
    // return the result
    return c
}
```


## Variables and Lexical Scoping

Cor does not has a keyword to declare variables, instead Cor declares it for you the first time it is used. If a variable with equal name is declared in outer scope the compiler will assume you are using the declared outside. Unless you write the variable as a simple statement. This technique is called **variable announcing**.

Example:
```
insane = true

func init() {
    insane = false
}
```
`init` function changes the value of `crazy` variable defined in outer scope.

```
insane = true

func init() {
    insane
    insane = false
}
```
in above fragment, `insane` variable will be declared in a local scope by **announcing** it inside `init` function.


## Objects

Objects are a collection of variables and functions. It may be created using `@` operator:
```
// creates an empty object
obj = @[]

// filling properties
obj.name = 'Aaron'
obj.age  = 20

```

Object properties can be assigned in more declarative way by using `Literal Constructors`
```
client = @[
    name : 'Aaron',
    age  : 20,
    pet  : @[
        name : 'Kitty',
        kind : 'Cat'
    ]
]
```

There is two ways to access object properties, by using `.` symbol or by using `[` `]` wrappers.
```
client.age = 20
console.log(client.age)
// will print '20'
```

The object properties are stored as keys which can be accessed using `['property']` syntax.
```
client['age'] = 20
console.log(client['age'])
// will print '20'
```


## Literal Constructors

A literal constructor is a list of elements bounded by `[` and `]` symbols, used for objects and arrays. An element can be either, expression or a key-value pair. If one element is key-value type, all other elements has to be key-value in the same declaration.

Example using key-value pair elements:
```
walter = @Client[
    name : 'Walter',
    age  : 12
]
```

Example using expression elements:
```
aaron = @Client['Aaron', 20]

// aaron.name = 'Aaron'
// aaron.age  = 20
```


## Classes

A class is a "blueprint" for objects; it may be defined using syntax such as the following. It is a feature borrowed from Object Oriented(OO) languages, which does not mean Cor is OO:
```
class Client {
    name
    age

    func getAge() {
        return me.age
    }
}
```
It defines a class named Client with properties `name` and `age` and a method `getAge`. `me` identifier is available as a reference to the class  instance. Classes may be instantiated using `@` operator.
```
client      = @Client
client.name = 'Walter'
client.age  = 12
age         = c.getAge()

// age should be 12
```

A complex example:
```
class Client {
    name
    age
    pet
}

class Pet {
    name
    kind
}

client = @Client[
    name : 'Aaron',
    age  : 20,
    pet  : @Pet[
        name : 'Kitty',
        kind : 'Cat'
    ]
]
```


## Class Combination

Often you need a class with members similar to members of an existing class. Cor supports a sort of inheritance by combining class’s members. Classes may be combined using `:` operator. By the way, it is a good practice to define a generic class and adapt it for different purposes by combining different class definitions.

Example:
```
class Shape {
    color
}

class Triangle : Shape {
    points = []
}
```
In above example `Triangle` class are the result of combining `Shape` members with `Triangle` definition.

Cor can combine multiple classes as well
```
class MySQL : db.SQL, Observable {

}
```


## Super (Builtin Function)

`super` builtin function calls a method of a class passed as parameter. It would call the method with equal name to the current method where `super` is in, even if the passed class is not combined.

Example:

```
class Sup {
    func num() {
        return 3
    }
}

class Sub : Sup {
    func num() {
        // calling num method of Sup class
        return super(Sup) + 5
    }
}

class Class {
    func num() {
        super(Sup)
    }
}
```

`super` can be called with parameters:
```
class Window {
    func show(position) {
        me.renderTo(position)
    }
}

class Dialog : Window {
    func show() {
        super(Window, 'center')
    }
}
```

A complex example to show `super` usage:
```
class Employee {
    workedHours
    perHour

    func monthSalary() {
        return me.workedHours * me.perHour
    }
}

class Chairman : Employee {
    bonus
    perHour = 40

    func monthSalary() {
        return super(Employee) + me.bonus
    }
}

// initialize the module

func init() {
    e = @Chairman[
        workedHours : 250,
        bonus       : 700
    ]
    s = e.monthSalary()

    expect(s).toEqual(10700)
}
```

## Modules

A module is a `.cor` file containing definitions and declarations that can be used by other modules. Variables, classes and functions defined in a module are all exported without needing a keyword or a special statement. The name of the file is the name of the module with `.cor` suffix.

Cor modules system is `CommonJS` compliant, so is possible to use Cor modules or import javascript from `node.js` or any other platform that implements `CommonJS` specifications.

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
This module exports `PI` variable, `circleArea` function and `Circle` class.

Once a module is required to be used, it initializes by executing(if exists) a function named `init`. Modules initializes the first time is required.

Example:
```
http = nil

func init() {
    http = @HttpServer
}

```
Once this module is initialized, `http` variable will have an instance of `HttpServer` class.

There are three types of modules.
1. **Main Module:** Is the module which has the same name as its package with `.cor` suffix.
2. **Exposed Module:** Are modules that the first letter of its name is uppercased and it can be accessed from any other module outside or inside of it's package, but just can be used the construction (variable, class or function) which has the name equal to the module name. It is an attempt to be compliant with coding standards which enforces to have a class per file.
3. **Inner Module:** Is a module which can be only used in other modules inside the same package. It is a inner module if it is not a main module and is not exposed.

*Note: A module may only contain variable declarations, functions, classes, and `use` statements.*

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


## Use statement

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
        store = @ClientStore
        store.findAll().then(func(){
            //...
        })
    }
}
```


## Strings

A string is a series of characters delimited by `'` symbol, can be defined as following:
```
aaron  = 'Aaron Swartz'
walter = 'Walter O\'Brian'

```
Or in multiple lines
```
query = '
    SELECT
        *
    FROM Article
    WHERE slug = ?
'
```


## Numbers

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


## Operators
Operators are separated in 6 groups:

1 - Assignment Operators
```
*=  /=  %=  +=  -=  <<=  >>=  >>>=  &=  ^=  |=
```

2 - Comparison Operators
```
<=  >=  ==  !=  <   >
```

3 - Arithmetic Operators
```
++  --  +   -
```

4 - Binary Bitwise Operators
```
&   |   ^
```

5 - Binary Logical Operators
```
&&  ||  !
```

6 - Binary Shift Operators
```
<<  >>  >>>
```

## Arrays

An array is a collection of ordered values. It may be defined using literal constructor with expressions as elements. Example:
```
empty = []

colors = ['red', 'green', 'blue']

foo = [bar(), 56, 'baz']

```

Arrays are zero based, which means the first stored element is located in `0` position. Values may be accessed using syntax similar to the following:
```
color1 = colors[0]
color2 = colors[1]

// color1 is 'red'
// color2 is 'green'
```

## Slices

Slice expression construct an array from an existing array.
```
colors = ['red', 'green', 'blue']

slice = colors[1:2]

// slice is ['green', 'blue']

slice = colors[:1]

// slice is  ['red', 'green']

slice = colors[1:]

// slice is ['green', 'blue']
```

## Type Assertions

Type assertions checks if a value is an instance of a class. Having the following syntax:
```
value.(Class)
```
The result of type assertion evaluation is `Class` if true else is nil. If `Class` is empty the results is the class which that value is instance of.
```
obj = @Object

cls = obj.()

// cls == Object
```

Example to show type assertion usage:
```
switch obj.() {
    case Object : alert('is object')
    case Array  : alert('is array')
    default     : alert('no object ain\'t array')
}
```

## For-In Loops

A for-In loop provides the easiest way to iterate collections. There are two syntaxes; the second one is a slight extension of the first.

The first syntax gives access to the current value in each iteration.
```
store = [1, 2, 3]
sum   = 0

for value in store {
    sum = sum + value
}

// sum is 6
```

The second way is similar but exposes the current index and value in each iteration.
```
str = ''

for index, value in store {
    str += 'Index: ' + index + '; Value:' + value + '</br>'
}
```

Can be used to iterate over object properties
```
obj = @[name: 'John', age: 30]

for index, value in obj {
    str += index + ':' + value + '</br>'
}
```
**Notice:** it does not iterates through the object prototype.


## For Loops

For loops are more complex than For-In loops. It is similar to C For statement, but with higher flexibility. It has two syntaxes, the first is:
```
for start_expression; continuation_expression; statement_expression {
    statements
}
```
`start_expression` is evaluated once when the loop begins. It can contain many expressions separated by `,`.

`continuation_expression` is evaluated in the beginning of each iteration, if the result of such evaluation is `true`, loop continues and `statements` are executed. The loop ends if the result of `continuation_expression` evaluation is `false`.

`statement_expression` is executed in the end of each iteration.

Example:
```
fruits = ['orange', 'apple', 'pear']

for i = 0, len = fruits.length; i < len; i++ {
    console.log(fruits[i])
}
```

Each one of these expressions can be empty.
```
// infinite loop
for ;; {

}

// whith only continuation_expression
for ; i == len; i ++ {

}
```

The second syntax is more compact than previous, it may replace `while` statements founded in many programming languages. The syntax is:
```
for condition {
    statements
}
```
`condition` is evaluated at the beginning of each iteration. If the result of such evaluation is `true` the loop continues and `statements` are executed. The loop will end otherwise.

Example:
```
// example 1
i = 0
for i < 10 {
    i++
}

// example 2
for cm = comments.next() {
    cm.show()
}
```

`condition` can be empty

Example:
```
for {
    // infinite loop
}
```


## Loop Control statements

Sometimes when loops are running may needs to jump to the next iteration or to get out of the current curl. Cor provides two well-known keywords to cover these use cases, these are `break` and `continue`. `break` keyword terminates the current loop and `continue` keyword jumps to the next iteration. It can be used in both, For and For-In loops.

`break` example:
```
i = 0
for {
    if i == 10 {
        break
    }
    i++
}
```
Stops the loop once `i` is equal to `10`

`continue` example:
```
array = [4, 3, 'Cor', 'PHP', 5, 'Go', 1, 7, 'Python']
langs = []

for item = array.shift() {
    if item.(Number) {
        continue
    }
    langs.push(item)
}
```
if `item` is a `Number` then jumps to the next iteration

## If Conditionals

`if` statement is one of the most important features in many languages including Cor. It allows the execution of conditional code fragments. The syntax is the following:
```
if conditional_expression {
    statemets
}
```

`conditional_expression` is evaluated and converted to its boolean value, if that value is `true` Cor executes `statements`, if `false` `statements` will be ignored.

```
// executes statements
if a < b {
    somethingWillBeDone()
}

```

Often needs to execute sentences if case of certain condition is `true` and execute different sentences in case of such condition be `false`

```
if a {
    // a is true
} else {
    // a is not true
}
```

`if` statement can be attached after `else` keyword to achieve more complex conditional execution. That will be executed in case of the previous `if` is not `true`
```
if b {

} else if c {

} else if d {

}
```


## Switch Conditionals

Switch statement is similar to a series of `if` statements in the same expression. In many occasions you may want to compare the same expression with many different values, and execute a different piece of code depending on which value it equals to.
```
// expressed with Switch statement
switch good {
    case 'House' : fee = 50
    case 'Boat'  : fee = 20
    case 'Car'   : fee = 10
}

// expressed with If statement
if (good == 'House') {
    fee = 50
} else if (good == 'Boat') {
    fee = 20
} else if (good == 'Car') {
    fee = 10
}
```
`case` keyword is used to define possible matches which the expression will be compared to. The `switch` statement is executed line by line, when a matching `case` is found Cor begins to execute the statements. A special case is `default` keyword, which will match any expression that was not matched before.

```
switch good {
    case 'House' : fee = 50
    case 'Boat'  : fee = 20
    case 'Car'   : fee = 10
    default      :
        fee = 0
        console.log('The citizen has no House, Boat or Car')
}

```


## Exceptions (*Experimental)

Cor has an exception model similar to that javascript. To allow the reusing of javascript libraries is one of the Cor principles due to that javascript is part of the web. So, `try/catch/finally` does not differ from javascript exception model. Syntax similar to the following may be used:
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


## Inc-Dec statement

Inc-Dec statement increments or decrements an expression. Similar features are found in many languages but these offers it as an expression, in Cor it is a statement.

Example:
```
// will cause a parsing error
// because it is used as an expression
b = a++
```
The grammar enforces to be used as a statement.

Example:
```
// correct usage
func init() {
    a = 0
    a++
    a--
}
```
