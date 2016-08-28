# Cor

![badge](https://circleci.com/gh/yosbelms/cor/tree/master.png?circle-token=687381b892447ef211dc27dd08a9752b9ec450af)

**Straightforward language for the Web**

Cor is an opensource language that compiles to regular JavaScript. It is designed to make easy to write simple, fast and maintainable software for the Web.

Cor is a new language that compiles line-to-line into the equivalent JavaScript. The resulting code runs at equal speed to handwritten JS. You can use any existing JavaScript library in Cor and vice-versa.


## Installation

Install globally from npm:
```
npm install -g cor-lang
```

Leave off the `-g` if you don't wish to install globally:
```
npm install cor-lang
```

Also you can install it with Bower:
```
bower install cor-lang
```

## Get Started

Execute a script:
```
cor run /path/to/source.cor
```

Compile a script:
```
cor compile /path/to/source.cor
```

## Build from sources

Clone from GitHub

```
git clone https://github.com/yosbelms/cor.git
```

On *NIX platforms:

```
cd cor
./make
```

On Windows:

```
cd cor
.\make
```

`make` will run all development tasks including tests.

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

## Support

* For documentation, and usage, see: http://yosbelms.github.io/cor
* To suggest a feature or report a bug: http://github.com/yosbelms/cor/issues

Copyright 2015-2016 (c) Yosbel Marin. This software is licensed under the BSD License.